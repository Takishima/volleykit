/**
 * Type definitions for Pagefind search library
 * @see https://pagefind.app/docs/api/
 */

/** Pagefind search result metadata */
export interface PagefindResultMeta {
  title?: string
  image?: string
  [key: string]: string | undefined
}

/** Pagefind search result data returned by result.data() */
export interface PagefindResultData {
  /** URL of the matched page */
  url: string
  /** HTML excerpt with <mark> tags for matched terms */
  excerpt: string
  /** Metadata extracted from the page */
  meta: PagefindResultMeta
  /** Full content of the page */
  content: string
  /** Word count of the page */
  word_count: number
  /** Filter values for the result */
  filters: Record<string, string[]>
  /** Locations of matches in the content */
  locations: number[]
  /** Weighted locations for ranking */
  weighted_locations: Array<{
    weight: number
    balanced_score: number
    location: number
  }>
}

/** Pagefind search result reference (lazy-loaded) */
export interface PagefindResult {
  /** Unique ID of the result */
  id: string
  /** Relevance score (0-1) */
  score: number
  /** Array of matched words */
  words: number[]
  /** Load full result data */
  data: () => Promise<PagefindResultData>
}

/** Pagefind search response */
export interface PagefindSearchResponse {
  /** Array of search results */
  results: PagefindResult[]
  /** Total unfilterable results count */
  unfilteredResultCount: number
  /** Available filters */
  filters: Record<string, Record<string, number>>
  /** Total results count for current filters */
  totalFilters: Record<string, number>
  /** Timing information */
  timings: {
    preload: number
    search: number
    total: number
  }
}

/** Pagefind API interface */
export interface PagefindAPI {
  /** Initialize Pagefind (must be called before search) */
  init: () => Promise<void>
  /** Search for a query string */
  search: (query: string, options?: PagefindSearchOptions) => Promise<PagefindSearchResponse>
  /** Preload search index for specific terms */
  preload: (query: string) => Promise<void>
  /** Get available filters */
  filters: () => Promise<Record<string, Record<string, number>>>
}

/** Pagefind search options */
export interface PagefindSearchOptions {
  /** Filter results by specific values */
  filters?: Record<string, string | string[]>
  /** Sort results by a specific key */
  sort?: Record<string, 'asc' | 'desc'>
}
