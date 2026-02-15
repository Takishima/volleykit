import { useMemo } from 'react'

import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { addDays, startOfDay, endOfDay, subDays, isWithinInterval } from 'date-fns'

import { getApiClient, type SearchConfiguration, type Assignment } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import { useAssociationSettings, useActiveSeason } from '@/features/settings/hooks/useSettings'
import {
  DEFAULT_PAGE_SIZE,
  DEFAULT_DATE_RANGE_DAYS,
  THIS_WEEK_DAYS,
  NEXT_MONTH_DAYS,
  VALIDATION_CLOSED_STALE_TIME_MS,
  ASSIGNMENTS_STALE_TIME_MS,
  fetchAllAssignmentPages,
  parseDateOrFallback,
  sortByGameDate,
  createDemoQueryResult,
  getGameTimestamp,
} from '@/shared/hooks/usePaginatedQuery'
import { useAuthStore } from '@/shared/stores/auth'
import { useDemoStore } from '@/shared/stores/demo'
import type { ValidatedGameData } from '@/shared/stores/demo/types'

import { isValidationClosed, DEFAULT_VALIDATION_DEADLINE_HOURS } from '../utils/assignment-helpers'

/** Stale time for assignment details - longer since details rarely change */
const ASSIGNMENT_DETAILS_STALE_TIME_MS = ASSIGNMENTS_STALE_TIME_MS * 2

// Re-export calendar assignments hook for calendar mode
export { useCalendarAssignments } from './useCalendarAssignments'
export type { CalendarAssignment } from './useCalendarAssignments'

// Stable empty array for React Query selectors to prevent unnecessary re-renders.
// Using `|| []` creates a new array reference on each render, while this constant
// provides referential stability when data.items is nullish.
const EMPTY_ASSIGNMENTS: Assignment[] = []

// Date period presets
export type DatePeriod = 'upcoming' | 'past' | 'thisWeek' | 'nextMonth' | 'custom'

export function getDateRangeForPeriod(
  period: DatePeriod,
  customRange?: { from: Date; to: Date }
): { from: string; to: string } {
  const now = new Date()

  switch (period) {
    case 'upcoming':
      return {
        from: startOfDay(now).toISOString(),
        to: endOfDay(addDays(now, DEFAULT_DATE_RANGE_DAYS)).toISOString(),
      }
    case 'past':
      return {
        from: startOfDay(subDays(now, DEFAULT_DATE_RANGE_DAYS)).toISOString(),
        to: endOfDay(subDays(now, 1)).toISOString(),
      }
    case 'thisWeek':
      return {
        from: startOfDay(now).toISOString(),
        to: endOfDay(addDays(now, THIS_WEEK_DAYS)).toISOString(),
      }
    case 'nextMonth':
      return {
        from: startOfDay(now).toISOString(),
        to: endOfDay(addDays(now, NEXT_MONTH_DAYS)).toISOString(),
      }
    case 'custom':
      if (customRange) {
        return {
          from: startOfDay(customRange.from).toISOString(),
          to: endOfDay(customRange.to).toISOString(),
        }
      }
      return getDateRangeForPeriod('upcoming')
  }
}

/**
 * Helper to filter assignments by validation closed status.
 * Shared between demo mode and production code to avoid duplication.
 */
function filterByValidationClosed(items: Assignment[], deadlineHours: number): Assignment[] {
  return items.filter((assignment) =>
    isValidationClosed(assignment.refereeGame?.game?.startingDateTime, deadlineHours)
  )
}

/**
 * Enrich demo assignments with scoresheet.closedAt from validated games.
 * In demo mode, the raw store assignments don't include validation status;
 * this mirrors the enrichment done by mockApi.searchAssignments.
 */
function enrichWithValidationData(
  items: Assignment[],
  validatedGames: Record<string, ValidatedGameData>
): Assignment[] {
  return items.map((assignment) => {
    const gameId = assignment.refereeGame?.game?.__identity
    const validatedData = gameId ? validatedGames[gameId] : undefined

    if (validatedData && assignment.refereeGame?.game) {
      return {
        ...assignment,
        refereeGame: {
          ...assignment.refereeGame,
          game: {
            ...assignment.refereeGame.game,
            scoresheet: {
              closedAt: validatedData.validatedAt,
            },
          },
        },
      } as Assignment
    }
    return assignment
  })
}

/**
 * Hook to fetch assignments with date-based filtering.
 *
 * In demo mode, this hook bypasses React Query's cache and reads directly
 * from the demo store. This ensures assignments update immediately when
 * switching associations, without cache staleness issues.
 *
 * @param period - Date period preset for filtering
 * @param customRange - Custom date range when period is 'custom'
 */
