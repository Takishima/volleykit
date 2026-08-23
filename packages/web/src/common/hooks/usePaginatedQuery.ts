import { getDroppedListItems } from '@volleykit/shared/api'

import type { SearchConfiguration, Assignment, ApiClient } from '@/api/client'
import { MS_PER_MINUTE, MS_PER_HOUR, MS_PER_DAY } from '@/common/utils/constants'
import { createLogger } from '@/common/utils/logger'

import type { UseQueryResult } from '@tanstack/react-query'

const log = createLogger('usePaginatedQuery')

// Pagination constants
// Note: The API doesn't support cursor-based pagination, so we use offset-based.
// DEFAULT_PAGE_SIZE is used for regular queries where 100 items is typically sufficient.
// MAX_FETCH_ALL_PAGES is a safety limit when fetching all pages to prevent runaway requests.
export const DEFAULT_PAGE_SIZE = 100
export const MAX_FETCH_ALL_PAGES = 10 // Maximum pages to fetch (1000 items)
export const DEFAULT_DATE_RANGE_DAYS = 365

// Date range period constants for assignment filtering
export const THIS_WEEK_DAYS = 7
export const NEXT_MONTH_DAYS = 30

// Limit for fetching compensations when looking up by game number.
// Higher than DEFAULT_PAGE_SIZE because we need to search through all compensations
// to find the one matching the assignment's game.
export const COMPENSATION_LOOKUP_LIMIT = 200

// Cache durations (stale times) for different query types.
// These control how long TanStack Query considers data fresh before refetching.
const STALE_TIME = { DEFAULT: 5, EXCHANGES: 2, SETTINGS: 30, VALIDATION_CLOSED: 15 } as const

/** Default stale time for assignments queries (5 minutes) */
export const ASSIGNMENTS_STALE_TIME_MS = STALE_TIME.DEFAULT * MS_PER_MINUTE

/** Stale time for compensation queries (5 minutes) */
export const COMPENSATIONS_STALE_TIME_MS = STALE_TIME.DEFAULT * MS_PER_MINUTE

/** Stale time for exchange queries (2 minutes) - shorter due to time-sensitive nature */
export const EXCHANGES_STALE_TIME_MS = STALE_TIME.EXCHANGES * MS_PER_MINUTE

/** Stale time for association settings (30 minutes) - settings rarely change */
export const SETTINGS_STALE_TIME_MS = STALE_TIME.SETTINGS * MS_PER_MINUTE

/** Stale time for active season (1 hour) - season changes infrequently */
export const SEASON_STALE_TIME_MS = MS_PER_HOUR

/** Garbage collection time for offline cache (7 days) - keep cached data for offline viewing */
const OFFLINE_CACHE_DAYS = 7
export const OFFLINE_GC_TIME_MS = OFFLINE_CACHE_DAYS * MS_PER_DAY

/**
 * Cache duration for validation-closed assignments (15 minutes).
 * Longer than default because validation status changes infrequently
 * and fetching all pages is expensive.
 */
export const VALIDATION_CLOSED_STALE_TIME_MS = STALE_TIME.VALIDATION_CLOSED * MS_PER_MINUTE

// Fallback timestamp for items with missing dates - uses Unix epoch (1970-01-01)
// Items with missing dates will sort as oldest when ascending, newest when descending
export const MISSING_DATE_FALLBACK_TIMESTAMP = 0

// Helper type for items with game date
export type WithGameDate = {
  refereeGame?: { game?: { startingDateTime?: string } }
}

// Helper to extract game timestamp for sorting
export function getGameTimestamp(item: WithGameDate): number {
  return new Date(
    item.refereeGame?.game?.startingDateTime || MISSING_DATE_FALLBACK_TIMESTAMP
  ).getTime()
}

// Helper to sort items by game date
export function sortByGameDate<T extends WithGameDate>(items: T[], descending: boolean): T[] {
  return [...items].sort((a, b) => {
    const dateA = getGameTimestamp(a)
    const dateB = getGameTimestamp(b)
    return descending ? dateB - dateA : dateA - dateB
  })
}

