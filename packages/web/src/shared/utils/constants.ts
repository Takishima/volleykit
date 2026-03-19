/**
 * Application-wide constants.
 */

import { useLanguageStore } from '@/shared/stores/language'

// ============================================================================
// Time Conversion Factors (re-exported from @volleykit/shared)
// ============================================================================

export {
  MS_PER_SECOND,
  SECONDS_PER_MINUTE,
  MINUTES_PER_HOUR,
  HOURS_PER_DAY,
  MS_PER_MINUTE,
  MS_PER_HOUR,
  MS_PER_DAY,
} from '@volleykit/shared/utils'

// ============================================================================
// HTTP Status Codes
// ============================================================================

/**
 * Standard HTTP status codes used throughout the application.
 * Using a const object with `as const` ensures type safety and self-documenting code.
 */
export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  NOT_ACCEPTABLE: 406,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const

// ============================================================================
// Size Conversion Factors
// ============================================================================

/** Bytes in one kilobyte (binary: 1024 = 2^10) */
export const BYTES_PER_KB = 1024

/** Bytes in one megabyte (binary: 1024^2) */
export const BYTES_PER_MB = BYTES_PER_KB * BYTES_PER_KB

// ============================================================================
// UI Animation Timing
// ============================================================================

/** Standard modal/sheet close animation duration (300ms) */
export const MODAL_ANIMATION_MS = 300

/** Toast notification display duration (500ms minimum visibility) */
export const TOAST_MIN_DURATION_MS = 500

// ============================================================================
// Distance Thresholds (kilometers)
// ============================================================================

/** Short distance threshold - typically no transfers needed */
export const SHORT_DISTANCE_KM = 10

/** Medium distance threshold - typically 1 transfer */
export const MEDIUM_DISTANCE_KM = 30

/** Long distance threshold - typically 2 transfers */
export const LONG_DISTANCE_KM = 60

// ============================================================================
// Application URLs
// ============================================================================

/**
 * Returns the absolute URL to the VolleyKit help documentation site.
 * Must be absolute (not relative) to bypass the service worker which would
 * otherwise intercept the request and serve the web app instead of the help site.
 *
 * Uses window.location.origin + BASE_URL to work correctly in:
 * - Production: https://takishima.github.io/volleykit/help/
 * - PR previews: https://takishima.github.io/volleykit/pr-123/help/
 * - Local dev: http://localhost:5173/help/
 *
 * Includes the current app language as a query parameter so the help site
 * opens in the same language as the main app.
 */
export function getHelpSiteUrl(): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const baseUrl = `${origin}${import.meta.env.BASE_URL}help/`

  // Get current language from store (works outside React components)
  const currentLang = useLanguageStore.getState().locale

  // Use URLSearchParams for safe query parameter construction
  const params = new URLSearchParams({ lang: currentLang })
  return `${baseUrl}?${params.toString()}`
}