export function useAssignments(
  period: DatePeriod = 'upcoming',
  customRange?: { from: Date; to: Date }
): UseQueryResult<Assignment[], Error> {
  const dataSource = useAuthStore((state) => state.dataSource)
  const isDemoMode = dataSource === 'demo'
  const activeOccupationId = useAuthStore((state) => state.activeOccupationId)
  const demoAssignments = useDemoStore((state) => state.assignments)
  const demoAssociationCode = useDemoStore((state) => state.activeAssociationCode)
  const validatedGames = useDemoStore((state) => state.validatedGames)
  const apiClient = getApiClient(dataSource)

  // Use appropriate key for cache invalidation when switching associations
  const associationKey = isDemoMode ? demoAssociationCode : activeOccupationId
  const dateRange = getDateRangeForPeriod(period, customRange)

  // Memoize date range values to prevent query key changes on every render.
  // getDateRangeForPeriod returns new objects each time, but the ISO strings
  // are stable within the same day due to startOfDay/endOfDay normalization.
  const { fromDate, toDate } = useMemo(() => {
    return {
      fromDate: dateRange.from,
      toDate: dateRange.to,
    }
  }, [dateRange.from, dateRange.to])

  const config = useMemo<SearchConfiguration>(
    () => ({
      offset: 0,
      limit: DEFAULT_PAGE_SIZE,
      propertyFilters: [
        {
          propertyName: 'refereeGame.game.startingDateTime',
          dateRange: { from: fromDate, to: toDate },
        },
      ],
      propertyOrderings: [
        {
          propertyName: 'refereeGame.game.startingDateTime',
          descending: period === 'past',
          isSetByUser: true,
        },
      ],
    }),
    [fromDate, toDate, period]
  )

  // Filter demo assignments client-side to match API behavior.
  // This bypasses React Query's cache to ensure immediate updates
  // when switching associations.
  // Also enriches with scoresheet.closedAt from validatedGames so the
  // validate button shows the correct color (gray for validated games).
  const demoFilteredData = useMemo(() => {
    if (!isDemoMode) return []

    const assignments = Array.isArray(demoAssignments) ? demoAssignments : []
    const from = new Date(fromDate)
    const to = new Date(toDate)

    const filtered = assignments.filter((assignment) => {
      const timestamp = getGameTimestamp(assignment)
      // Skip items with missing dates (timestamp would be 0 from epoch fallback)
      if (timestamp === 0) return false
      const gameDate = new Date(timestamp)
      return gameDate >= from && gameDate <= to
    })

    const sorted = sortByGameDate(filtered, period === 'past')
    return enrichWithValidationData(sorted, validatedGames)
  }, [isDemoMode, demoAssignments, fromDate, toDate, period, validatedGames])

  const query = useQuery({
    queryKey: queryKeys.assignments.list(config, associationKey),
    queryFn: () => apiClient.searchAssignments(config),
    select: (data) => data.items ?? EMPTY_ASSIGNMENTS,
    staleTime: ASSIGNMENTS_STALE_TIME_MS,
    // Disable query in demo mode - we read directly from the store
    enabled: !isDemoMode,
  })

  // In demo mode, return store data directly to bypass React Query cache
  if (isDemoMode) {
    return createDemoQueryResult(query, demoFilteredData)
  }

  return query
}

/**
 * Convenience hook for upcoming assignments.
 */
export function useUpcomingAssignments() {
  return useAssignments('upcoming')
}

/**
 * Convenience hook for past assignments.
 */
export function usePastAssignments() {
  return useAssignments('past')
}

/**
 * Hook to fetch assignments where validation period has closed.
 *
 * This fetches past games from the current season and filters them
 * to only include games where the validation deadline has passed.
 * The deadline is determined by the association settings field
 * `hoursAfterGameStartForRefereeToEditGameList`.
 *
 * Features:
 * - Fetches all pages to ensure no games are missed (up to MAX_FETCH_ALL_PAGES)
 * - Waits for settings and season data before querying to avoid stale results
 * - Falls back to defaults if settings/season queries fail
 * - Uses shared filtering logic between production and demo modes
 * - Supports cancellation via AbortController
 */
