/**
 * Common response header generators for the VolleyKit CORS Proxy Worker.
 *
 * Kept as a leaf module (no imports from the utils barrel or middleware) so
 * both can depend on it without creating an import cycle.
 */

import { CAPTURE_SESSION_TOKEN_HEADER, CORS_PREFLIGHT_MAX_AGE_SECONDS } from './constants'

/**
 * Security headers to protect against common web vulnerabilities.
 */
export function securityHeaders(): HeadersInit {
  return {
    'Content-Security-Policy':
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'",
    'X-Frame-Options': 'SAMEORIGIN',
    'X-Content-Type-Options': 'nosniff',
    // X-XSS-Protection set to '0' per MDN recommendation:
    // '1; mode=block' is deprecated and can introduce timing side-channel attacks.
    // Modern CSP headers make the XSS auditor redundant.
    'X-XSS-Protection': '0',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    // HSTS: enforce HTTPS for 1 year including subdomains
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    // Restrict browser features not used by the proxy
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    // Prevent cross-origin window references
    'Cross-Origin-Opener-Policy': 'same-origin',
  }
}

export function corsHeaders(origin: string): HeadersInit {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    // X-Session-Token is used for iOS Safari PWA cookie relay - see SESSION_TOKEN_HEADER
    // X-Capture-Session-Token is used to request session token capture from redirect responses
    // These headers bypass iOS Safari's ITP which blocks third-party cookies in PWA mode
    'Access-Control-Allow-Headers': `Content-Type, Accept, X-Session-Token, ${CAPTURE_SESSION_TOKEN_HEADER}`,
    // Expose X-Session-Token so JavaScript can read the session cookie relay
    'Access-Control-Expose-Headers': 'X-Session-Token, Content-Disposition',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': String(CORS_PREFLIGHT_MAX_AGE_SECONDS),
  }
}
