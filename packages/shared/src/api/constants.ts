/**
 * Shared API constants used across hooks and query configurations.
 */

import { MS_PER_MINUTE } from '../utils/date-helpers'

/** Default page size for API list requests */
export const DEFAULT_PAGE_SIZE = 50

const ASSIGNMENTS_STALE_MINUTES = 5
const ASSIGNMENT_DETAILS_STALE_MINUTES = 10
const COMPENSATIONS_STALE_MINUTES = 5
const EXCHANGES_STALE_MINUTES = 2

/** Stale time for assignments list (5 minutes) */
export const ASSIGNMENTS_STALE_TIME_MS = ASSIGNMENTS_STALE_MINUTES * MS_PER_MINUTE

/** Stale time for assignment details (10 minutes - less frequent updates) */
export const ASSIGNMENT_DETAILS_STALE_TIME_MS = ASSIGNMENT_DETAILS_STALE_MINUTES * MS_PER_MINUTE

/** Stale time for compensations list (5 minutes) */
export const COMPENSATIONS_STALE_TIME_MS = COMPENSATIONS_STALE_MINUTES * MS_PER_MINUTE

/** Stale time for exchanges list (2 minutes - shorter since exchanges change frequently) */
export const EXCHANGES_STALE_TIME_MS = EXCHANGES_STALE_MINUTES * MS_PER_MINUTE