export function useValidationClosedAssignments(): UseQueryResult<Assignment[], Error> {
  const dataSource = useAuthStore((state) => state.dataSource)
  const isDemoMode = dataSource === 'demo'
  const activeOccupationId = useAuthStore((state) => state.activeOccupationId)
  const demoAssignments = useDemoStore((state) => state.assignments)
  const demoAssociationCode = useDemoStore((state) => state.activeAssociationCode)
  const validatedGames = useDemoStore((state) => state.validatedGames)

  // Use appropriate key for cache invalidation when switching associations
  const associationKey = isDemoMode ? demoAssociationCode : activeOccupationId

  // Fetch settings and season for filtering
  // Note: In demo mode, these queries are disabled (enabled: !isDemoMode),
  // so settings and season will be undefined, causing fallback to defaults:
  // - deadlineHours falls back to DEFAULT_VALIDATION_DEADLINE_HOURS (6 hours)
  // - seasonStart falls back to 365 days ago
  const {
    data: settings,
    isSuccess: settingsSuccess,
    isError: settingsError,
  } = useAssociationSettings()
  const { data: season, isSuccess: seasonSuccess, isError: seasonError } = useActiveSeason()

  // Memoize date calculations to prevent query key changes on every render.
  // Only recalculate when season data actually changes.
  const { fromDate, toDate } = useMemo(() => {
    const now = new Date()
    const seasonStart = parseDateOrFallback(
      season?.seasonStartDate,
      subDays(now, DEFAULT_DATE_RANGE_DAYS)
    )
    const seasonEnd = parseDateOrFallback(season?.seasonEndDate, now)

    return {
      fromDate: startOfDay(seasonStart).toISOString(),
      toDate: endOfDay(now < seasonEnd ? now : seasonEnd).toISOString(),
    }
  }, [season?.seasonStartDate, season?.seasonEndDate])

  const deadlineHours =
    settings?.hoursAfterGameStartForRefereeToEditGameList ?? DEFAULT_VALIDATION_DEADLINE_HOURS

  // Memoize config to prevent unnecessary object recreation
  const config = useMemo<SearchConfiguration>(
    () => ({
      propertyFilters: [
        {
          propertyName: 'refereeGame.game.startingDateTime',
          dateRange: { from: fromDate, to: toDate },
        },
      ],
      propertyOrderings: [
        {
          propertyName: 'refereeGame.game.startingDateTime',
          descending: true, // Most recent first
          isSetByUser: true,
        },
      ],
    }),
    [fromDate, toDate]
  )

  // Wait for settings and season to load before making the main query.
  // Use isSuccess for reliable state detection (avoids race conditions where
  // isLoading is false but data hasn't arrived yet).
  // If either query fails, proceed with defaults rather than blocking indefinitely.
  // Extra checks: verify we have actual data when queries succeed to prevent
  // race conditions where isSuccess is true but derived values use stale data.
  const settingsResolved = settingsSuccess || settingsError
  const seasonResolved = seasonSuccess || seasonError
  const hasSettingsData = settingsSuccess ? settings !== undefined : true
  const hasSeasonDates = seasonSuccess ? season?.seasonStartDate !== undefined : true
  const isReady =
    !isDemoMode && settingsResolved && seasonResolved && hasSettingsData && hasSeasonDates

  const query = useQuery({
    queryKey: queryKeys.assignments.validationClosed(
      fromDate,
      toDate,
      deadlineHours,
      associationKey
    ),
    queryFn: async ({ signal }) => {
      // Fetch all pages because API doesn't support server-side filtering
      // by validation status - we must filter client-side after fetching.
      const allItems = await fetchAllAssignmentPages(config, signal)
      // Filter by validation closed status
      return filterByValidationClosed(allItems, deadlineHours)
    },
    // Longer cache time because validation status changes infrequently
    // and fetching all pages is expensive (multiple API calls).
    staleTime: VALIDATION_CLOSED_STALE_TIME_MS,
    enabled: isReady,
  })

  // Memoize demo data filtering to prevent recalculation on every render.
  // Only recompute when demo assignments, date range, deadline, or validation state changes.
  // Also enriches with scoresheet.closedAt from validatedGames so the
  // validate button shows the correct color (gray for validated games).
  const demoFilteredData = useMemo(() => {
    if (!isDemoMode) return []

    // Defensive fallback: store initializes assignments as [], but during SSR/hydration
    // or in test environments, the store state may not be fully initialized yet.
    const assignments = Array.isArray(demoAssignments) ? demoAssignments : []
    const inDateRange = assignments.filter((assignment) => {
      const gameDate = assignment.refereeGame?.game?.startingDateTime
      if (!gameDate) return false

      const date = new Date(gameDate)
      return isWithinInterval(date, {
        start: new Date(fromDate),
        end: new Date(toDate),
      })
    })
    const filtered = filterByValidationClosed(inDateRange, deadlineHours)
    const sorted = sortByGameDate(filtered, true)
    return enrichWithValidationData(sorted, validatedGames)
  }, [isDemoMode, demoAssignments, fromDate, toDate, deadlineHours, validatedGames])

  if (isDemoMode) {
    return createDemoQueryResult(query, demoFilteredData)
  }

  return query
}

/**
 * Hook to fetch detailed assignment information.
 *
 * @param assignmentId - The assignment ID to fetch, or null to disable the query
 */
export function useAssignmentDetails(assignmentId: string | null) {
  const dataSource = useAuthStore((state) => state.dataSource)
  const apiClient = getApiClient(dataSource)

  return useQuery({
    queryKey: queryKeys.assignments.detail(assignmentId || ''),
    queryFn: () =>
      apiClient.getAssignmentDetails(assignmentId!, [
        'refereeGame.game.encounter.teamHome',
        'refereeGame.game.encounter.teamAway',
        'refereeGame.game.hall',
        'refereeGame.game.hall.primaryPostalAddress',
      ]),
    enabled: !!assignmentId,
    staleTime: ASSIGNMENT_DETAILS_STALE_TIME_MS,
  })
}
