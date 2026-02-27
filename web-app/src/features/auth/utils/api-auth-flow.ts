/**
 * Real API authentication flow — login, logout, and session verification.
 *
 * This module contains all network-level logic for authenticating with the
 * SwissVolley VolleyManager backend. It handles:
 * - Credential-based login with CSRF token management
 * - Server-side session verification via dashboard fetch
 * - Logout by invalidating the server session
 * - iOS Safari PWA session token workarounds
 *
 * The auth store (auth.ts) delegates to these functions for real API mode.
 * Demo and calendar modes have their own flows in the store itself.
 */

import {
  apiClient,
  captureSessionToken,
  CAPTURE_SESSION_TOKEN_HEADER,
  clearSession,
  getSessionHeaders,
  getSessionToken,
  setCsrfToken,
} from '@/api/client'
import { API_BASE_URL } from '@/api/constants'
import {
  extractActivePartyFromHtml,
  type AttributeValue,
} from '@/features/auth/utils/active-party-parser'
import {
  extractLoginFormFields,
  extractCsrfTokenFromPage,
  submitLoginCredentials,
  isDashboardHtmlContent,
} from '@/features/auth/utils/auth-parsers'
import { extractCalendarCodeFromHtml } from '@/features/auth/utils/calendar-code-extractor'
import {
  filterRefereeOccupations,
  parseOccupationsFromActiveParty,
} from '@/features/auth/utils/parseOccupations'
import type { AuthState, UserProfile } from '@/shared/stores/auth'
import { logger } from '@/shared/utils/logger'

const API_BASE = API_BASE_URL
const LOGIN_PAGE_URL = `${API_BASE}/login`
const AUTH_URL = `${API_BASE}/sportmanager.security/authentication/authenticate`
const LOGOUT_URL = `${API_BASE}/logout`
const SESSION_CHECK_TIMEOUT_MS = 10_000
/** Grace period after login during which session checks are skipped */
const SESSION_CHECK_GRACE_PERIOD_MS = 5_000

/**
 * Error key for users without a referee role.
 * This key is used by LoginPage to display a translated error message.
 */
export const NO_REFEREE_ROLE_ERROR_KEY = 'auth.noRefereeRole'

// ─── Internal helpers ────────────────────────────────────────────────────────

/**
 * Rejects a login attempt for users without a referee role.
 * Invalidates the server session and clears local state.
 */
async function rejectNonRefereeUser(set: (state: Partial<AuthState>) => void): Promise<false> {
  try {
    await fetch(LOGOUT_URL, { credentials: 'include', redirect: 'manual' })
  } catch {
    // Ignore logout errors - we're rejecting the login anyway
  }
  clearSession()
  set({ status: 'error', error: NO_REFEREE_ROLE_ERROR_KEY })
  return false
}

/**
 * Extracts the calendar code from dashboard HTML.
 */
function extractCalendarCodeFromDashboard(dashboardHtml: string): string | null {
  const code = extractCalendarCodeFromHtml(dashboardHtml)
  if (code) {
    logger.info('Extracted calendar code from dashboard HTML')
  } else {
    logger.info('Calendar code not found in dashboard HTML')
  }
  return code
}

/**
 * Derives user occupations and active occupation ID from active party data.
 */
function deriveUserWithOccupations(
  activeParty: {
    __identity?: string
    groupedEligibleAttributeValues?: AttributeValue[] | null
    eligibleAttributeValues?: AttributeValue[] | null
  } | null,
  currentUser: UserProfile | null,
  currentActiveOccupationId: string | null
): { user: UserProfile; activeOccupationId: string | null } {
  const attributeValues = activeParty?.groupedEligibleAttributeValues?.length
    ? activeParty.groupedEligibleAttributeValues
    : (activeParty?.eligibleAttributeValues ?? null)

  const parsedOccupations = parseOccupationsFromActiveParty(attributeValues)

  const occupations =
    parsedOccupations.length > 0 ? parsedOccupations : (currentUser?.occupations ?? [])

  const isPersistedIdValid =
    currentActiveOccupationId !== null &&
    occupations.some((occ) => occ.id === currentActiveOccupationId)
  const activeOccupationId = isPersistedIdValid
    ? currentActiveOccupationId
    : (occupations[0]?.id ?? null)

  const userId = activeParty?.__identity ?? currentUser?.id ?? 'user'

  const user = currentUser
    ? { ...currentUser, id: userId, occupations }
    : {
        id: userId,
        firstName: '',
        lastName: '',
        occupations,
      }

  return { user, activeOccupationId }
}

/**
 * Processes a successful login result: extracts user data, validates referee role,
 * and syncs the active association with the server.
 */
