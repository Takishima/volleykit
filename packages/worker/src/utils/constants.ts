/**
 * Shared constants and utility functions for the VolleyKit CORS Proxy Worker.
 */

/** Default User-Agent to identify VolleyKit traffic.
 * Can be overridden via the CUSTOM_USER_AGENT env var in wrangler.toml
 * without a code deploy — useful if the upstream blocks this string. */
export const DEFAULT_USER_AGENT = 'VolleyKit/1.0 (PWA; https://github.com/Takishima/volleykit)'

/**
 * Returns the User-Agent to use for upstream requests.
 * Prefers the CUSTOM_USER_AGENT env var if set, otherwise falls back to the default.
 */
export function getUserAgent(env: { CUSTOM_USER_AGENT?: string }): string {
  return env.CUSTOM_USER_AGENT || DEFAULT_USER_AGENT
}

/**
 * Header for iOS Safari PWA session token capture.
 * When this header is present on a request, redirect responses with session tokens
 * are converted to JSON so the client can capture the token.
 *
 * This is necessary because fetch with `redirect: 'manual'` returns an opaque redirect
 * for cross-origin requests, hiding all response headers including X-Session-Token.
 */
export const CAPTURE_SESSION_TOKEN_HEADER = 'X-Capture-Session-Token'

/** Retry-After duration when service is unavailable (kill switch enabled) */
export const KILL_SWITCH_RETRY_AFTER_SECONDS = 86400 // 24 hours

/** CORS preflight cache duration in seconds (24 hours) */
export const CORS_PREFLIGHT_MAX_AGE_SECONDS = 86400

/** Milliseconds per second, for converting between Date.now() timestamps and second-based durations */
export const MS_PER_SECOND = 1000

/** Bytes per kilobyte (binary) */
export const BYTES_PER_KB = 1024

/** Bytes per megabyte (binary) */
export const BYTES_PER_MB = BYTES_PER_KB * BYTES_PER_KB

/** Maximum file size for OCR requests in megabytes (Mistral API limit) */
const OCR_MAX_FILE_SIZE_MB = 50

/** Maximum file size for OCR requests (Mistral API limit) */
export const OCR_MAX_FILE_SIZE_BYTES = OCR_MAX_FILE_SIZE_MB * BYTES_PER_MB // 50MB

/** HTTP status codes used by the worker */
export const HttpStatus = {
  OK: 200,
  NO_CONTENT: 204,
  FOUND: 302,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  TOO_MANY_REQUESTS: 429,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const

/** Lower bound (inclusive) of the HTTP 3xx redirect status range */
export const HTTP_REDIRECT_STATUS_MIN = 300

/** Upper bound (exclusive) of the HTTP 3xx redirect status range */
export const HTTP_REDIRECT_STATUS_MAX_EXCLUSIVE = 400

/** Separator between the URL scheme and the authority (e.g. `https://`) */
const URL_SCHEME_SEPARATOR = '://'

/**
 * Extract the raw path and search from a request URL string.
 * Preserves URL encoding (important for TYPO3 Neos/Flow backslash encoding).
 */
export function extractRawPathAndSearch(requestUrlStr: string): string {
  const pathStart = requestUrlStr.indexOf(
    '/',
    requestUrlStr.indexOf(URL_SCHEME_SEPARATOR) + URL_SCHEME_SEPARATOR.length
  )
  return pathStart >= 0 ? requestUrlStr.substring(pathStart) : '/'
}

/**
 * Check if the kill switch is enabled.
 */
export function checkKillSwitch(env: { KILL_SWITCH?: string }): boolean {
  return env.KILL_SWITCH === 'true'
}
