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
  type ConflictEvaluator,
} from '@/features/assignments/utils/conflict-detection'
import { useAuthStore } from '@/shared/stores/auth'
import { generateDemoCalendarAssignments } from '@/shared/stores/demo-generators'

// Re-export types for convenience
export type { ConflictMap, AssignmentConflict, ConflictEvaluator }

/** Default conflict threshold in minutes */
const DEFAULT_CONFLICT_THRESHOLD_MINUTES = 60

/** Stale time configuration for calendar conflicts (background data) */
const STALE_TIME_MINUTES = 5
const MS_PER_MINUTE = 60000
const CALENDAR_CONFLICTS_STALE_TIME_MS = STALE_TIME_MINUTES * MS_PER_MINUTE

// Stable empty map for consistent references
const EMPTY_CONFLICT_MAP: ConflictMap = new Map()

/**
 * Default conflict evaluator based on time gap.
 * Returns true if assignments are less than threshold minutes apart.
 */
export function createTimeGapEvaluator(thresholdMinutes: number): ConflictEvaluator {
  return (a: CalendarAssignment, b: CalendarAssignment) => {
    const aStart = new Date(a.startTime).getTime()
    const aEnd = new Date(a.endTime).getTime()
    const bStart = new Date(b.startTime).getTime()
    const bEnd = new Date(b.endTime).getTime()

    const msPerMinute = 60000
    const thresholdMs = thresholdMinutes * msPerMinute

    // Gap from a end to b start
    const gapAToB = bStart - aEnd
    // Gap from b end to a start
    const gapBToA = aStart - bEnd

    // Effective gap is the maximum of these (handles ordering)
    const effectiveGap = Math.max(gapAToB, gapBToA)

    return effectiveGap < thresholdMs
  }
}

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
  /** Whether the calendar code is available (or using demo mode) */
  hasCalendarCode: boolean
}

/**
 * Options for the useCalendarConflicts hook.
 */
export interface UseCalendarConflictsOptions {
  /** Minimum gap required between assignments in minutes (default: 60) */
  thresholdMinutes?: number
  /**
   * Custom evaluator function to determine if two assignments conflict.
   * When provided, overrides the default time-based evaluation.
   * Can be used for location-based conflict detection or other custom logic.
   */
  evaluator?: ConflictEvaluator
}

/**
 * Hook that fetches calendar assignments and detects conflicts.
 *
 * This hook uses the calendar code stored in the auth store. The code
 * can be set during login (from the dashboard HTML) or manually.
 *
 * In demo mode, this uses mock calendar data with intentional conflicts.
 * In calendar mode, this uses the same calendar code as the main app.
 * In API mode, this fetches the calendar in the background to detect
 * conflicts with assignments from other associations.
 *
 * @param options - Configuration options including threshold and custom evaluator
 * @returns Conflict detection result with map and loading state
 *
 * @example
 * ```tsx
 * // Basic usage with default threshold
 * function AssignmentCard({ assignment }) {
 *   const { conflicts } = useCalendarConflicts();
 *   const assignmentConflicts = conflicts.get(assignment.gameId);
 *   // ...
 * }
 *
 * // With custom evaluator (e.g., location-based)
 * function AssignmentsPage() {
 *   const myEvaluator = (a, b) => {
 *     const timeConflict = createTimeGapEvaluator(60)(a, b);
 *     const sameLocation = a.hallId === b.hallId;
 *     return timeConflict && !sameLocation; // Only conflict if different venues
 *   };
 *   const { conflicts } = useCalendarConflicts({ evaluator: myEvaluator });
 *   // ...
 * }
 * ```
 */
export function useCalendarConflicts(
  options: UseCalendarConflictsOptions | number = {}
): CalendarConflictsResult {
  // Support legacy signature: useCalendarConflicts(60)
  const resolvedOptions: UseCalendarConflictsOptions =
    typeof options === 'number' ? { thresholdMinutes: options } : options

  const { thresholdMinutes = DEFAULT_CONFLICT_THRESHOLD_MINUTES, evaluator } = resolvedOptions

  const calendarCode = useAuthStore((state) => state.calendarCode)
  const isAuthenticated = useAuthStore((state) => state.status === 'authenticated')
  const isDemoMode = useAuthStore((state) => state.dataSource === 'demo')

  const query: UseQueryResult<CalendarAssignment[], Error> = useQuery({
    queryKey: isDemoMode
      ? queryKeys.calendar.assignmentsByCode('demo')
      : queryKeys.calendar.assignmentsByCode(calendarCode ?? ''),
    queryFn: ({ signal }) => {
      // In demo mode, return mock calendar data with conflicts
      if (isDemoMode) {
        return Promise.resolve(generateDemoCalendarAssignments() as CalendarAssignment[])
      }

      if (!calendarCode) {
        return Promise.resolve([])
      }
      return fetchCalendarAssignments(calendarCode, signal)
    },
    // Enable for demo mode OR when authenticated with calendar code
    enabled: isDemoMode || (isAuthenticated && !!calendarCode),
    staleTime: CALENDAR_CONFLICTS_STALE_TIME_MS,
    // Use empty array as placeholder
    placeholderData: [],
  })

  // Memoize conflict detection to avoid recalculating on every render
  const conflicts = useMemo(() => {
    if (!query.data || query.data.length === 0) {
      return EMPTY_CONFLICT_MAP
    }
    return detectConflicts(query.data, thresholdMinutes, evaluator)
  }, [query.data, thresholdMinutes, evaluator])

  return {
    conflicts,
    assignments: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    hasCalendarCode: isDemoMode || !!calendarCode,
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
