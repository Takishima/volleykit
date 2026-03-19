/**
 * iOS Safari PWA session cookie relay utilities.
 *
 * iOS Safari's Intelligent Tracking Prevention (ITP) blocks third-party cookies
 * in PWA standalone mode. These utilities allow the proxy to:
 * 1. Extract session cookies from Set-Cookie headers and encode them as a readable header
 * 2. Decode the session token header back to a Cookie string for forwarding
 *
 * Flow:
 *   Response: Set-Cookie → extractSessionCookies() → X-Session-Token header (base64)
 *   Request:  X-Session-Token header → decodeSessionToken() → Cookie header
 */

/** Custom header name for iOS Safari PWA session cookie relay */
export const SESSION_TOKEN_HEADER = 'X-Session-Token'

/**
 * Extract session cookie values from Set-Cookie headers.
 * Returns a base64-encoded string of cookie name=value pairs.
 */
export function extractSessionCookies(cookies: string[]): string | null {
  if (cookies.length === 0) return null

  // Extract just the cookie name=value part (before attributes like Path, Secure, etc.)
  const cookieValues = cookies
    .map((cookie) => {
      const [nameValue] = cookie.split(';')
      return nameValue?.trim()
    })
    .filter(Boolean)

  if (cookieValues.length === 0) return null

  // Join all cookies and base64 encode for safe transport
  return btoa(cookieValues.join('; '))
}

/**
 * Decode session token back to cookie string.
 * Internal helper — use mergeSessionCookies() from external call sites.
 */
function decodeSessionToken(token: string): string | null {
  try {
    return atob(token)
  } catch {
    return null
  }
}

/**
 * Merge a decoded session token into existing cookies.
 * Returns the merged cookie string suitable for the Cookie header.
 */
export function mergeSessionCookies(
  existingCookies: string | null,
  sessionToken: string
): string | null {
  const cookieValue = decodeSessionToken(sessionToken)
  if (!cookieValue) return existingCookies

  return existingCookies ? `${existingCookies}; ${cookieValue}` : cookieValue
}
