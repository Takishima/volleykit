/**
 * Shared TanStack Query configuration for the public iCal calendar feed.
 *
 * Single source of truth for the feed's queryKey + queryFn so every
 * consumer (calendar mode assignments, conflict detection, cross-association
 * notices) observes the same cache entry with the same fetch behavior.
 * Call sites override `enabled` (and `staleTime` where they need their own).
 */

import { queryOptions } from '@tanstack/react-query'

import { queryKeys } from '@/api/queryKeys'
import { ASSIGNMENTS_STALE_TIME_MS } from '@/common/hooks/usePaginatedQuery'

import { fetchCalendarAssignments, type CalendarAssignment } from './calendar-api'

const EMPTY_ASSIGNMENTS: CalendarAssignment[] = []

export function calendarAssignmentsOptions(calendarCode: string | null) {
  return queryOptions({
    queryKey: queryKeys.calendar.assignmentsByCode(calendarCode ?? ''),
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      calendarCode
        ? fetchCalendarAssignments(calendarCode, signal)
        : Promise.resolve(EMPTY_ASSIGNMENTS),
    staleTime: ASSIGNMENTS_STALE_TIME_MS,
    placeholderData: EMPTY_ASSIGNMENTS,
  })
}
