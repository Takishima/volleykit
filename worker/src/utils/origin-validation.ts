/**
 * Origin validation functions for the VolleyKit CORS Proxy Worker.
 */

/**
 * Parse comma-separated allowed origins string into an array.
 */
export function parseAllowedOrigins(allowedOrigins: string): string[] {
  return allowedOrigins
    .split(',')
    .map((o) => o.trim())
    .filter((o) => o.length > 0)
}

/**
 * Validate that all origins in the array are valid URLs with http/https protocol.
 * @throws {Error} If any origin is invalid
 */
export function validateAllowedOrigins(origins: string[]): void {
  for (const origin of origins) {
    try {
      const url = new URL(origin)
      if (url.protocol !== 'https:' && url.protocol !== 'http:') {
        throw new Error(`Origin must use http or https protocol: ${origin}`)
      }
      if (url.pathname !== '/' || url.search || url.hash) {
        throw new Error(`Origin should not include path, query, or fragment: ${origin}`)
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes('Origin')) {
        throw e
      }
      throw new Error(`Invalid origin format: ${origin}`, { cause: e })
    }
  }
}

/**
 * Check if the given origin is in the allowed origins list.
 * Case-insensitive comparison per RFC 6454.
 */
export function isAllowedOrigin(origin: string | null, allowedOrigins: string[]): boolean {
  if (!origin) return false
  const normalizedOrigin = origin.replace(/\/$/, '').toLowerCase()
  return allowedOrigins.some(
    (allowed) => allowed.replace(/\/$/, '').toLowerCase() === normalizedOrigin
  )
}
