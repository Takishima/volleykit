/**
 * HTTP transport layer for API communication.
 *
 * Encapsulates the generic fetch logic, session management, and error handling
 * used by the real API client. Separated from endpoint definitions to improve
 * testability and make the transport mechanism independently configurable.
 */

import { HttpStatus } from '@/shared/utils/constants'

import { API_BASE_URL } from './constants'
import { parseErrorResponse } from './error-handling'
import { buildFormData } from './form-serialization'
import { captureSessionToken, getSessionHeaders, clearSession } from './session'

if (!import.meta.env.DEV && !API_BASE_URL) {
  console.warn('VITE_API_PROXY_URL is not configured for production. API calls will fail.')
}

/**
 * Generic fetch wrapper for API requests.
 *
 * Handles URL construction, header management, session tokens, CSRF,
 * error responses, and stale session detection.
 *
 * @param endpoint - API path relative to the base URL
 * @param method - HTTP method
 * @param body - Request body (form-encoded for POST/PUT, query params for GET)
 * @param requestContentType - Override Content-Type header
 * @returns Parsed JSON response
 */
export async function apiRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: Record<string, unknown>,
  requestContentType?: string
): Promise<T> {
  let url = `${API_BASE_URL}${endpoint}`

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...getSessionHeaders(),
  }

  if (method === 'GET' && body) {
    const params = buildFormData(body, { includeCsrfToken: false })
    url = `${url}?${params.toString()}`
  }

  if (method !== 'GET' && body) {
    headers['Content-Type'] = requestContentType ?? 'application/x-www-form-urlencoded'
  }

  const response = await fetch(url, {
    method,
    headers,
    credentials: 'include',
    // Explicitly convert URLSearchParams to string to ensure correct serialization
    // on iOS Safari PWA where passing URLSearchParams with a non-default Content-Type
    // (e.g. text/plain) may result in an empty or malformed request body.
    body: method !== 'GET' && body ? buildFormData(body).toString() : undefined,
  })

  // Capture session token from response headers (iOS Safari PWA)
  captureSessionToken(response)

  if (!response.ok) {
    if (
      response.status === HttpStatus.UNAUTHORIZED ||
      response.status === HttpStatus.FORBIDDEN ||
      response.status === HttpStatus.NOT_ACCEPTABLE
    ) {
      clearSession()
      throw new Error('Session expired. Please log in again.')
    }
    const errorMessage = await parseErrorResponse(response)
    throw new Error(`${method} ${endpoint}: ${errorMessage}`)
  }

  const contentType = response.headers.get('Content-Type') || ''

  // Try to parse JSON first, regardless of Content-Type header.
  // The API sometimes returns JSON with incorrect Content-Type: text/html header.
  try {
    return await response.json()
  } catch {
    // JSON parsing failed - now check if this looks like a stale session
    // Detect stale session: when the API returns HTML instead of JSON with status 200,
    // it means the session expired and the server is returning a login page.
    if (contentType.includes('text/html')) {
      // Check if pathname ends with "/login" to avoid false positives on paths
      // like "/api/v2/login-history" or "/user/login-preferences"
      const pathname = new URL(response.url).pathname.toLowerCase()
      const isLoginPage = pathname === '/login' || pathname.endsWith('/login')
      if (isLoginPage) {
        clearSession()
        throw new Error('Session expired. Please log in again.')
      }
    }

    throw new Error(
      `${method} ${endpoint}: Invalid JSON response (Content-Type: ${contentType || 'unknown'}, status: ${response.status})`
    )
  }
}
