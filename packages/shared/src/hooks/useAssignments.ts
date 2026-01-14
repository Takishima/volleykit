/**
 * useAssignments hook - Fetches assignment data with date-based filtering.
 *
 * Platform-agnostic implementation that works with any API client.
 * The API client must be provided via the options or context.
 *
 * Extracted from web-app/src/features/assignments/hooks/useAssignments.ts
 */

import { useMemo } from 'react';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { addDays, startOfDay, endOfDay, subDays } from 'date-fns';

import { queryKeys, type SearchConfiguration } from '../api/queryKeys';
import type { Assignment } from '../api/validation';

/** Default page size for API requests */
export const DEFAULT_PAGE_SIZE = 50;

/** Default date range in days for fetching assignments */
export const DEFAULT_DATE_RANGE_DAYS = 365;

/** Days for "this week" period */
export const THIS_WEEK_DAYS = 7;

/** Days for "next month" period */
export const NEXT_MONTH_DAYS = 30;

/** Stale time for assignments list (5 minutes) */
export const ASSIGNMENTS_STALE_TIME_MS = 5 * 60 * 1000;

/** Stale time for assignment details (10 minutes - less frequent updates) */
export const ASSIGNMENT_DETAILS_STALE_TIME_MS = 10 * 60 * 1000;

/** Date period presets for assignment filtering */
export type DatePeriod = 'upcoming' | 'past' | 'thisWeek' | 'nextMonth' | 'custom';

/**
 * API client interface for fetching assignments.
 * Implementations differ between web (fetch) and mobile (fetch + native adapters).
 */
export interface AssignmentsApiClient {
  searchAssignments: (
    config: SearchConfiguration
  ) => Promise<{ items: Assignment[]; totalItemsCount: number }>;
  getAssignmentDetails?: (
    id: string,
    expand?: string[]
  ) => Promise<Assignment>;
}

/**
 * Get date range for a given period preset.
 */
export function getDateRangeForPeriod(
  period: DatePeriod,
  customRange?: { from: Date; to: Date }
): { from: string; to: string } {
  const now = new Date();

  switch (period) {
    case 'upcoming':
      return {
        from: startOfDay(now).toISOString(),
        to: endOfDay(addDays(now, DEFAULT_DATE_RANGE_DAYS)).toISOString(),
      };
    case 'past':
      return {
        from: startOfDay(subDays(now, DEFAULT_DATE_RANGE_DAYS)).toISOString(),
        to: endOfDay(subDays(now, 1)).toISOString(),
      };
    case 'thisWeek':
      return {
        from: startOfDay(now).toISOString(),
        to: endOfDay(addDays(now, THIS_WEEK_DAYS)).toISOString(),
      };
    case 'nextMonth':
      return {
        from: startOfDay(now).toISOString(),
        to: endOfDay(addDays(now, NEXT_MONTH_DAYS)).toISOString(),
      };
    case 'custom':
      if (customRange) {
        return {
          from: startOfDay(customRange.from).toISOString(),
          to: endOfDay(customRange.to).toISOString(),
        };
      }
      return getDateRangeForPeriod('upcoming');
  }
}

/**
 * Sort assignments by game date.
 */
export function sortByGameDate<T extends { refereeGame?: { game?: { startingDateTime?: string | null } } }>(
  items: T[],
  descending = false
): T[] {
  return [...items].sort((a, b) => {
    const dateA = a.refereeGame?.game?.startingDateTime;
    const dateB = b.refereeGame?.game?.startingDateTime;

    if (!dateA && !dateB) return 0;
    if (!dateA) return descending ? -1 : 1;
    if (!dateB) return descending ? 1 : -1;

    const timeA = new Date(dateA).getTime();
    const timeB = new Date(dateB).getTime();

    return descending ? timeB - timeA : timeA - timeB;
  });
}

/**
 * Get timestamp from assignment for filtering.
 */
export function getGameTimestamp(assignment: { refereeGame?: { game?: { startingDateTime?: string | null } } }): number {
  const dateStr = assignment.refereeGame?.game?.startingDateTime;
  if (!dateStr) return 0;
  return new Date(dateStr).getTime();
}

/** Stable empty array for React Query selectors */
const EMPTY_ASSIGNMENTS: Assignment[] = [];

export interface UseAssignmentsOptions {
  /** API client for fetching assignments */
  apiClient: AssignmentsApiClient;
  /** Date period preset for filtering */
  period?: DatePeriod;
  /** Custom date range when period is 'custom' */
  customRange?: { from: Date; to: Date };
  /** Association key for cache invalidation */
  associationKey?: string | null;
  /** Whether to enable the query */
  enabled?: boolean;
}

/**
 * Hook to fetch assignments with date-based filtering.
 *
 * @param options - Configuration options including API client
 * @returns Query result with assignments array
 */
export function useAssignments(
  options: UseAssignmentsOptions
): UseQueryResult<Assignment[], Error> {
  const {
    apiClient,
    period = 'upcoming',
    customRange,
    associationKey,
    enabled = true,
  } = options;

  const dateRange = getDateRangeForPeriod(period, customRange);

  // Memoize date range values to prevent query key changes on every render
  const { fromDate, toDate } = useMemo(
    () => ({
      fromDate: dateRange.from,
      toDate: dateRange.to,
    }),
    [dateRange.from, dateRange.to]
  );

  const config = useMemo<SearchConfiguration>(
    () => ({
      offset: 0,
      limit: DEFAULT_PAGE_SIZE,
      fromDate,
      toDate,
      sortField: 'refereeGame.game.startingDateTime',
      sortDirection: period === 'past' ? 'desc' : 'asc',
    }),
    [fromDate, toDate, period]
  );

  return useQuery({
    queryKey: queryKeys.assignments.list(config, associationKey),
    queryFn: async () => {
      const response = await apiClient.searchAssignments(config);
      return response.items ?? EMPTY_ASSIGNMENTS;
    },
    staleTime: ASSIGNMENTS_STALE_TIME_MS,
    enabled,
  });
}

/**
 * Hook to fetch detailed assignment information.
 *
 * @param assignmentId - The assignment ID to fetch, or null to disable
 * @param apiClient - API client for fetching
 */
export function useAssignmentDetails(
  assignmentId: string | null,
  apiClient: AssignmentsApiClient
): UseQueryResult<Assignment | null, Error> {
  return useQuery({
    queryKey: queryKeys.assignments.detail(assignmentId || ''),
    queryFn: async () => {
      if (!assignmentId || !apiClient.getAssignmentDetails) return null;
      return apiClient.getAssignmentDetails(assignmentId);
    },
    enabled: !!assignmentId && !!apiClient.getAssignmentDetails,
    staleTime: ASSIGNMENT_DETAILS_STALE_TIME_MS,
  });
}
