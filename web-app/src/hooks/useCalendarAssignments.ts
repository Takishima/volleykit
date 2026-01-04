/**
 * Hook for fetching calendar assignments in Calendar Mode.
 *
 * This hook provides a TanStack Query-based interface for fetching
 * assignments from the iCal calendar feed when in calendar mode.
 */

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth";
import { queryKeys } from "@/api/queryKeys";
import { fetchCalendarAssignments, type CalendarAssignment } from "@/api/calendar-api";

// Stable empty array to prevent unnecessary re-renders
const EMPTY_ASSIGNMENTS: CalendarAssignment[] = [];

/**
 * Fetches assignments from the calendar iCal feed.
 *
 * This hook is only enabled when in calendar mode and a valid
 * calendar code is stored. The assignments are automatically
 * sorted by start time (upcoming first).
 *
 * @returns Query result with calendar assignments
 *
 * @example
 * ```tsx
 * function CalendarAssignmentsPage() {
 *   const { data: assignments, isLoading, error } = useCalendarAssignments();
 *
 *   if (isLoading) return <Loading />;
 *   if (error) return <Error message={error.message} />;
 *
 *   return (
 *     <ul>
 *       {assignments.map(a => (
 *         <li key={a.gameId}>{a.homeTeam} vs {a.awayTeam}</li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useCalendarAssignments(): UseQueryResult<CalendarAssignment[], Error> {
  const dataSource = useAuthStore((state) => state.dataSource);
  const calendarCode = useAuthStore((state) => state.calendarCode);
  const isCalendarMode = dataSource === "calendar";

  return useQuery({
    queryKey: queryKeys.calendar.assignmentsByCode(calendarCode ?? ""),
    queryFn: ({ signal }) => {
      if (!calendarCode) {
        return Promise.resolve(EMPTY_ASSIGNMENTS);
      }
      return fetchCalendarAssignments(calendarCode, signal);
    },
    // Only fetch when in calendar mode with a valid code
    enabled: isCalendarMode && !!calendarCode,
    // Cache for 5 minutes - calendar data updates infrequently
    staleTime: 5 * 60 * 1000,
    // Use empty array as placeholder to avoid undefined data
    placeholderData: EMPTY_ASSIGNMENTS,
  });
}

// Re-export types for convenience
export type { CalendarAssignment } from "@/api/calendar-api";
