import type { Env, HeadersWithCookies } from '../types'
import { corsHeaders, securityHeaders } from '../middleware'
import {
  AUTH_ENDPOINT,
  CAPTURE_SESSION_TOKEN_HEADER,
  getUserAgent,
  detectSessionIssue,
  hasAuthCredentials,
  isAllowedPath,
  isDynamicContent,
  isPathSafe,
  noCacheHeaders,
  requiresApiPrefix,
  transformAuthFormData,
  // Auth lockout imports
  checkLockoutStatus,
  clearAuthLockout,
  getAuthLockoutState,
  isAuthRequest,
  isFailedLoginResponse,
  isSuccessfulLoginResponse,
  recordFailedAttempt,
  // Session relay imports
  SESSION_TOKEN_HEADER,
  extractSessionCookies,
  mergeSessionCookies,
} from '../utils'

/**
 * Handle the main CORS proxy route.
 * Proxies requests to volleymanager.volleyball.ch with proper CORS headers,
 * auth lockout, iOS Safari workarounds, and cookie rewriting.
 */
export async function handleProxy(
  request: Request,
  env: Env,
  url: URL,
  origin: string
): Promise<Response> {
  // Validate pathname for security (path traversal prevention)
  if (!isPathSafe(url.pathname)) {
    return new Response('Bad Request: Invalid path', {
      status: 400,
      headers: {
        'Content-Type': 'text/plain',
        ...corsHeaders(origin),
        ...securityHeaders(),
      },
    })
  }

  // Only proxy allowed paths
  if (!isAllowedPath(url.pathname)) {
    return new Response('Not Found: Path not proxied', {
      status: 404,
      headers: {
        'Content-Type': 'text/plain',
        ...corsHeaders(origin),
        ...securityHeaders(),
      },
    })
  }

  // Auth lockout check - block auth requests from locked-out IPs
  // This is tamper-proof as the state is stored server-side in KV
  // CF-Connecting-IP is always present in production (set by Cloudflare edge).
  // If absent (test/dev), auth lockout is skipped to avoid a shared 'unknown' bucket.
  const clientIP = request.headers.get('CF-Connecting-IP')
  const isAuthReq = isAuthRequest(url.pathname, request.method)

  if (isAuthReq && env.AUTH_LOCKOUT && clientIP) {
    const lockoutState = await getAuthLockoutState(env.AUTH_LOCKOUT, clientIP)
    const lockoutStatus = checkLockoutStatus(lockoutState)

    if (lockoutStatus.isLocked) {
      return new Response(
        JSON.stringify({
          error: 'Too many failed login attempts',
          lockedUntil: lockoutStatus.remainingSeconds,
          message: `Account locked. Try again in ${lockoutStatus.remainingSeconds} seconds.`,
        }),
        {
          status: 423, // 423 Locked
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(lockoutStatus.remainingSeconds),
            ...corsHeaders(origin),
            ...securityHeaders(),
          },
        }
      )
    }
  }

  // Build target URL
  // Extract the raw path + search from request URL to preserve URL encoding
  // This is critical for backslash (%5c) encoding required by TYPO3 Neos/Flow
  const requestUrlStr = request.url
  const pathStart = requestUrlStr.indexOf('/', requestUrlStr.indexOf('://') + 3)
  let rawPathAndSearch = pathStart >= 0 ? requestUrlStr.substring(pathStart) : '/'

  // iOS Safari workaround: Detect requests to /login with auth credentials
  // iOS Safari can trigger form submission with incorrect method (GET instead of POST)
  // or send to wrong endpoint. This rewrites such requests to the correct auth endpoint.
  let requestBody: string | null = null
  let methodOverride: string | null = null
  if (url.pathname === '/login' && (request.method === 'POST' || request.method === 'GET')) {
    // Check for auth credentials in body (POST) or query params (GET)
    if (
      request.method === 'POST' &&
      request.headers.get('Content-Type')?.includes('application/x-www-form-urlencoded')
    ) {
      // Clone the request to read the body (body can only be read once)
      const clonedRequest = request.clone()
      requestBody = await clonedRequest.text()

      if (hasAuthCredentials(requestBody)) {
        // Rewrite to correct auth endpoint (iOS Safari workaround)
        rawPathAndSearch = AUTH_ENDPOINT
        requestBody = transformAuthFormData(requestBody)
      }
    } else if (request.method === 'GET' && url.search) {
      // iOS Safari bug: form may submit as GET with credentials in query string
      // or with postData attached to GET (invalid HTTP, but Safari does it)
      const queryBody = url.search.slice(1) // Remove leading '?'
      if (hasAuthCredentials(queryBody)) {
        // Convert GET to POST and rewrite to correct auth endpoint (iOS Safari workaround)
        rawPathAndSearch = AUTH_ENDPOINT
        requestBody = transformAuthFormData(queryBody)
        methodOverride = 'POST'
      }
    }
  }

  // Prepend /api/ prefix for API endpoints
  // Note: We check the original pathname, not rawPathAndSearch, because iOS Safari
  // workaround may have rewritten rawPathAndSearch to AUTH_ENDPOINT
  const needsApiPrefix = requiresApiPrefix(url.pathname)
  const finalPath = needsApiPrefix ? `/api${rawPathAndSearch}` : rawPathAndSearch
  const targetUrl = new URL(finalPath, env.TARGET_HOST)

  // Forward the request
  // If we already read the body for iOS workaround detection, use it directly
  // methodOverride is used when converting GET to POST for iOS auth workaround
  const proxyRequest = new Request(targetUrl.toString(), {
    method: methodOverride ?? request.method,
    headers: request.headers,
    body: requestBody ?? request.body,
    redirect: 'manual', // Handle redirects manually to preserve cookies
  })

  // If we're overriding to POST, ensure Content-Type is set
  if (methodOverride === 'POST' && requestBody) {
    proxyRequest.headers.set('Content-Type', 'application/x-www-form-urlencoded')
  }

  // Remove headers that shouldn't be forwarded
  proxyRequest.headers.delete('Host')
  const targetHostUrl = new URL(env.TARGET_HOST)
  const targetHost = targetHostUrl.host
  const targetOrigin = targetHostUrl.origin
  proxyRequest.headers.set('Host', targetHost)

  // Rewrite Origin and Referer to match target host
  // The upstream Neos Flow server validates these for CSRF protection
  proxyRequest.headers.set('Origin', targetOrigin)

  const originalReferer = proxyRequest.headers.get('Referer')
  if (originalReferer) {
    try {
      const refererUrl = new URL(originalReferer)
      refererUrl.protocol = targetHostUrl.protocol
      refererUrl.host = targetHost
      // Strip query parameters from Referer - the upstream server may reject
      // requests with unknown query params like ?debug
      refererUrl.search = ''
      proxyRequest.headers.set('Referer', refererUrl.toString())
    } catch {
      // If Referer is malformed, set a safe default
      proxyRequest.headers.set('Referer', targetOrigin + '/')
    }
  }

  proxyRequest.headers.set('User-Agent', getUserAgent(env))

  // iOS Safari PWA cookie relay: convert X-Session-Token header to Cookie
  // This bypasses iOS Safari's ITP which blocks third-party cookies in PWA mode
  const sessionToken = request.headers.get(SESSION_TOKEN_HEADER)
  if (sessionToken) {
    const mergedCookies = mergeSessionCookies(proxyRequest.headers.get('Cookie'), sessionToken)
    if (mergedCookies) {
      proxyRequest.headers.set('Cookie', mergedCookies)
    }
  }

  // Record request start time for latency tracking
  const requestStartTime = Date.now()

  try {
    const response = await fetch(proxyRequest)

    // Track auth attempts for lockout
    // Must clone response to read body without consuming it
    let responseBodyForCheck: string | undefined
    if (isAuthReq && env.AUTH_LOCKOUT && clientIP) {
      // Clone response to read body for auth result detection
      const clonedResponse = response.clone()
      try {
        responseBodyForCheck = await clonedResponse.text()
      } catch {
        // If we can't read the body, continue without it
      }

      const isSuccess = isSuccessfulLoginResponse(response)
      const isFailed = isFailedLoginResponse(response, responseBodyForCheck)

      if (isSuccess) {
        // Clear lockout on successful login
        await clearAuthLockout(env.AUTH_LOCKOUT, clientIP)
      } else if (isFailed) {
        // Record failed attempt
        await recordFailedAttempt(env.AUTH_LOCKOUT, clientIP)
      }
    }

    // Create response with CORS headers
    const responseHeaders = new Headers(response.headers)

    // Add CORS and security headers
    Object.entries({ ...corsHeaders(origin), ...securityHeaders() }).forEach(([key, value]) => {
      responseHeaders.set(key, value)
    })

    // Apply cache control based on content type
    // Dynamic content (HTML, JSON) should never be cached to prevent stale data
    const contentType = response.headers.get('Content-Type')
    if (isDynamicContent(contentType)) {
      // Remove any upstream cache headers that could cause stale data
      responseHeaders.delete('ETag')
      responseHeaders.delete('Last-Modified')

      // Apply strict no-cache headers
      Object.entries(noCacheHeaders()).forEach(([key, value]) => {
        responseHeaders.set(key, value)
      })
    }

    // Add proxy timing header for debugging stale data issues
    // Format: timestamp when proxy processed request, latency in ms
    const latencyMs = Date.now() - requestStartTime
    responseHeaders.set('X-Proxy-Timestamp', `${new Date().toISOString()}; latency=${latencyMs}ms`)

    // Detect potential session issues for logging/debugging
    // This helps identify when cached responses might be from expired sessions
    if (detectSessionIssue(response)) {
      responseHeaders.set('X-Proxy-Session-Warning', 'potential-session-issue')
    }

    // Handle Set-Cookie headers for cross-origin
    // Must set SameSite=None; Secure for cross-origin cookies to work
    // Use getSetCookie() to handle multiple cookies (get() only returns first)
    const cookies = (response.headers as HeadersWithCookies).getSetCookie()
    if (cookies.length > 0) {
      // First, delete any existing Set-Cookie headers
      responseHeaders.delete('Set-Cookie')

      for (const cookie of cookies) {
        // Remove Domain, Secure, SameSite, and Partitioned - we'll add them back explicitly
        // This ensures consistent behavior regardless of original cookie format
        const modifiedCookie = cookie
          .replace(/Domain=[^;]+;?\s*/gi, '')
          .replace(/;\s*Secure\s*(;|$)/gi, '$1')
          .replace(/SameSite=[^;]+;?\s*/gi, '')
          .replace(/;\s*Partitioned\s*(;|$)/gi, '$1')

        // Add SameSite=None, Secure, and Partitioned for cross-origin compatibility
        // Partitioned (CHIPS) is required for iOS Safari's ITP to allow third-party cookies
        responseHeaders.append(
          'Set-Cookie',
          `${modifiedCookie}; SameSite=None; Secure; Partitioned`
        )
      }

      // iOS Safari PWA cookie relay: also send cookies as X-Session-Token header
      // This allows JavaScript to receive cookies even when ITP blocks Set-Cookie
      const extractedSessionToken = extractSessionCookies(cookies)
      if (extractedSessionToken) {
        responseHeaders.set(SESSION_TOKEN_HEADER, extractedSessionToken)
      }
    }

    // Handle redirects
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('Location')
      if (location) {
        // Rewrite redirect to go through proxy
        const redirectUrl = new URL(location, env.TARGET_HOST)
        if (redirectUrl.host === new URL(env.TARGET_HOST).host) {
          // Internal redirect - rewrite to proxy
          const proxyRedirect = new URL(request.url)
          proxyRedirect.pathname = redirectUrl.pathname
          proxyRedirect.search = redirectUrl.search

          // iOS Safari PWA fix: Convert redirects to 200 + JSON response in two cases:
          //
          // 1. POST auth requests - Always convert because iOS Safari PWA doesn't
          //    properly store cookies from redirect responses
          //
          // 2. Session capture requests - When client sends X-Capture-Session-Token header
          //    AND there's a session token to relay. We require both conditions because:
          //    - wantsSessionCapture alone would unnecessarily convert redirects that have
          //      no session token (e.g., if upstream didn't set a cookie)
          //    - hasSessionToken alone would convert all redirects with tokens, even when
          //      the client doesn't need special handling
          //    This allows capturing session tokens from redirect responses (which would
          //    otherwise be opaqueredirect with hidden headers when using redirect: 'manual')
          //
          // When using redirect: "manual", browsers return "opaqueredirect" which hides
          // all headers including Set-Cookie from JavaScript. By returning 200 with JSON,
          // the browser processes Set-Cookie normally and the client can read the session.
          const wantsSessionCapture = request.headers.get(CAPTURE_SESSION_TOKEN_HEADER) === 'true'
          const hasSessionToken = responseHeaders.has(SESSION_TOKEN_HEADER)
          const shouldConvertToJson =
            (isAuthReq && request.method === 'POST') || (wantsSessionCapture && hasSessionToken)

          if (shouldConvertToJson) {
            const isSuccess =
              isAuthReq && request.method === 'POST' ? isSuccessfulLoginResponse(response) : true // Session capture requests are informational
            responseHeaders.set('Content-Type', 'application/json')
            responseHeaders.delete('Location') // Remove redirect header
            return new Response(
              JSON.stringify({
                success: isSuccess,
                redirectUrl: proxyRedirect.toString(),
                // Include session token in body for redundancy
                // (also available in X-Session-Token header)
                sessionCaptured: hasSessionToken,
              }),
              {
                status: 200,
                headers: responseHeaders,
              }
            )
          }

          responseHeaders.set('Location', proxyRedirect.toString())
        }
      }
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    })
  } catch (error) {
    console.error('Proxy error:', error)
    return new Response('Proxy Error', {
      status: 502,
      headers: {
        'Content-Type': 'text/plain',
        ...corsHeaders(origin),
        ...securityHeaders(),
      },
    })
  }
}
