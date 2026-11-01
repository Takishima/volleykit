/**
 * Hook for detecting assignment conflicts using calendar data.
 *
 * This hook fetches all assignments from the iCal calendar feed and
 * detects conflicts - assignments that are scheduled too close together
 * (less than 1 hour apart) at venues that are not within walking distance.
 *
 * The calendar is particularly useful for conflict detection because:
 * - It contains ALL assignments across ALL associations
 * - The API only returns assignments for the currently active association
 * - By using the calendar, we can detect cross-association conflicts
 */

import { useMemo } from 'react'

import { useQuery, type UseQueryResult } from '@tanstack/react-query'

import { queryKeys } from '@/api/queryKeys'
import { calendarAssignmentsOptions } from '@/common/services/calendar/calendar-queries'
import type { CalendarAssignment } from '@/common/services/calendar/ical/types'
import { useAuthStore } from '@/common/stores/auth'
import { generateDemoCalendarAssignments } from '@/common/stores/demo-generators'
import {
  detectConflicts,
  createSmartConflictEvaluator,
  DEFAULT_CONFLICT_THRESHOLD_MINUTES,
  type ConflictMap,
  type AssignmentConflict,
} from '@/features/assignments/utils/conflict-detection'

// Re-export types for convenience
export type { ConflictMap, AssignmentConflict }

/** Stale time configuration for calendar conflicts (background data) */
const STALE_TIME_MINUTES = 5
const MS_PER_MINUTE = 60000
const CALENDAR_CONFLICTS_STALE_TIME_MS = STALE_TIME_MINUTES * MS_PER_MINUTE

// Stable empty map for consistent references
const EMPTY_CONFLICT_MAP: ConflictMap = new Map()

/**
 * Module-level evaluator: considers both time gap AND venue distance with the
 * default thresholds. Built once so the conflict memo below stays stable.
 */
const SMART_CONFLICT_EVALUATOR = createSmartConflictEvaluator()

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
 * @returns Conflict detection result with map and loading state
 *
 * @example
 * ```tsx
 * function AssignmentCard({ assignment }) {
 *   const { conflicts } = useCalendarConflicts();
 *   const assignmentConflicts = conflicts.get(assignment.gameId);
 *   // ...
 * }
 * ```
 */
export function useCalendarConflicts(): CalendarConflictsResult {
  const calendarCode = useAuthStore((state) => state.calendarCode)
  const isAuthenticated = useAuthStore((state) => state.status === 'authenticated')
  const isDemoMode = useAuthStore((state) => state.dataSource === 'demo')

  const query: UseQueryResult<CalendarAssignment[], Error> = useQuery({
    // In demo mode, return mock calendar data with conflicts;
    // otherwise share the common calendar feed query config.
    ...(isDemoMode
      ? {
          queryKey: queryKeys.calendar.assignmentsByCode('demo'),
          queryFn: () => Promise.resolve(generateDemoCalendarAssignments() as CalendarAssignment[]),
        }
      : calendarAssignmentsOptions(calendarCode)),
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
    return detectConflicts(query.data, DEFAULT_CONFLICT_THRESHOLD_MINUTES, SMART_CONFLICT_EVALUATOR)
  }, [query.data])

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
} {
  const { conflicts: conflictMap } = useCalendarConflicts()

  const conflicts = useMemo(() => {
    if (!assignmentId) return []
    return conflictMap.get(assignmentId) ?? []
  }, [conflictMap, assignmentId])

  return { conflicts }
}
