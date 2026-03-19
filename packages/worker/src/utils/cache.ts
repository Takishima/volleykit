/**
 * Cache control functions for the VolleyKit CORS Proxy Worker.
 */

/**
 * Cache control headers to prevent stale data from being served.
 * Dynamic content (API responses, HTML pages) should never be cached.
 */
export function noCacheHeaders(): Record<string, string> {
  return {
    'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
    Pragma: 'no-cache',
    Expires: '0',
  }
}

/**
 * Check if a response contains dynamic content that should not be cached.
 * This includes HTML pages (login, dashboard) and API JSON responses.
 */
export function isDynamicContent(contentType: string | null): boolean {
  if (!contentType) return true

  const normalizedType = contentType.toLowerCase()
  return (
    normalizedType.includes('text/html') ||
    normalizedType.includes('application/json') ||
    normalizedType.includes('application/x-www-form-urlencoded')
  )
}
