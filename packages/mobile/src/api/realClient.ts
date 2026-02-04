/**
 * Real API client for mobile app.
 *
 * Implements the mobile API client interface using the actual backend API.
 * Uses the same endpoints and form serialization as the web app.
 *
 * Resolves TODO(#775): Replace mock API client with real implementation.
 */

import Constants from 'expo-constants'

import type {
  SearchConfiguration,
  Assignment,
  CompensationRecord,
  GameExchange,
} from '@volleykit/shared/api'
import {
  buildFormData,
  ASSIGNMENT_PROPERTIES,
  EXCHANGE_PROPERTIES,
  COMPENSATION_PROPERTIES,
} from '@volleykit/shared/api'

import { SESSION_TOKEN_HEADER } from '../constants'

/**
 * API base URL for requests.
 * Uses the CORS proxy configured in app.json extra settings.
 */
const API_BASE_URL =
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ?? 'https://proxy.volleykit.app'

/**
 * In-memory session token storage.
 * Managed by the auth service, shared here for API requests.
 */
let sessionToken: string | null = null

/**
 * CSRF token for state-changing requests.
 * Extracted from the login response.
 */
let csrfToken: string | null = null

/**
 * Set the session token (called by auth service).
 */
export function setSessionToken(token: string | null): void {
  sessionToken = token
}

/**
 * Get the current session token.
 */
export function getSessionToken(): string | null {
  return sessionToken
}

/**
 * Set the CSRF token (called by auth service after login).
 */
export function setCsrfToken(token: string | null): void {
  csrfToken = token
}

/**
 * Clear all tokens (called on logout).
 */
export function clearTokens(): void {
  sessionToken = null
  csrfToken = null
}

/**
 * Get session headers for API requests.
 */
function getSessionHeaders(): Record<string, string> {
  return sessionToken ? { [SESSION_TOKEN_HEADER]: sessionToken } : {}
}

/**
 * Capture session token from response headers.
 */
function captureSessionToken(response: Response): void {
  const token = response.headers.get(SESSION_TOKEN_HEADER)
  if (token) {
    sessionToken = token
  }
}

/**
 * Build form data with CSRF token for mobile.
 */
function buildFormDataWithToken(
  data: Record<string, unknown>,
  options: { includeCsrfToken?: boolean } = {}
): URLSearchParams {
  const { includeCsrfToken = true } = options
  return buildFormData(data, {
    csrfToken: includeCsrfToken ? csrfToken : null,
  })
}

/**
 * HTTP status codes for error handling.
 */
const HttpStatus = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_ACCEPTABLE: 406,
} as const

/**
 * Generic fetch wrapper for API requests.
 */
async function apiRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: Record<string, unknown>
): Promise<T> {
  let url = `${API_BASE_URL}${endpoint}`

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...getSessionHeaders(),
  }

  if (method === 'GET' && body) {
    const params = buildFormDataWithToken(body, { includeCsrfToken: false })
    url = `${url}?${params.toString()}`
  }

  if (method !== 'GET' && body) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded'
  }

  const response = await fetch(url, {
    method,
    headers,
    credentials: 'include',
    body: method !== 'GET' && body ? buildFormDataWithToken(body) : undefined,
  })

  captureSessionToken(response)

  if (!response.ok) {
    if (
      response.status === HttpStatus.UNAUTHORIZED ||
      response.status === HttpStatus.FORBIDDEN ||
      response.status === HttpStatus.NOT_ACCEPTABLE
    ) {
      clearTokens()
      throw new Error('Session expired. Please log in again.')
    }
    throw new Error(`${method} ${endpoint}: ${response.status} ${response.statusText}`)
  }

  const contentType = response.headers.get('Content-Type') || ''

  try {
    return await response.json()
  } catch {
    if (contentType.includes('text/html')) {
      const pathname = new URL(response.url).pathname.toLowerCase()
      const isLoginPage = pathname === '/login' || pathname.endsWith('/login')
      if (isLoginPage) {
        clearTokens()
        throw new Error('Session expired. Please log in again.')
      }
    }
    throw new Error(
      `${method} ${endpoint}: Invalid JSON response (Content-Type: ${contentType || 'unknown'})`
    )
  }
}

/**
 * Assignments response from API.
 */
interface AssignmentsResponse {
  items?: Assignment[]
  totalItemsCount?: number
}

/**
 * Exchanges response from API.
 */
interface ExchangesResponse {
  items?: GameExchange[]
  totalItemsCount?: number
}

/**
 * Compensations response from API.
 */
