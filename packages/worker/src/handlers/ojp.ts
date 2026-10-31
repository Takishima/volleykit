import type { Env } from '../types'
import {
  corsHeaders,
  securityHeaders,
  validateOriginAndPreflight,
  checkRateLimit,
} from '../middleware'
import { BYTES_PER_KB, HttpStatus } from '../utils'

/** Maximum request body size for OJP requests in kilobytes */
const OJP_MAX_BODY_SIZE_KB = 64

/** Maximum request body size for OJP requests (64 KB) */
const OJP_MAX_BODY_SIZE_BYTES = OJP_MAX_BODY_SIZE_KB * BYTES_PER_KB

/** Retry-After duration (seconds) when the OJP endpoint is rate limited */
const OJP_RATE_LIMIT_RETRY_SECONDS = 60

/**
 * Handle /ojp - proxy requests to Swiss public transport OJP 2.0 API.
 * Keeps the API key server-side instead of exposing it in the client bundle.
 */
export async function handleOjp(request: Request, env: Env, _url: URL): Promise<Response> {
  const check = validateOriginAndPreflight(request, env)
  if (check.response) return check.response
  const origin = check.origin

  // Rate limiting for OJP endpoint
  const rateLimitResponse = await checkRateLimit(env, request, origin, OJP_RATE_LIMIT_RETRY_SECONDS)
  if (rateLimitResponse) return rateLimitResponse

  // Only allow POST for OJP
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: HttpStatus.METHOD_NOT_ALLOWED,
      headers: {
        'Content-Type': 'application/json',
        Allow: 'POST',
        ...corsHeaders(origin),
        ...securityHeaders(),
      },
    })
  }

  // Check if OJP API key is configured
  if (!env.OJP_API_KEY) {
    return new Response(JSON.stringify({ error: 'OJP service not configured' }), {
      status: HttpStatus.SERVICE_UNAVAILABLE,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(origin),
        ...securityHeaders(),
      },
    })
  }

  try {
    // Forward the request body to OJP API with server-side auth
    const ojpBody = await request.text()

    // Validate body size to prevent abuse (OJP XML requests are typically a few KB)
    if (ojpBody.length > OJP_MAX_BODY_SIZE_BYTES) {
      return new Response(JSON.stringify({ error: 'Request body too large' }), {
        status: HttpStatus.PAYLOAD_TOO_LARGE,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders(origin),
          ...securityHeaders(),
        },
      })
    }

    const ojpResponse = await fetch('https://api.opentransportdata.swiss/ojp20', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.OJP_API_KEY}`,
        'Content-Type': request.headers.get('Content-Type') || 'application/xml',
      },
      body: ojpBody,
    })

    if (!ojpResponse.ok) {
      const errorText = await ojpResponse.text()
      console.error('OJP API error:', ojpResponse.status, errorText)

      if (ojpResponse.status === HttpStatus.UNAUTHORIZED) {
        return new Response(JSON.stringify({ error: 'OJP service authentication failed' }), {
          status: HttpStatus.SERVICE_UNAVAILABLE,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders(origin),
            ...securityHeaders(),
          },
        })
      }

      if (ojpResponse.status === HttpStatus.TOO_MANY_REQUESTS) {
        return new Response(JSON.stringify({ error: 'OJP service rate limit exceeded' }), {
          status: HttpStatus.TOO_MANY_REQUESTS,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(OJP_RATE_LIMIT_RETRY_SECONDS),
            ...corsHeaders(origin),
            ...securityHeaders(),
          },
        })
      }

      return new Response(JSON.stringify({ error: 'OJP request failed' }), {
        status: HttpStatus.BAD_GATEWAY,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders(origin),
          ...securityHeaders(),
        },
      })
    }

    // Return the OJP API response
    const ojpResult = await ojpResponse.text()
    return new Response(ojpResult, {
      status: HttpStatus.OK,
      headers: {
        'Content-Type': ojpResponse.headers.get('Content-Type') || 'application/xml',
        ...corsHeaders(origin),
        ...securityHeaders(),
      },
    })
  } catch (error) {
    console.error('OJP proxy error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error during OJP request' }), {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(origin),
        ...securityHeaders(),
      },
    })
  }
}
