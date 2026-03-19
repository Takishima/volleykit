/**
 * Path/URL constants and validation functions for the VolleyKit CORS Proxy Worker.
 */

// =============================================================================
// Path Configuration Constants
// =============================================================================

/** Exact match paths (no subpaths allowed) - NOT prefixed with /api/ */
export const ALLOWED_EXACT_PATHS = ['/', '/login', '/logout']

/** Prefix match paths that are NOT prefixed with /api/ (auth and dashboard) */
export const ALLOWED_PREFIX_PATHS_NO_API = [
  '/sportmanager.security/',
  '/sportmanager.volleyball/',
  // Static resources (profile pictures, uploaded files) served by Neos Flow
  '/_Resources/',
]

/** Prefix match paths that ARE prefixed with /api/ (API endpoints) */
export const ALLOWED_PREFIX_PATHS_WITH_API = [
  '/indoorvolleyball.refadmin/',
  '/sportmanager.indoorvolleyball/',
  '/sportmanager.core/',
  '/sportmanager.resourcemanagement/',
  '/sportmanager.notificationcenter/',
]

/**
 * Specific paths within NO_API prefixes that DO need the /api/ prefix.
 * These are API endpoints under packages that normally serve dashboard/auth pages.
 */
export const EXCEPTIONS_NEED_API = ['/sportmanager.security/api', '/sportmanager.volleyball/api']

/**
 * Specific paths within WITH_API prefixes that do NOT need the /api/ prefix.
 * These are file download endpoints that serve binary content (PDFs, etc.)
 */
export const EXCEPTIONS_NO_API = [
  '/indoorvolleyball.refadmin/refereestatementofexpenses/downloadrefereestatementofexpenses',
]

// =============================================================================
// Path Validation Functions
// =============================================================================

/**
 * Check if the given pathname is in the allowed paths list.
 */
export function isAllowedPath(pathname: string): boolean {
  if (ALLOWED_EXACT_PATHS.includes(pathname)) {
    return true
  }
  return (
    ALLOWED_PREFIX_PATHS_NO_API.some((prefix) => pathname.startsWith(prefix)) ||
    ALLOWED_PREFIX_PATHS_WITH_API.some((prefix) => pathname.startsWith(prefix))
  )
}

/**
 * Check if a path requires the /api/ prefix when forwarding to the target host.
 * API endpoints need this prefix, while auth/dashboard endpoints do not.
 */
export function requiresApiPrefix(pathname: string): boolean {
  if (EXCEPTIONS_NO_API.some((prefix) => pathname.startsWith(prefix))) {
    return false
  }
  if (EXCEPTIONS_NEED_API.some((prefix) => pathname.startsWith(prefix))) {
    return true
  }
  return ALLOWED_PREFIX_PATHS_WITH_API.some((prefix) => pathname.startsWith(prefix))
}

/**
 * Validate pathname to prevent path traversal attacks.
 * Returns true if the path is safe, false if it contains suspicious patterns.
 *
 * Note: Backslashes (\) are ALLOWED because the TYPO3 Neos/Flow backend uses
 * them as namespace separators in controller paths.
 */
export function isPathSafe(pathname: string): boolean {
  let decoded: string
  try {
    decoded = decodeURIComponent(pathname)
  } catch {
    return false
  }

  if (decoded.includes('..') || decoded.includes('//') || decoded.includes('\0')) {
    return false
  }

  return true
}
