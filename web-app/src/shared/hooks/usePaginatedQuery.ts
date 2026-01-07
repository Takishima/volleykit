import type { UseQueryResult } from "@tanstack/react-query";
import { api, type SearchConfiguration, type Assignment } from "@/api/client";
import { createLogger } from "@/shared/utils/logger";
import { MS_PER_MINUTE, MS_PER_HOUR } from "@/shared/utils/constants";

const log = createLogger("usePaginatedQuery");

// Pagination constants
// Note: The API doesn't support cursor-based pagination, so we use offset-based.
// DEFAULT_PAGE_SIZE is used for regular queries where 100 items is typically sufficient.
// MAX_FETCH_ALL_PAGES is a safety limit when fetching all pages to prevent runaway requests.
export const DEFAULT_PAGE_SIZE = 100;
export const MAX_FETCH_ALL_PAGES = 10; // Maximum pages to fetch (1000 items)
export const DEFAULT_DATE_RANGE_DAYS = 365;

// Date range period constants for assignment filtering
export const THIS_WEEK_DAYS = 7;
export const NEXT_MONTH_DAYS = 30;

// Limit for fetching compensations when looking up by game number.
// Higher than DEFAULT_PAGE_SIZE because we need to search through all compensations
// to find the one matching the assignment's game.
export const COMPENSATION_LOOKUP_LIMIT = 200;

// Cache durations (stale times) for different query types.
// These control how long TanStack Query considers data fresh before refetching.
const STALE_TIME = { DEFAULT: 5, EXCHANGES: 2, SETTINGS: 30, VALIDATION_CLOSED: 15 } as const;

/** Default stale time for assignments queries (5 minutes) */
export const ASSIGNMENTS_STALE_TIME_MS = STALE_TIME.DEFAULT * MS_PER_MINUTE;

/** Stale time for compensation queries (5 minutes) */
export const COMPENSATIONS_STALE_TIME_MS = STALE_TIME.DEFAULT * MS_PER_MINUTE;

/** Stale time for exchange queries (2 minutes) - shorter due to time-sensitive nature */
export const EXCHANGES_STALE_TIME_MS = STALE_TIME.EXCHANGES * MS_PER_MINUTE;

/** Stale time for association settings (30 minutes) - settings rarely change */
export const SETTINGS_STALE_TIME_MS = STALE_TIME.SETTINGS * MS_PER_MINUTE;

/** Stale time for active season (1 hour) - season changes infrequently */
export const SEASON_STALE_TIME_MS = MS_PER_HOUR;

/**
 * Cache duration for validation-closed assignments (15 minutes).
 * Longer than default because validation status changes infrequently
 * and fetching all pages is expensive.
 */
export const VALIDATION_CLOSED_STALE_TIME_MS = STALE_TIME.VALIDATION_CLOSED * MS_PER_MINUTE;

// Fallback timestamp for items with missing dates - uses Unix epoch (1970-01-01)
// Items with missing dates will sort as oldest when ascending, newest when descending
export const MISSING_DATE_FALLBACK_TIMESTAMP = 0;

// Helper type for items with game date
export type WithGameDate = {
  refereeGame?: { game?: { startingDateTime?: string } };
};

// Helper to extract game timestamp for sorting
export function getGameTimestamp(item: WithGameDate): number {
  return new Date(
    item.refereeGame?.game?.startingDateTime || MISSING_DATE_FALLBACK_TIMESTAMP,
  ).getTime();
}

// Helper to sort items by game date
export function sortByGameDate<T extends WithGameDate>(
  items: T[],
  descending: boolean,
): T[] {
  return [...items].sort((a, b) => {
    const dateA = getGameTimestamp(a);
    const dateB = getGameTimestamp(b);
    return descending ? dateB - dateA : dateA - dateB;
  });
}

/**
 * Safely parses a date string, returning a fallback if invalid.
 * Prevents Invalid Date objects from propagating through the system.
 */
