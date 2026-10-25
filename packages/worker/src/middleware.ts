/**
 * Shared middleware helpers for the VolleyKit CORS Proxy Worker.
 * Provides origin validation, CORS preflight handling, rate limiting,
 * and common header generators.
 */

import type { Env } from './types'
import { isAllowedOrigin, parseAllowedOrigins } from './utils'
import { corsHeaders, securityHeaders } from './utils/headers'

export { corsHeaders, securityHeaders }

/**
 * Result of origin validation and preflight handling.
 * - If `response` is set, return it immediately (error or preflight response).
 * - If `origin` is set, the request is valid and the origin string is available.
 */
export type OriginCheckResult =
  { response: Response; origin?: undefined } | { response?: undefined; origin: string }

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
