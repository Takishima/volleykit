/**
 * Login/auth detection functions for the VolleyKit CORS Proxy Worker.
 */

// =============================================================================
// Auth Detection Constants
// =============================================================================

/** The correct authentication endpoint */
export const AUTH_ENDPOINT = '/sportmanager.security/authentication/authenticate'

/** Form field name that indicates authentication credentials are present */
export const AUTH_USERNAME_FIELD =
  '__authentication[Neos][Flow][Security][Authentication][Token][UsernamePassword][username]'

// =============================================================================
// Auth Detection Functions
// =============================================================================

/**
 * Check if request body contains authentication credentials.
 * Detects both Neos Flow format and simple HTML form format.
 */
export function hasAuthCredentials(body: string): boolean {
  const encodedField = encodeURIComponent(AUTH_USERNAME_FIELD)
  if (body.includes(AUTH_USERNAME_FIELD) || body.includes(encodedField)) {
    return true
  }

  const params = new URLSearchParams(body)
  return params.has('username') && params.has('password')
}

/**
 * Transform simple form fields to Neos Flow authentication format.
 */
export function transformAuthFormData(body: string): string {
  const encodedField = encodeURIComponent(AUTH_USERNAME_FIELD)
  if (body.includes(AUTH_USERNAME_FIELD) || body.includes(encodedField)) {
    return body
  }

  const params = new URLSearchParams(body)
  const username = params.get('username')
  const password = params.get('password')

  if (!username || !password) {
    return body
  }

  const neosParams = new URLSearchParams()
  neosParams.set(
    '__authentication[Neos][Flow][Security][Authentication][Token][UsernamePassword][username]',
    username
  )
  neosParams.set(
    '__authentication[Neos][Flow][Security][Authentication][Token][UsernamePassword][password]',
    password
  )

  for (const [key, value] of params.entries()) {
    if (key !== 'username' && key !== 'password') {
      neosParams.set(key, value)
    }
  }

  return neosParams.toString()
}

/**
 * Check if a response indicates a failed login attempt.
 * The volleymanager API redirects back to login page on failure,
 * or returns HTML with error indicators.
 */
export function isFailedLoginResponse(
  response: { status: number; headers: { get: (name: string) => string | null } },
  responseBody?: string
): boolean {
  // Check for redirect back to login page
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get('Location')
    if (location) {
      const normalizedLocation = location.toLowerCase()
      // Redirect back to login indicates failure
      if (
        normalizedLocation.includes('/login') ||
        normalizedLocation.includes('authentication') ||
        normalizedLocation.endsWith('/')
      ) {
        return true
      }
    }
  }

  // Check for 401/403 responses
  if (response.status === 401 || response.status === 403) {
    return true
  }

  // Check response body for error indicators
  if (responseBody) {
    const lowerBody = responseBody.toLowerCase()
    // Look for error indicators in the HTML
    if (lowerBody.includes('color="error"') || lowerBody.includes('color: "error"')) {
      return true
    }
    // Check if we got a login form back (means credentials were rejected)
    if (
      lowerBody.includes('name="username"') &&
      lowerBody.includes('name="password"') &&
      lowerBody.includes('login')
    ) {
      return true
    }
  }

  return false
}

/**
 * Check if a response indicates a successful login.
 * Successful logins redirect to the dashboard (any path except login/auth pages).
 *
 * Logic: A 3xx redirect from auth that does NOT go back to login/auth pages
 * is considered successful. This is more robust than looking for specific
 * dashboard paths since the upstream server may redirect to various paths.
 */
export function isSuccessfulLoginResponse(response: {
  status: number
  headers: { get: (name: string) => string | null }
}): boolean {
  // Check for session cookies - if present, login succeeded regardless of redirect target
  // This is the most reliable indicator as the server sets session cookies on successful auth
  const setCookie = response.headers.get('Set-Cookie')
  const hasSessionCookie = setCookie && setCookie.toLowerCase().includes('neos_session')

  // Successful login results in a redirect to dashboard
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get('Location')

    // If session cookie is set, login succeeded even if redirecting to root
    // The server may redirect to / or /indoor/ after successful authentication
    if (hasSessionCookie) {
      return true
    }

    if (location) {
      const normalizedLocation = location.toLowerCase()

      // Failed login redirects back to login page or root
      // Check for patterns that indicate authentication failure
      if (
        normalizedLocation.endsWith('/login') ||
        normalizedLocation.includes('/login?') ||
        normalizedLocation.includes('/authentication') ||
        // Root path redirect without session cookie indicates session creation failed
        normalizedLocation.match(/^https?:\/\/[^/]+\/?$/)
      ) {
        return false
      }

      // Any other redirect from auth endpoint is considered success
      // This includes redirects to /indoor/, /sportmanager.volleyball/, etc.
      return true
    }
  }

  // 200 OK with session cookies also indicates success
  if (response.status === 200 && hasSessionCookie) {
    return true
  }

  return false
}

/**
 * Check if a request is an authentication request.
 */
export function isAuthRequest(pathname: string, method: string): boolean {
  // POST to /login or authentication endpoints
  if (method !== 'POST' && method !== 'GET') {
    return false
  }

  return pathname === '/login' || pathname.includes('sportmanager.security/authentication')
}
