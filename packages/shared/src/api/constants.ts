/**
 * Shared API constants used across hooks and query configurations.
 */

/** Default page size for API list requests */
export const DEFAULT_PAGE_SIZE = 50

/** Stale time for assignments list (5 minutes) */
export const ASSIGNMENTS_STALE_TIME_MS = 5 * 60 * 1000

/** Stale time for assignment details (10 minutes - less frequent updates) */
export const ASSIGNMENT_DETAILS_STALE_TIME_MS = 10 * 60 * 1000

/** Stale time for compensations list (5 minutes) */
export const COMPENSATIONS_STALE_TIME_MS = 5 * 60 * 1000

/** Stale time for exchanges list (2 minutes - shorter since exchanges change frequently) */
export const EXCHANGES_STALE_TIME_MS = 2 * 60 * 1000
