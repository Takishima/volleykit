import type { Env } from '../types'
import {
  corsHeaders,
  securityHeaders,
  validateOriginAndPreflight,
  checkRateLimit,
} from '../middleware'

/** Maximum request body size for OJP requests (64 KB) */
const OJP_MAX_BODY_SIZE_BYTES = 64 * 1024

/**
 * Handle /ojp - proxy requests to Swiss public transport OJP 2.0 API.
 * Keeps the API key server-side instead of exposing it in the client bundle.
 */
export async function handleOjp(request: Request, env: Env, _url: URL): Promise<Response> {
  const check = validateOriginAndPreflight(request, env)
  if (check.response) return check.response
  const origin = check.origin

  // Rate limiting for OJP endpoint
  const rateLimitResponse = await checkRateLimit(env, request, origin, 60)
  if (rateLimitResponse) return rateLimitResponse

  // Only allow POST for OJP
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
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
      status: 503,
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
        status: 413,
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

      if (ojpResponse.status === 401) {
        return new Response(JSON.stringify({ error: 'OJP service authentication failed' }), {
          status: 503,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders(origin),
            ...securityHeaders(),
          },
        })
      }

      if (ojpResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'OJP service rate limit exceeded' }), {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '60',
            ...corsHeaders(origin),
            ...securityHeaders(),
          },
        })
      }

      return new Response(JSON.stringify({ error: 'OJP request failed' }), {
        status: 502,
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
      status: 200,
      headers: {
        'Content-Type': ojpResponse.headers.get('Content-Type') || 'application/xml',
        ...corsHeaders(origin),
        ...securityHeaders(),
      },
    })
  } catch (error) {
    console.error('OJP proxy error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error during OJP request' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(origin),
        ...securityHeaders(),
      },
    })
  }
}
