/**
 * Shared middleware helpers for the VolleyKit CORS Proxy Worker.
 * Provides origin validation, CORS preflight handling, rate limiting,
 * and common header generators.
 */

import type { Env } from './types'
import {
  CAPTURE_SESSION_TOKEN_HEADER,
  CORS_PREFLIGHT_MAX_AGE_SECONDS,
  isAllowedOrigin,
  parseAllowedOrigins,
} from './utils'

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

/**
 * Result of origin validation and preflight handling.
 * - If `response` is set, return it immediately (error or preflight response).
 * - If `origin` is set, the request is valid and the origin string is available.
 */
export type OriginCheckResult =
  | { response: Response; origin?: undefined }
  | { response?: undefined; origin: string }

/**
 * Validate the request origin against allowed origins and handle OPTIONS preflight.
 * Returns either a Response to send immediately, or the validated origin string.
 */
export function validateOriginAndPreflight(request: Request, env: Env): OriginCheckResult {
  const origin = request.headers.get('Origin')
  let allowedOrigins: string[]
  try {
    allowedOrigins = parseAllowedOrigins(env.ALLOWED_ORIGINS)
  } catch {
    return {
      response: new Response('Server configuration error', {
        status: 500,
        headers: { 'Content-Type': 'text/plain' },
      }),
    }
  }

  if (!isAllowedOrigin(origin, allowedOrigins)) {
    const errorHeaders: HeadersInit = {
      'Content-Type': 'text/plain',
      ...securityHeaders(),
    }
    if (origin) {
      Object.assign(errorHeaders, corsHeaders(origin))
    }
    return {
      response: new Response('Forbidden: Origin not allowed', {
        status: 403,
        headers: errorHeaders,
      }),
    }
  }

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return {
      response: new Response(null, {
        status: 204,
        headers: corsHeaders(origin!),
      }),
    }
  }

  return { origin: origin! }
}

/**
 * Check rate limiting for the current request.
 * Returns a 429 Response if rate limited, or null if the request should proceed.
 *
 * CF-Connecting-IP is always present in production (set by Cloudflare edge).
 * Skip rate limiting if absent (test/dev only) to avoid a shared 'unknown' bucket.
 */
export async function checkRateLimit(
  env: Env,
  request: Request,
  origin: string,
  retryAfterSeconds: number
): Promise<Response | null> {
  if (!env.RATE_LIMITER) return null

  const clientIP = request.headers.get('CF-Connecting-IP')
  if (!clientIP) {
    console.warn('CF-Connecting-IP header missing — skipping rate limit')
  }
  const { success } = clientIP ? await env.RATE_LIMITER.limit({ key: clientIP }) : { success: true }

  if (!success) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfterSeconds),
        ...corsHeaders(origin),
        ...securityHeaders(),
      },
    })
  }

  return null
}
