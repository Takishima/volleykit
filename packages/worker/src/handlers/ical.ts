import type { Env } from '../types'
import { corsHeaders, securityHeaders } from '../middleware'
import { extractICalCode, getUserAgent, isValidICalCode } from '../utils'

/**
 * Handle iCal proxy route: GET/HEAD /iCal/referee/:code
 * This is a public endpoint that proxies to volleymanager's iCal feed.
 * HEAD is used by the client to validate calendar codes exist without downloading content.
 *
 * Returns null if the path does not match the iCal pattern (so the router can proceed).
 */
export async function handleICal(
  request: Request,
  env: Env,
  url: URL,
  origin: string
): Promise<Response | null> {
  const iCalCode = extractICalCode(url.pathname)
  if (iCalCode === null) return null

  // Only allow GET and HEAD requests for iCal
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: {
        'Content-Type': 'text/plain',
        Allow: 'GET, HEAD',
        ...corsHeaders(origin),
        ...securityHeaders(),
      },
    })
  }

  // Validate code format (6 alphanumeric characters)
  if (!isValidICalCode(iCalCode)) {
    return new Response('Bad Request: Invalid calendar code format', {
      status: 400,
      headers: {
        'Content-Type': 'text/plain',
        ...corsHeaders(origin),
        ...securityHeaders(),
      },
    })
  }

  // Proxy to volleymanager iCal endpoint
  // Note: We always use GET for the upstream request, even for HEAD requests from clients.
  // This is because the upstream server may not support HEAD, and we need to verify the
  // calendar exists. For HEAD requests, we simply discard the response body.
  const iCalTargetUrl = `${env.TARGET_HOST}/indoor/iCal/referee/${iCalCode}`

  try {
    const iCalResponse = await fetch(iCalTargetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': getUserAgent(env),
        Accept: 'text/calendar',
      },
    })

    // Pass through 404 if not found
    if (iCalResponse.status === 404) {
      return new Response('Not Found: Calendar not found', {
        status: 404,
        headers: {
          'Content-Type': 'text/plain',
          ...corsHeaders(origin),
          ...securityHeaders(),
        },
      })
    }

    // Handle other error responses from upstream
    if (!iCalResponse.ok) {
      console.error('iCal upstream error:', iCalResponse.status, iCalResponse.statusText)
      return new Response('Bad Gateway: Upstream error', {
        status: 502,
        headers: {
          'Content-Type': 'text/plain',
          ...corsHeaders(origin),
          ...securityHeaders(),
        },
      })
    }

    // Return the iCal data with proper headers
    // For HEAD requests, return empty body (used for validation)
    const iCalBody = request.method === 'HEAD' ? null : await iCalResponse.text()
    return new Response(iCalBody, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Cache-Control': 'public, max-age=300', // 5 minutes
        ...corsHeaders(origin),
        ...securityHeaders(),
      },
    })
  } catch (error) {
    console.error('iCal proxy error:', error)
    return new Response('Bad Gateway: Unable to reach calendar service', {
      status: 502,
      headers: {
        'Content-Type': 'text/plain',
        ...corsHeaders(origin),
        ...securityHeaders(),
      },
    })
  }
}
