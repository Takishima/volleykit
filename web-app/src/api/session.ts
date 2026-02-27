/**
 * Session and CSRF token management for real API communication.
 *
 * Manages two authentication mechanisms:
 * - CSRF tokens: standard CSRF protection for form submissions
 * - Session tokens: iOS Safari PWA workaround via X-Session-Token header
 *   (the Cloudflare Worker sends session cookies as headers to bypass ITP)
 *
 * All consumers that need session management should import from this module.
 */

import {
  setCsrfToken as setToken,
  clearCsrfToken,
  getSessionToken,
  setSessionToken,
  clearSessionToken,
} from './form-serialization'

/**
 * Session token header name used by the Cloudflare Worker for iOS Safari PWA.
 * The worker sends session cookies via this header to bypass ITP cookie blocking.
 */
const SESSION_TOKEN_HEADER = 'X-Session-Token'

/**
 * Header to request session token capture from redirect responses.
 * When this header is present, the worker converts redirect responses with session tokens
 * to JSON, allowing the client to capture tokens from redirects (which would otherwise
 * be opaque due to redirect: 'manual').
 */
export const CAPTURE_SESSION_TOKEN_HEADER = 'X-Capture-Session-Token'

// CSRF token management
export function setCsrfToken(token: string | null) {
  setToken(token)
}

/**
 * Capture session token from response headers.
 * The Cloudflare Worker sends session cookies as X-Session-Token header
 * to bypass iOS Safari ITP blocking third-party cookies in PWA mode.
 */
export function captureSessionToken(response: Response): void {
  const token = response.headers.get(SESSION_TOKEN_HEADER)
  if (token) {
    setSessionToken(token)
  }
}

/**
 * Get headers for sending session token with requests.
 * Returns the X-Session-Token header if a token is stored.
 */
export function getSessionHeaders(): Record<string, string> {
  const token = getSessionToken()
  return token ? { [SESSION_TOKEN_HEADER]: token } : {}
}

// Re-export getSessionToken for use in login flow
export { getSessionToken }

export function clearSession() {
  clearCsrfToken()
  clearSessionToken()
}
