/**
 * Service worker runtime cache configuration.
 *
 * Shared between the Workbox `runtimeCaching` entries in vite.config.ts and the
 * runtime code that purges those caches on logout, so a renamed cache or a
 * changed URL allowlist can never drift between the two.
 *
 * Pure constants only: this module is imported by vite.config.ts under the node
 * tsconfig, so it must not touch browser globals.
 */

/** Cache for direct VolleyManager API responses (development/direct access) */
export const API_CACHE_NAME = 'api-cache'

/** Cache for CORS-proxy API responses (production) */
export const PROXY_API_CACHE_NAME = 'proxy-api-cache'

/** Every runtime cache that holds API responses for the signed-in user */
export const API_RESPONSE_CACHE_NAMES: readonly string[] = [API_CACHE_NAME, PROXY_API_CACHE_NAME]

/**
 * API path prefixes whose JSON responses may be cached for offline use.
 * Deliberately excludes the HTML pages (/login, dashboard, authentication) so
 * session material is never kept in CacheStorage.
 *
 * Neos Flow controller paths follow the package with a separator that is either
 * `/` (e.g. `indoorvolleyball.refadmin/api%5c…`) or a backslash, raw or encoded
 * (e.g. `sportmanager.security/api%5cparty/…`).
 */
const CACHEABLE_API_PACKAGES = [
  'indoorvolleyball.refadmin',
  'sportmanager.indoorvolleyball',
  'sportmanager.core',
  'sportmanager.resourcemanagement',
  'sportmanager.notificationcenter',
  'sportmanager.security/api',
  'sportmanager.volleyball/api',
]

/** Escape a literal for use inside a RegExp source string. */
function escapeRegExp(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')
}

/** Separator between a package (or `package/api`) and the controller name */
const PACKAGE_SEPARATOR_PATTERN = '(?:\\/|%5c|\\\\)'

/** RegExp source matching an allowlisted API path relative to the host root. */
const CACHEABLE_API_PATH_PATTERN = `(?:${CACHEABLE_API_PACKAGES.map(escapeRegExp).join('|')})${PACKAGE_SEPARATOR_PATTERN}`

/**
 * Build the Workbox `urlPattern` for one or more API origins.
 *
 * @param originUrls - Origin URLs, e.g. `https://api.volleykit.ch` (a path is ignored);
 *   several origins share one pattern so primary and fallback proxies fill the same cache
 * @param allowApiPrefix - Accept an optional `/api/` segment after the origin (direct access)
 */
export function buildCacheableApiUrlPattern(
  originUrls: readonly string[],
  allowApiPrefix = false
): RegExp {
  const origins = [...new Set(originUrls.map((url) => new URL(url).origin))]
  if (origins.length === 0) {
    throw new Error('buildCacheableApiUrlPattern: at least one origin is required')
  }
  const originAlternation = origins.map(escapeRegExp).join('|')
  const apiPrefix = allowApiPrefix ? '(?:api\\/)?' : ''
  // eslint-disable-next-line security/detect-non-literal-regexp -- assembled from build-time constants only, never from user input
  return new RegExp(`^(?:${originAlternation})\\/${apiPrefix}${CACHEABLE_API_PATH_PATTERN}`, 'i')
}