async function handleSuccessfulLoginResult(
  result: { csrfToken: string; dashboardHtml: string },
  get: () => AuthState,
  set: (state: Partial<AuthState>) => void
): Promise<boolean> {
  const activeParty = extractActivePartyFromHtml(result.dashboardHtml)
  setCsrfToken(result.csrfToken)

  const currentState = get()
  const { user, activeOccupationId } = deriveUserWithOccupations(
    activeParty,
    currentState.user,
    currentState.activeOccupationId
  )

  if (user.occupations.length === 0) {
    return rejectNonRefereeUser(set)
  }

  if (activeOccupationId) {
    try {
      await apiClient.switchRoleAndAttribute(activeOccupationId)
    } catch (error) {
      logger.warn('Failed to sync active association after login:', error)
    }
  }

  set({
    status: 'authenticated',
    csrfToken: result.csrfToken,
    eligibleAttributeValues: activeParty?.eligibleAttributeValues ?? null,
    groupedEligibleAttributeValues: activeParty?.groupedEligibleAttributeValues ?? null,
    eligibleRoles: activeParty?.eligibleRoles ?? null,
    user,
    activeOccupationId,
    _lastAuthTimestamp: Date.now(),
  })

  if (!get().calendarCode) {
    const code = extractCalendarCodeFromDashboard(result.dashboardHtml)
    if (code) {
      set({ calendarCode: code })
    }
  }

  return true
}

/**
 * Ensures a session is established before fetching the login page.
 */
async function ensureSessionEstablished(): Promise<void> {
  if (getSessionToken()) {
    return
  }

  const response = await fetch(`${API_BASE}/sportmanager.volleyball/main/dashboard`, {
    credentials: 'include',
    cache: 'no-store',
    redirect: 'manual',
    headers: {
      ...getSessionHeaders(),
      [CAPTURE_SESSION_TOKEN_HEADER]: 'true',
    },
  })

  captureSessionToken(response)

  const contentType = response.headers.get('Content-Type')
  if (contentType?.includes('application/json')) {
    try {
      const data = (await response.json()) as {
        sessionCaptured?: boolean
        redirectUrl?: string
      }
      logger.info('Session establishment response:', {
        sessionCaptured: data.sessionCaptured,
        hasToken: !!getSessionToken(),
      })
    } catch {
      // JSON parsing failed, continue with fallback
    }
  }

  if (!getSessionToken()) {
    const loginResponse = await fetch(LOGIN_PAGE_URL, {
      credentials: 'include',
      cache: 'no-store',
      headers: getSessionHeaders(),
    })
    captureSessionToken(loginResponse)
  }
}

/**
 * Fetches the login page with iOS Safari PWA session token handling.
 */
async function fetchLoginPageWithSessionHandling(): Promise<Response> {
  const hadTokenBeforeRequest = !!getSessionToken()

  if (!hadTokenBeforeRequest) {
    await ensureSessionEstablished()
  }

  const response = await fetch(LOGIN_PAGE_URL, {
    credentials: 'include',
    cache: 'no-store',
    headers: getSessionHeaders(),
  })

  if (!response.ok) {
    throw new Error('Failed to load login page')
  }

  captureSessionToken(response)

  return response
}

/**
 * Checks if the response URL indicates the login page.
 */
function isResponseUrlLoginPage(url: string | undefined): boolean {
  if (!url) return false
  const pathname = new URL(url).pathname.toLowerCase()
  return pathname === '/login' || pathname.endsWith('/login')
}

/**
 * Checks if HTML content represents a login page.
 */
function isLoginPageHtmlContent(html: string): boolean {
  const hasLoginFormIndicators =
    html.includes('action="/login"') ||
    (html.includes('id="username"') && html.includes('id="password"'))

  const hasDashboardIndicators = isDashboardHtmlContent(html)

  return hasLoginFormIndicators && !hasDashboardIndicators
}

// ─── Public entry points ─────────────────────────────────────────────────────

/**
 * Perform real API login with username and password.
 */