interface CompensationsResponse {
  items?: CompensationRecord[]
  totalItemsCount?: number
}

/**
 * Real API client for mobile.
 *
 * Implements the same interface as the mock client but makes real API calls.
 */
export const realApiClient = {
  /**
   * Search assignments with optional filtering.
   */
  async searchAssignments(
    config: SearchConfiguration = {}
  ): Promise<{ items: Assignment[]; totalItemsCount: number }> {
    const data = await apiRequest<AssignmentsResponse>(
      '/indoorvolleyball.refadmin/api%5crefereeconvocation/searchMyRefereeConvocations',
      'POST',
      {
        searchConfiguration: config,
        propertyRenderConfiguration: ASSIGNMENT_PROPERTIES,
      }
    )
    return {
      items: data.items ?? [],
      totalItemsCount: data.totalItemsCount ?? 0,
    }
  },

  /**
   * Get assignment details by ID.
   */
  async getAssignmentDetails(id: string): Promise<Assignment> {
    const query = new URLSearchParams()
    query.set('convocation', id)
    ASSIGNMENT_PROPERTIES.forEach((prop, i) => query.set(`nestedPropertyNames[${i}]`, prop))

    return apiRequest<Assignment>(
      `/indoorvolleyball.refadmin/api%5crefereeconvocation/showWithNestedObjects?${query}`
    )
  },

  /**
   * Search exchanges with optional filtering.
   */
  async searchExchanges(
    config: SearchConfiguration = {}
  ): Promise<{ items: GameExchange[]; totalItemsCount: number }> {
    const data = await apiRequest<ExchangesResponse>(
      '/indoorvolleyball.refadmin/api%5crefereegameexchange/search',
      'POST',
      {
        searchConfiguration: config,
        propertyRenderConfiguration: EXCHANGE_PROPERTIES,
      }
    )
    return {
      items: data.items ?? [],
      totalItemsCount: data.totalItemsCount ?? 0,
    }
  },

  /**
   * Search compensations with optional filtering.
   */
  async searchCompensations(
    config: SearchConfiguration = {}
  ): Promise<{ items: CompensationRecord[]; totalItemsCount: number }> {
    const data = await apiRequest<CompensationsResponse>(
      '/indoorvolleyball.refadmin/api%5crefereeconvocationcompensation/search',
      'POST',
      {
        searchConfiguration: config,
        propertyRenderConfiguration: COMPENSATION_PROPERTIES,
      }
    )
    return {
      items: data.items ?? [],
      totalItemsCount: data.totalItemsCount ?? 0,
    }
  },

  /**
   * Add an assignment to the exchange marketplace.
   * This puts your own assignment on the exchange so another referee can take it over.
   */
  async addToExchange(convocationId: string): Promise<void> {
    await apiRequest(
      '/indoorvolleyball.refadmin/api%5crefereeconvocation/putRefereeConvocationIntoRefereeGameExchange',
      'POST',
      {
        refereeConvocation: convocationId,
      }
    )
  },

  /**
   * Apply for (pick) an exchange - take over the assignment from another referee.
   */
  async applyForExchange(exchangeId: string): Promise<void> {
    await apiRequest(
      '/indoorvolleyball.refadmin/api%5crefereegameexchange/pickFromRefereeGameExchange',
      'PUT',
      {
        'refereeGameExchange[__identity]': exchangeId,
      }
    )
  },

  /**
   * Remove own assignment from the exchange marketplace.
   * Uses convocation ID to identify the exchange to remove.
   */
  async removeOwnExchange(convocationId: string): Promise<void> {
    await apiRequest(
      '/indoorvolleyball.refadmin/api%5crefereeconvocation/deleteFromRefereeGameExchange',
      'POST',
      {
        'refereeConvocations[0][__identity]': convocationId,
      }
    )
  },

  /**
   * Update compensation record (travel expenses).
   */
  async updateCompensation(
    compensationId: string,
    data: { distanceInMetres?: number; correctionReason?: string }
  ): Promise<void> {
    // Build the compensation update object
    const convocationCompensation: Record<string, unknown> = {
      __identity: compensationId,
    }

    if (data.distanceInMetres !== undefined) {
      convocationCompensation.distanceInMetres = data.distanceInMetres
    }

    if (data.correctionReason !== undefined) {
      convocationCompensation.correctionReason = data.correctionReason
    }

    await apiRequest('/indoorvolleyball.refadmin/api%5cconvocationcompensation', 'PUT', {
      convocationCompensation,
    })
  },
}

export type RealApiClient = typeof realApiClient
