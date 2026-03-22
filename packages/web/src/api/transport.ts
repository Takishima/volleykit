/**
 * HTTP transport layer for API communication.
 *
 * Encapsulates the generic fetch logic, session management, and error handling
 * used by the real API client. Separated from endpoint definitions to improve
 * testability and make the transport mechanism independently configurable.
 *
 * All API requests should flow through these functions to ensure consistent
 * session token capture, error handling, and stale-session detection.
 */

import { HttpStatus } from '@/common/utils/constants'

import { parseErrorResponse } from './error-handling'
import { buildFormData } from './form-serialization'
import { NetworkError, ServiceUnavailableError } from './network-errors'
import { getApiBaseUrl, reportProxyFailure, reportProxySuccess } from './proxy-resilience'
import { captureSessionToken, getSessionHeaders, clearSession } from './session'

if (!import.meta.env.DEV && !getApiBaseUrl()) {
  console.warn('VITE_API_PROXY_URL is not configured for production. API calls will fail.')
}

/**
 * Shared error handling for all transport functions.
 * Handles session expiry detection, error parsing, and session token capture.
 */
async function handleResponse(response: Response, method: string, endpoint: string): Promise<void> {
  // Capture session token from response headers (iOS Safari PWA)
  captureSessionToken(response)

  if (!response.ok) {
    // 401/403 are standard auth failures. 406 (NOT_ACCEPTABLE) is also treated as
    // session expiry because the VolleyManager API returns 406 when the session cookie
    // is stale/invalid. Applied uniformly across all transport functions for consistency.
    if (
      response.status === HttpStatus.UNAUTHORIZED ||
      response.status === HttpStatus.FORBIDDEN ||
      response.status === HttpStatus.NOT_ACCEPTABLE
    ) {
      clearSession()
      throw new Error('Session expired. Please log in again.')
    }

    // 503 Service Unavailable — typically the Worker kill switch is active.
    // Throw a typed error so the UI can show a specific "service unavailable" message
    // directing users to volleymanager.volleyball.ch.
    if (response.status === HttpStatus.SERVICE_UNAVAILABLE) {
      throw new ServiceUnavailableError()
    }

    const errorMessage = await parseErrorResponse(response)
    throw new Error(`${method} ${endpoint}: ${errorMessage}`)
  }
}

/**
 * Wraps a fetch call to convert network-level TypeError into a typed NetworkError.
 * Distinguishes "device is offline" from "server is unreachable" for better UX.
 */
async function fetchWithNetworkErrorHandling(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  try {
    return await fetch(input, init)
  } catch (error) {
    // TypeError is thrown by fetch() for network failures (DNS, connection refused, etc.)
    if (error instanceof TypeError) {
      throw new NetworkError(navigator.onLine)
    }
    throw error
  }
}

/**
 * Wraps an API call with proxy failover. If the request fails with a network error,
 * reports the failure and retries once with the rotated proxy URL (if available).
 */
async function fetchWithProxyFailover<T>(fn: (baseUrl: string) => Promise<T>): Promise<T> {
  const baseUrl = getApiBaseUrl()
  try {
    const result = await fn(baseUrl)
    reportProxySuccess()
    return result
  } catch (error) {
    if (error instanceof NetworkError && error.isOnline) {
      const rotated = reportProxyFailure()
      if (rotated) {
        return fn(getApiBaseUrl())
      }
    }
    throw error
  }
}

/**
 * Parse a JSON response, detecting stale sessions that return HTML login pages.
 */
function parseJsonResponse<T>(response: Response, method: string, endpoint: string): Promise<T> {
  const contentType = response.headers.get('Content-Type') || ''

  // Try to parse JSON first, regardless of Content-Type header.
  // The API sometimes returns JSON with incorrect Content-Type: text/html header.
  return response.json().catch(() => {
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
  })
}

/**
 * Generic fetch wrapper for API requests with form-encoded bodies.
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
  return fetchWithProxyFailover(async (baseUrl) => {
    let url = `${baseUrl}${endpoint}`

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

    const response = await fetchWithNetworkErrorHandling(url, {
      method,
      headers,
      credentials: 'include',
      // Explicitly convert URLSearchParams to string to ensure correct serialization
      // on iOS Safari PWA where passing URLSearchParams with a non-default Content-Type
      // (e.g. text/plain) may result in an empty or malformed request body.
      body: method !== 'GET' && body ? buildFormData(body).toString() : undefined,
    })

    await handleResponse(response, method, endpoint)
    return parseJsonResponse<T>(response, method, endpoint)
  })
}

/**
 * Send a multipart/form-data request (e.g. file uploads).
 *
 * Unlike apiRequest, this accepts a pre-built FormData body and does not
 * set Content-Type (the browser sets it with the correct boundary).
 *
 * @param endpoint - API path relative to the base URL
 * @param formData - FormData body
 * @returns Parsed JSON response
 */
export async function apiRequestFormData<T>(endpoint: string, formData: FormData): Promise<T> {
  return fetchWithProxyFailover(async (baseUrl) => {
    const url = `${baseUrl}${endpoint}`

    const response = await fetchWithNetworkErrorHandling(url, {
      method: 'POST',
      credentials: 'include',
      headers: getSessionHeaders(),
      body: formData,
    })

    await handleResponse(response, 'POST', endpoint)
    return parseJsonResponse<T>(response, 'POST', endpoint)
  })
}

/**
 * Send a request that returns no meaningful body (void response).
 *
 * Handles session tokens, error responses, and custom content types.
 * Does not attempt to parse the response body.
 *
 * @param endpoint - API path relative to the base URL
 * @param method - HTTP method
 * @param body - URL-encoded body string
 * @param contentType - Content-Type header value
 */
export async function apiRequestVoid(
  endpoint: string,
  method: 'POST' | 'PUT' | 'DELETE',
  body: string,
  contentType: string = 'application/x-www-form-urlencoded'
): Promise<void> {
  return fetchWithProxyFailover(async (baseUrl) => {
    const url = `${baseUrl}${endpoint}`

    const response = await fetchWithNetworkErrorHandling(url, {
      method,
      headers: {
        Accept: 'application/json',
        'Content-Type': contentType,
        ...getSessionHeaders(),
      },
      credentials: 'include',
      body,
    })

    await handleResponse(response, method, endpoint)
  })
}
