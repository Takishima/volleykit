/**
 * Hook for detecting assignment conflicts using calendar data.
 *
 * This hook fetches all assignments from the iCal calendar feed and
 * detects conflicts - assignments that are scheduled too close together
 * (less than 1 hour apart by default).
 *
 * The calendar is particularly useful for conflict detection because:
 * - It contains ALL assignments across ALL associations
 * - The API only returns assignments for the currently active association
 * - By using the calendar, we can detect cross-association conflicts
 */

import { useMemo } from 'react'

import { useQuery, type UseQueryResult } from '@tanstack/react-query'

import { queryKeys } from '@/api/queryKeys'
import { fetchCalendarAssignments } from '@/features/assignments/api/calendar-api'
import type { CalendarAssignment } from '@/features/assignments/api/ical/types'
import {
  detectConflicts,
  type ConflictMap,
  type AssignmentConflict,
} from '@/features/assignments/utils/conflict-detection'
import { useAuthStore } from '@/shared/stores/auth'

// Re-export types for convenience
export type { ConflictMap, AssignmentConflict }

/** Default conflict threshold in minutes */
const DEFAULT_CONFLICT_THRESHOLD_MINUTES = 60

/** Stale time for calendar conflicts - 5 minutes (background data) */
// eslint-disable-next-line @typescript-eslint/no-magic-numbers
const CALENDAR_CONFLICTS_STALE_TIME_MS = 5 * 60 * 1000

// Stable empty map for consistent references
const EMPTY_CONFLICT_MAP: ConflictMap = new Map()

/**
 * Result of the calendar conflicts query.
 */
export interface CalendarConflictsResult {
  /** Map of assignment ID to its conflicts */
  conflicts: ConflictMap
  /** All calendar assignments (raw data) */
  assignments: CalendarAssignment[]
  /** Whether the query is loading */
  isLoading: boolean
  /** Whether the query has an error */
  isError: boolean
  /** Error object if query failed */
  error: Error | null
  /** Whether the calendar code is available */
  hasCalendarCode: boolean
}

/**
 * Hook that fetches calendar assignments and detects conflicts.
 *
 * This hook uses the calendar code stored in the auth store. The code
 * can be set during login (from the dashboard HTML) or manually.
 *
 * In calendar mode, this uses the same calendar code as the main app.
 * In API mode, this fetches the calendar in the background to detect
 * conflicts with assignments from other associations.
 *
 * @param thresholdMinutes - Minimum gap required between assignments (default: 60)
 * @returns Conflict detection result with map and loading state
 *
 * @example
 * ```tsx
 * function AssignmentCard({ assignment }) {
 *   const { conflicts, isLoading } = useCalendarConflicts();
 *   const assignmentConflicts = conflicts.get(assignment.gameId);
 *
 *   if (assignmentConflicts?.length) {
 *     return <WarningBadge conflicts={assignmentConflicts} />;
 *   }
 * }
 * ```
 */
export function useCalendarConflicts(
  thresholdMinutes = DEFAULT_CONFLICT_THRESHOLD_MINUTES
): CalendarConflictsResult {
  const calendarCode = useAuthStore((state) => state.calendarCode)
  const isAuthenticated = useAuthStore((state) => state.status === 'authenticated')

  const query: UseQueryResult<CalendarAssignment[], Error> = useQuery({
    queryKey: queryKeys.calendar.assignmentsByCode(calendarCode ?? ''),
    queryFn: ({ signal }) => {
      if (!calendarCode) {
        return Promise.resolve([])
      }
      return fetchCalendarAssignments(calendarCode, signal)
    },
    // Only fetch when authenticated and have a calendar code
    enabled: isAuthenticated && !!calendarCode,
    staleTime: CALENDAR_CONFLICTS_STALE_TIME_MS,
    // Use empty array as placeholder
    placeholderData: [],
  })

  // Memoize conflict detection to avoid recalculating on every render
  const conflicts = useMemo(() => {
    if (!query.data || query.data.length === 0) {
      return EMPTY_CONFLICT_MAP
    }
    return detectConflicts(query.data, thresholdMinutes)
  }, [query.data, thresholdMinutes])

  return {
    conflicts,
    assignments: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    hasCalendarCode: !!calendarCode,
  }
}

/**
 * Gets conflicts for a specific assignment.
 *
 * Helper hook that uses useCalendarConflicts internally and filters
 * to just the conflicts for a single assignment.
 *
 * @param assignmentId - The assignment ID (game ID) to check
 * @returns Array of conflicts for this assignment, or empty array
 */
export function useAssignmentConflicts(assignmentId: string | undefined): {
  conflicts: AssignmentConflict[]
  isLoading: boolean
  hasCalendarCode: boolean
} {
  const { conflicts: conflictMap, isLoading, hasCalendarCode } = useCalendarConflicts()

  const conflicts = useMemo(() => {
    if (!assignmentId) return []
    return conflictMap.get(assignmentId) ?? []
  }, [conflictMap, assignmentId])

  return { conflicts, isLoading, hasCalendarCode }
}