export async function performApiLogin(
  username: string,
  password: string,
  get: () => AuthState,
  set: (state: Partial<AuthState>) => void
): Promise<boolean> {
  const loginPageResponse = await fetchLoginPageWithSessionHandling()
  const html = await loginPageResponse.text()
  const existingCsrfToken = extractCsrfTokenFromPage(html)

  if (existingCsrfToken) {
    // Already logged in - fetch dashboard to get associations
    const dashboardResponse = await fetch(`${API_BASE}/sportmanager.volleyball/main/dashboard`, {
      credentials: 'include',
      cache: 'no-store',
      headers: getSessionHeaders(),
    })

    captureSessionToken(dashboardResponse)

    let activeParty = null
    let dashboardHtml = ''
    if (dashboardResponse.ok) {
      dashboardHtml = await dashboardResponse.text()
      activeParty = extractActivePartyFromHtml(dashboardHtml)
    }

    setCsrfToken(existingCsrfToken)

    const currentState = get()
    const { user, activeOccupationId } = deriveUserWithOccupations(
      activeParty,
      currentState.user,
      currentState.activeOccupationId
    )

    if (user.occupations.length === 0) {
      return rejectNonRefereeUser(set)
    }

    if (activeOccupationId) {
      try {
        await apiClient.switchRoleAndAttribute(activeOccupationId)
      } catch (error) {
        logger.warn('Failed to sync active association after login:', error)
      }
    }

    set({
      status: 'authenticated',
      csrfToken: existingCsrfToken,
      eligibleAttributeValues: activeParty?.eligibleAttributeValues ?? null,
      groupedEligibleAttributeValues: activeParty?.groupedEligibleAttributeValues ?? null,
      eligibleRoles: activeParty?.eligibleRoles ?? null,
      user,
      activeOccupationId,
      _lastAuthTimestamp: Date.now(),
    })

    if (!currentState.calendarCode && dashboardHtml) {
      const code = extractCalendarCodeFromDashboard(dashboardHtml)
      if (code) {
        set({ calendarCode: code })
      }
    }

    return true
  }

  const formFields = extractLoginFormFields(html)
  if (!formFields) {
    throw new Error('Could not extract form fields from login page')
  }

  const result = await submitLoginCredentials(AUTH_URL, username, password, formFields)

  if (result.success) {
    return handleSuccessfulLoginResult(result, get, set)
  }

  set({
    status: 'error',
    error: result.error,
    lockedUntil: result.lockedUntil ?? null,
  })
  return false
}

/**
 * Perform real API logout by invalidating the server session.
 */
export async function performApiLogout(): Promise<void> {
  try {
    await fetch(LOGOUT_URL, {
      credentials: 'include',
      redirect: 'manual',
    })
  } catch (error) {
    logger.error('Logout request failed:', error)
  }
}

/**
 * Check if the real API session is still valid.
 *
 * Fetches the dashboard and checks whether the server redirects to the login page
 * (indicating an expired session) or returns dashboard HTML with a CSRF token
 * (indicating a valid session).
 */
export async function performApiSessionCheck(
  get: () => AuthState,
  set: (state: Partial<AuthState>) => void,
  signal?: AbortSignal
): Promise<boolean> {
  const handleInvalidSession = (logMessage: string): false => {
    logger.info(logMessage)
    clearSession()
    set({ status: 'idle', user: null, csrfToken: null, _lastAuthTimestamp: null })
    return false
  }

  try {
    const timeoutController = new AbortController()
    const timeoutId = setTimeout(() => timeoutController.abort(), SESSION_CHECK_TIMEOUT_MS)

    const fetchSignal = signal
      ? AbortSignal.any([timeoutController.signal, signal])
      : timeoutController.signal

    try {
      const response = await fetch(`${API_BASE}/sportmanager.volleyball/main/dashboard`, {
        credentials: 'include',
        redirect: 'follow',
        signal: fetchSignal,
        cache: 'no-store',
        headers: getSessionHeaders(),
      })

      clearTimeout(timeoutId)

      captureSessionToken(response)

      if (isResponseUrlLoginPage(response.url)) {
        return handleInvalidSession('Session check: redirected to login page, session is stale')
      }

      const html = response.ok ? await response.text() : ''

      if (isLoginPageHtmlContent(html)) {
        return handleInvalidSession(
          'Session check: detected login page via content analysis, session is stale'
        )
      }

      if (response.ok) {
        const csrfToken = extractCsrfTokenFromPage(html)
        const currentState = get()

        if (!csrfToken && !currentState.csrfToken) {
          return handleInvalidSession('Session check: no CSRF token found, session is invalid')
        }

        const activeParty = extractActivePartyFromHtml(html)
        const { user, activeOccupationId } = deriveUserWithOccupations(
          activeParty,
          currentState.user,
          currentState.activeOccupationId
        )

        if (csrfToken) {
          setCsrfToken(csrfToken)
        }

        set({
          status: 'authenticated',
          csrfToken: csrfToken ?? currentState.csrfToken,
          eligibleAttributeValues:
            activeParty?.eligibleAttributeValues ?? currentState.eligibleAttributeValues,
          groupedEligibleAttributeValues:
            activeParty?.groupedEligibleAttributeValues ??
            currentState.groupedEligibleAttributeValues,
          eligibleRoles: activeParty?.eligibleRoles ?? currentState.eligibleRoles,
          user,
          activeOccupationId,
          _lastAuthTimestamp: Date.now(),
        })
        return true
      }

      set({ status: 'idle', user: null })
      return false
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof Error && error.name === 'AbortError') {
        if (signal?.aborted) {
          return false
        }
        logger.error('Session check timed out')
        set({ status: 'idle', user: null })
        return false
      }

      throw error
    }
  } catch (error) {
    logger.error('Session check failed:', error)
    set({ status: 'idle', user: null })
    return false
  }
}

// Re-export for use by auth store
export { filterRefereeOccupations }
export { SESSION_CHECK_GRACE_PERIOD_MS }
