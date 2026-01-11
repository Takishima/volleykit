import { startOfDay, endOfDay, addDays } from 'date-fns'

import { api, type SearchConfiguration } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import { getSeasonDateRange } from '@/shared/utils/date-helpers'
import { createLogger } from '@/shared/utils/logger'

import {
  DEFAULT_PAGE_SIZE,
  DEFAULT_DATE_RANGE_DAYS,
  ASSIGNMENTS_STALE_TIME_MS,
  COMPENSATIONS_STALE_TIME_MS,
  EXCHANGES_STALE_TIME_MS,
  SETTINGS_STALE_TIME_MS,
  SEASON_STALE_TIME_MS,
} from './usePaginatedQuery'

import type { QueryClient } from '@tanstack/react-query'

const log = createLogger('prefetchTabData')

/**
 * Prefetches data for all main tabs after an association switch.
 *
 * This improves UX by loading data for tabs the user hasn't visited yet,
 * so they don't see loading states when navigating between tabs.
 *
 * Prefetches:
 * - Upcoming assignments (Assignments tab)
 * - Compensations (Compensations tab)
 * - Game exchanges (Exchange tab)
 * - Association settings and active season (needed for validation-closed assignments)
 *
 * @param queryClient - TanStack Query client instance
 * @param newOccupationId - The new occupation ID after switching
 */
export async function prefetchAllTabData(
  queryClient: QueryClient,
  newOccupationId: string
): Promise<void> {
  const now = new Date()

  // Build configs matching what the hooks use
  const upcomingAssignmentsConfig: SearchConfiguration = {
    offset: 0,
    limit: DEFAULT_PAGE_SIZE,
    propertyFilters: [
      {
        propertyName: 'refereeGame.game.startingDateTime',
        dateRange: {
          from: startOfDay(now).toISOString(),
          to: endOfDay(addDays(now, DEFAULT_DATE_RANGE_DAYS)).toISOString(),
        },
      },
    ],
    propertyOrderings: [
      {
        propertyName: 'refereeGame.game.startingDateTime',
        descending: false,
        isSetByUser: true,
      },
    ],
  }

  const compensationsConfig: SearchConfiguration = {
    offset: 0,
    limit: DEFAULT_PAGE_SIZE,
    propertyFilters: [],
    propertyOrderings: [
      {
        propertyName: 'refereeGame.game.startingDateTime',
        descending: true,
        isSetByUser: true,
      },
    ],
  }

  const { to: seasonEnd } = getSeasonDateRange()
  const exchangesConfig: SearchConfiguration = {
    offset: 0,
    limit: DEFAULT_PAGE_SIZE,
    propertyFilters: [
      {
        propertyName: 'refereeGame.game.startingDateTime',
        dateRange: {
          from: startOfDay(now).toISOString(),
          to: endOfDay(seasonEnd).toISOString(),
        },
      },
    ],
    propertyOrderings: [
      {
        propertyName: 'refereeGame.game.startingDateTime',
        descending: false,
        isSetByUser: true,
      },
    ],
  }

  log.debug('Prefetching all tab data for occupation:', newOccupationId)

  // Prefetch all in parallel - failures are logged but don't block other prefetches
  const prefetchPromises = [
    // Assignments tab - upcoming assignments
    queryClient
      .prefetchQuery({
        queryKey: queryKeys.assignments.list(upcomingAssignmentsConfig, newOccupationId),
        queryFn: () => api.searchAssignments(upcomingAssignmentsConfig),
        staleTime: ASSIGNMENTS_STALE_TIME_MS,
      })
      .catch((err) => log.warn('Failed to prefetch assignments:', err)),

    // Compensations tab
    queryClient
      .prefetchQuery({
        queryKey: queryKeys.compensations.list(compensationsConfig, newOccupationId),
        queryFn: () => api.searchCompensations(compensationsConfig),
        staleTime: COMPENSATIONS_STALE_TIME_MS,
      })
      .catch((err) => log.warn('Failed to prefetch compensations:', err)),

    // Exchange tab
    queryClient
      .prefetchQuery({
        queryKey: queryKeys.exchanges.list(exchangesConfig, newOccupationId),
        queryFn: () => api.searchExchanges(exchangesConfig),
        staleTime: EXCHANGES_STALE_TIME_MS,
      })
      .catch((err) => log.warn('Failed to prefetch exchanges:', err)),

    // Settings - needed for validation-closed assignments
    queryClient
      .prefetchQuery({
        queryKey: queryKeys.settings.association(newOccupationId),
        queryFn: () => api.getAssociationSettings(),
        staleTime: SETTINGS_STALE_TIME_MS,
      })
      .catch((err) => log.warn('Failed to prefetch settings:', err)),

    // Active season - needed for validation-closed assignments
    queryClient
      .prefetchQuery({
        queryKey: queryKeys.seasons.active(newOccupationId),
        queryFn: () => api.getActiveSeason(),
        staleTime: SEASON_STALE_TIME_MS,
      })
      .catch((err) => log.warn('Failed to prefetch season:', err)),
  ]

  await Promise.all(prefetchPromises)
  log.debug('Tab data prefetch complete')
}