export function parseDateOrFallback(
  dateString: string | undefined | null,
  fallback: Date,
): Date {
  if (!dateString) return fallback;
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? fallback : date;
}

/**
 * Fetches all pages of assignments matching the search configuration.
 * Uses sequential fetching to avoid overwhelming the API.
 *
 * Stops fetching when any of these conditions are met:
 * - All items fetched (allItems.length >= totalCount)
 * - MAX_FETCH_ALL_PAGES reached (safety limit)
 * - Empty page returned (API exhausted or issue)
 * - Stalled response (totalCount unchanged between pages, indicating potential issue)
 *
 * Note: This function manages its own offset/limit pagination internally.
 * The caller's config should NOT include offset/limit as they will be overwritten.
 *
 * @param config - Search configuration for the API (without offset/limit)
 * @param signal - Optional AbortSignal for cancellation support
 * @returns Array of all fetched assignments
 */
export async function fetchAllAssignmentPages(
  config: SearchConfiguration,
  signal?: AbortSignal,
): Promise<Assignment[]> {
  const allItems: Assignment[] = [];
  let offset = 0;
  let totalCount = 0;
  let previousTotalCount = -1;
  let pagesFetched = 0;

  do {
    // Check for cancellation before each request
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    const pageConfig = { ...config, offset, limit: DEFAULT_PAGE_SIZE };
    const response = await api.searchAssignments(pageConfig);

    // Check for cancellation after async operation completes
    // (request may have finished while abort was signaled)
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    const pageItems = response.items || [];

    // Guard against infinite loop: break if page returns no items
    // This can happen if totalItemsCount is stale or API has issues
    if (pageItems.length === 0) {
      break;
    }

    allItems.push(...pageItems);
    previousTotalCount = totalCount;
    totalCount = response.totalItemsCount || 0;

    // Detect stalled responses: if totalCount hasn't changed after adding items,
    // the API may be returning duplicate data or has a pagination issue
    if (
      pagesFetched > 0 &&
      totalCount === previousTotalCount &&
      totalCount > 0
    ) {
      break;
    }

    // Early exit when all items are fetched to avoid unnecessary loop iterations
    if (allItems.length >= totalCount && totalCount > 0) {
      break;
    }

    offset += DEFAULT_PAGE_SIZE;
    pagesFetched++;
  } while (allItems.length < totalCount && pagesFetched < MAX_FETCH_ALL_PAGES);

  // Log warning if we hit the page limit before fetching all items
  if (pagesFetched >= MAX_FETCH_ALL_PAGES && allItems.length < totalCount) {
    log.warn(
      `Reached MAX_FETCH_ALL_PAGES limit (${MAX_FETCH_ALL_PAGES}). ` +
        `Fetched ${allItems.length} of ${totalCount} total items. Some data may be missing.`,
    );
  }

  return allItems;
}

// Helper to create mock query results for demo mode
// Type assertion is necessary because we're creating a partial mock of UseQueryResult
// that satisfies the interface without all internal TanStack Query state.
// Limitations: refetch, dataUpdatedAt, and other internal query methods are inherited
// from the disabled base query and won't function as expected. Consumers should check
// isError before accessing data, as data may be undefined in error cases.
export function createDemoQueryResult<T>(
  baseQuery: UseQueryResult<T, Error>,
  data: T,
  options: { isError?: boolean; error?: Error | null } = {},
): UseQueryResult<T, Error> {
  const isError = options.isError ?? false;
  // TanStack Query types error as TError | null, so null is the correct fallback
  const error = options.error === undefined ? null : options.error;
  return {
    ...baseQuery,
    data,
    isLoading: false,
    isFetching: false,
    isSuccess: !isError,
    isError,
    error,
    status: isError ? "error" : "success",
    fetchStatus: "idle",
  } as UseQueryResult<T, Error>;
}
