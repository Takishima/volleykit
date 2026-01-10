/**
 * Hook to manage the PWA app badge showing today's game count.
 *
 * Updates the badge whenever assignments are fetched, showing the number
 * of active games scheduled for today.
 *
 * Future: This hook's logic can be extracted for use in a service worker
 * with push notifications to update badges when the app is closed.
 */

import { useCallback, useEffect, useMemo, useRef } from "react";
import { isToday } from "date-fns";
import { badgeService } from "@/shared/services/badge";
import type { Assignment } from "@/api/client";

/**
 * Count the number of active games scheduled for today
 */
export function countTodaysGames(assignments: Assignment[]): number {
  return assignments.filter((assignment) => {
    // Only count active assignments (not cancelled or archived)
    if (assignment.refereeConvocationStatus !== "active") {
      return false;
    }

    const gameDateTime = assignment.refereeGame?.game?.startingDateTime;
    if (!gameDateTime) {
      return false;
    }

    try {
      const gameDate = new Date(gameDateTime);
      return isToday(gameDate);
    } catch {
      return false;
    }
  }).length;
}

export interface UseDailyGameBadgeOptions {
  /** Whether badge updates are enabled (default: true) */
  enabled?: boolean;
}

export interface UseDailyGameBadgeResult {
  /** Number of games scheduled for today */
  todaysGameCount: number;
  /** Whether the Badging API is supported */
  isSupported: boolean;
  /** Manually update the badge */
  updateBadge: () => Promise<void>;
  /** Clear the badge */
  clearBadge: () => Promise<void>;
}

/**
 * Hook to display today's game count on the PWA app badge.
 *
 * @param assignments - Array of assignments to count from
 * @param options - Configuration options
 * @returns Badge state and control methods
 *
 * @example
 * ```tsx
 * function AssignmentsPage() {
 *   const { data: assignments = [] } = useUpcomingAssignments();
 *   const { todaysGameCount, isSupported } = useDailyGameBadge(assignments);
 *
 *   return (
 *     <div>
 *       {isSupported && todaysGameCount > 0 && (
 *         <span>Badge shows: {todaysGameCount}</span>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useDailyGameBadge(
  assignments: Assignment[],
  options: UseDailyGameBadgeOptions = {},
): UseDailyGameBadgeResult {
  const { enabled = true } = options;

  // Memoize the count to avoid recalculating on every render
  const todaysGameCount = useMemo(
    () => countTodaysGames(assignments),
    [assignments],
  );

  // Track if we've already set this count to avoid duplicate API calls
  const lastSetCountRef = useRef<number | null>(null);

  const isSupported = badgeService.isSupported();

  // Update badge when count changes
  useEffect(() => {
    if (!enabled || !isSupported) {
      return;
    }

    // Skip if count hasn't changed
    if (lastSetCountRef.current === todaysGameCount) {
      return;
    }

    const updateBadge = async () => {
      const result = await badgeService.setBadge(todaysGameCount);
      if (result.success) {
        lastSetCountRef.current = todaysGameCount;
      }
    };

    void updateBadge();
  }, [todaysGameCount, enabled, isSupported]);

  const updateBadge = useCallback(async () => {
    await badgeService.setBadge(todaysGameCount);
    lastSetCountRef.current = todaysGameCount;
  }, [todaysGameCount]);

  const clearBadge = useCallback(async () => {
    await badgeService.clearBadge();
    lastSetCountRef.current = 0;
  }, []);

  return {
    todaysGameCount,
    isSupported,
    updateBadge,
    clearBadge,
  };
}
