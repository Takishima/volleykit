/**
 * Session detection for the VolleyKit CORS Proxy Worker.
 */

import {
  HTTP_REDIRECT_STATUS_MAX_EXCLUSIVE,
  HTTP_REDIRECT_STATUS_MIN,
  HttpStatus,
} from './constants'

/**
 * Response-like interface for session detection.
 * Used to allow testing without full Response objects.
 */
export interface SessionCheckResponse {
  status: number
  headers: { get: (name: string) => string | null }
}

/**
 * Check if the response appears to be from an expired or invalid session.
 * The upstream server may return a login redirect or error page when
 * the session has expired, which we should detect and not cache.
 */
export function detectSessionIssue(response: SessionCheckResponse, responseBody?: string): boolean {
  if (
    response.status >= HTTP_REDIRECT_STATUS_MIN &&
    response.status < HTTP_REDIRECT_STATUS_MAX_EXCLUSIVE
  ) {
    const location = response.headers.get('Location')
    if (location) {
      const normalizedLocation = location.toLowerCase()
      if (
        normalizedLocation.includes('/login') ||
        normalizedLocation.endsWith('/') ||
        normalizedLocation.includes('authentication')
      ) {
        return true
      }
    }
  }

  if (response.status === HttpStatus.UNAUTHORIZED || response.status === HttpStatus.FORBIDDEN) {
    return true
  }

  if (responseBody) {
    const lowerBody = responseBody.toLowerCase()
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