/**
 * Safely parses a date string, returning a fallback if invalid.
 * Prevents Invalid Date objects from propagating through the system.
 */
export function parseDateOrFallback(dateString: string | undefined | null, fallback: Date): Date {
  if (!dateString) return fallback
  const date = new Date(dateString)
  return isNaN(date.getTime()) ? fallback : date
}

/**
 * Fetches all pages of assignments matching the search configuration.
 * Uses sequential fetching to avoid overwhelming the API.
 *
 * Stops fetching when any of these conditions are met:
 * - All items fetched (allItems.length >= totalCount)
 * - MAX_FETCH_ALL_PAGES reached (safety limit)
 * - A page comes back carrying nothing at all — no items and no dropped items
 *
 * Note: This function manages its own offset/limit pagination internally.
 * The caller's config should NOT include offset/limit as they will be overwritten.
 *
 * @param config - Search configuration for the API (without offset/limit)
 * @param signal - Optional AbortSignal for cancellation support
 * @returns Array of all fetched assignments
 */
export async function fetchAllAssignmentPages(
  apiClient: Pick<ApiClient, 'searchAssignments'>,
  config: SearchConfiguration,
  signal?: AbortSignal
): Promise<Assignment[]> {
  const allItems: Assignment[] = []
  let offset = 0
  let totalCount = 0
  let pagesFetched = 0
  let droppedTotal = 0

  do {
    // Check for cancellation before each request
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError')
    }

    const pageConfig = { ...config, offset, limit: DEFAULT_PAGE_SIZE }
    const response = await apiClient.searchAssignments(pageConfig)

    // Check for cancellation after async operation completes
    // (request may have finished while abort was signaled)
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError')
    }

    const pageItems = response.items || []
    const droppedCount = getDroppedListItems(response).length

    // Guard against an infinite loop. The server is out of rows only when the
    // page carried nothing at all: a page whose items every one failed
    // validation arrives with `items: []` but still consumed a page worth of
    // rows, so treating that as exhaustion would silently drop every page after
    // it.
    if (pageItems.length === 0 && droppedCount === 0) {
      break
    }

    allItems.push(...pageItems)
    droppedTotal += droppedCount
    totalCount = response.totalItemsCount || 0

    // `totalItemsCount` is the server's total across all pages, so a healthy API
    // repeats it on every response. It is not a stall signal, and comparing it
    // between pages used to stop every multi-page fetch at page two.
    offset += DEFAULT_PAGE_SIZE
    pagesFetched++

    // Early exit once every row the server counted has been seen, whether it
    // was kept or dropped.
    if (allItems.length + droppedTotal >= totalCount && totalCount > 0) {
      break
    }
  } while (allItems.length + droppedTotal < totalCount && pagesFetched < MAX_FETCH_ALL_PAGES)

  // Any shortfall is worth a warning, not just the page cap: without this, a
  // truncated fetch is indistinguishable from a complete one at the call site.
  if (allItems.length < totalCount) {
    const reachedPageLimit = pagesFetched >= MAX_FETCH_ALL_PAGES
    log.warn(
      `Fetched ${allItems.length} of ${totalCount} total items.` +
        (droppedTotal > 0 ? ` ${droppedTotal} dropped by validation.` : '') +
        (reachedPageLimit ? ` Reached MAX_FETCH_ALL_PAGES limit (${MAX_FETCH_ALL_PAGES}).` : '') +
        ' Some data may be missing.'
    )
  }

  return allItems
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
  options: { isError?: boolean; error?: Error | null } = {}
): UseQueryResult<T, Error> {
  const isError = options.isError ?? false
  // TanStack Query types error as TError | null, so null is the correct fallback
  const error = options.error === undefined ? null : options.error
  return {
    ...baseQuery,
    data,
    isLoading: false,
    isFetching: false,
    isSuccess: !isError,
    isError,
    error,
    status: isError ? 'error' : 'success',
    fetchStatus: 'idle',
  } as UseQueryResult<T, Error>
}
