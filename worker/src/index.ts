/**
 * VolleyKit CORS Proxy Worker
 *
 * Proxies requests to volleymanager.volleyball.ch with proper CORS headers
 * to allow the web app to make authenticated API calls.
 *
 * Rate Limiting:
 * This worker should be protected by Cloudflare's Rate Limiting rules configured
 * in the Cloudflare dashboard or wrangler.toml. In-memory rate limiting would not
 * work reliably across worker instances. Recommended: 100 requests/minute per IP.
 *
 * @see https://developers.cloudflare.com/waf/rate-limiting-rules/
 */

import type { Env } from './types'
import { securityHeaders } from './middleware'
import { validateOriginAndPreflight } from './middleware'
import {
  KILL_SWITCH_RETRY_AFTER_SECONDS,
  parseAllowedOrigins,
  validateAllowedOrigins,
} from './utils'

import { handleRobots } from './handlers/robots'
import { handleVersion } from './handlers/version'
import { handleHealth } from './handlers/health'
import { handleOcr } from './handlers/ocr'
import { handleOjp } from './handlers/ojp'
import { handleICal } from './handlers/ical'
import { handleProxy } from './handlers/proxy'

function validateEnv(env: Env): void {
  if (!env.ALLOWED_ORIGINS || env.ALLOWED_ORIGINS.trim() === '') {
    throw new Error('ALLOWED_ORIGINS environment variable is required')
  }
  if (!env.TARGET_HOST || env.TARGET_HOST.trim() === '') {
    throw new Error('TARGET_HOST environment variable is required')
  }
  try {
    new URL(env.TARGET_HOST)
  } catch {
    throw new Error('TARGET_HOST must be a valid URL')
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    // Robots.txt - prevent search engine indexing of the proxy
    // This is placed before the kill switch so search engines can always fetch it
    if (url.pathname === '/robots.txt') {
      return handleRobots(request, env, url)
    }

    // Version endpoint - public, before kill switch
    if (url.pathname === '/version') {
      return handleVersion(request, env, url)
    }

    // Kill switch - immediately disable proxy if requested by Swiss Volley
    if (env.KILL_SWITCH === 'true') {
      return new Response(
        'Service temporarily unavailable. Please use volleymanager.volleyball.ch directly.',
        {
          status: 503,
          headers: {
            'Content-Type': 'text/plain',
            'Retry-After': String(KILL_SWITCH_RETRY_AFTER_SECONDS),
            ...securityHeaders(),
          },
        }
      )
    }

    // Health check endpoint
    if (url.pathname === '/health') {
      return handleHealth(request, env, url)
    }

    // OCR endpoint - proxy to Mistral OCR API
    if (url.pathname === '/ocr') {
      return handleOcr(request, env, url)
    }

    // OJP proxy endpoint - Swiss public transport OJP 2.0 API
    if (url.pathname === '/ojp') {
      return handleOjp(request, env, url)
    }

    // Rate limiting check (100 requests per minute per IP)
    // Uses Cloudflare's Rate Limiter binding configured in wrangler.toml
    // CF-Connecting-IP is always present in production (set by Cloudflare edge).
    // Skip rate limiting if absent (test/dev only) to avoid a shared 'unknown' bucket.
    if (env.RATE_LIMITER) {
      const clientIP = request.headers.get('CF-Connecting-IP')
      if (!clientIP) {
        console.warn('CF-Connecting-IP header missing — skipping rate limit')
      }
      const { success } = clientIP
        ? await env.RATE_LIMITER.limit({ key: clientIP })
        : { success: true }

      if (!success) {
        return new Response('Too Many Requests', {
          status: 429,
          headers: {
            'Content-Type': 'text/plain',
            'Retry-After': '60',
            ...securityHeaders(),
          },
        })
      }
    }

    // Validate environment variables
    let allowedOrigins: string[]
    try {
      validateEnv(env)
      allowedOrigins = parseAllowedOrigins(env.ALLOWED_ORIGINS)
      validateAllowedOrigins(allowedOrigins)
    } catch (error) {
      console.error('Configuration error:', error)
      return new Response('Server configuration error', {
        status: 500,
        headers: { 'Content-Type': 'text/plain' },
      })
    }

    // Validate origin and handle CORS preflight
    const check = validateOriginAndPreflight(request, env)
    if (check.response) return check.response
    const origin = check.origin

    // Handle iCal proxy route: GET/HEAD /iCal/referee/:code
    const iCalResponse = await handleICal(request, env, url, origin)
    if (iCalResponse) return iCalResponse

    // Main CORS proxy - forward to volleymanager
    return handleProxy(request, env, url, origin)
  },
}
