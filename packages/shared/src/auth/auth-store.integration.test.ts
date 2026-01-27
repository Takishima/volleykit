/**
 * Auth Service + Auth Store Integration Tests
 *
 * Tests the integration between auth service and auth store:
 * - Login flow updates store state correctly
 * - deriveUserFromActiveParty properly sets up user and occupation
 * - Session check updates store appropriately
 * - Error states propagate correctly
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createAuthService } from './service'
import type { AuthServiceConfig } from './types'
import { useAuthStore } from '../stores/auth'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('Auth Service + Store Integration', () => {
  const mockConfig: AuthServiceConfig = {
    apiBaseUrl: 'https://api.test.com',
    getSessionHeaders: () => ({ 'X-Session': 'test-session' }),
    captureSessionToken: vi.fn(),
    cookieProcessingDelayMs: 0,
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    useAuthStore.getState().reset()
  })

  afterEach(() => {
    vi.useRealTimers()
    useAuthStore.getState().reset()
  })

  describe('login flow with store update', () => {
    it('should update auth store on successful login', async () => {
      const loginPageHtml = `
        <form>
          <input name="__trustedProperties" value="trusted-token" />
          <input name="__referrer[@package]" value="SportManager.Volleyball" />
        </form>
      `

      const dashboardHtml = `
        <div data-csrf-token="csrf-12345">
          <script>
            window.activeParty = JSON.parse('${JSON.stringify({
              __identity: 'user-123',
              groupedEligibleAttributeValues: [
                {
                  __identity: 'occ-referee-sv',
                  roleIdentifier: 'Indoorvolleyball.RefAdmin:Referee',
                  inflatedValue: { shortName: 'SV', name: 'SwissVolley' },
                },
              ],
            })}');
          </script>
        </div>
      `

      // Mock fetch responses
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(loginPageHtml),
        headers: new Headers(),
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 303,
        type: 'default',
        headers: new Headers({ Location: '/sportmanager.volleyball/main/dashboard' }),
        text: () => Promise.resolve(''),
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(dashboardHtml),
        headers: new Headers(),
      })

      // Initial state
      expect(useAuthStore.getState().status).toBe('idle')
      expect(useAuthStore.getState().user).toBeNull()

      // Set loading state
      useAuthStore.getState().setStatus('loading')
      expect(useAuthStore.getState().status).toBe('loading')

      // Execute login
      const authService = createAuthService(mockConfig)
      const resultPromise = authService.login('testuser', 'testpass')
      await vi.runAllTimersAsync()
      const result = await resultPromise

      expect(result.success).toBe(true)

      // Derive user from activeParty and update store
      if (result.success && result.dashboardHtml) {
        const activeParty = authService.extractActivePartyFromHtml(result.dashboardHtml)
        const { user, activeOccupationId } = authService.deriveUserFromActiveParty(
          activeParty,
          null,
          null
        )

        useAuthStore.getState().setUser(user)
        if (activeOccupationId) {
          useAuthStore.getState().setActiveOccupation(activeOccupationId)
        }
      }

      // Verify store state
      const state = useAuthStore.getState()
      expect(state.status).toBe('authenticated')
      expect(state.user).not.toBeNull()
      expect(state.user?.id).toBe('user-123')
      expect(state.user?.occupations).toHaveLength(1)
      expect(state.user?.occupations[0].associationCode).toBe('SV')
      expect(state.activeOccupationId).toBe('occ-referee-sv')
    })

    it('should set error state on failed login', async () => {
      const loginPageHtml = `
        <form>
          <input name="__trustedProperties" value="trusted-token" />
        </form>
      `

      const errorPageHtml = '<div color="error">Invalid credentials</div>'

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(loginPageHtml),
        headers: new Headers(),
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        type: 'default',
        headers: new Headers(),
        text: () => Promise.resolve(errorPageHtml),
      })

      useAuthStore.getState().setStatus('loading')

      const authService = createAuthService(mockConfig)
      const result = await authService.login('baduser', 'badpass')

      expect(result.success).toBe(false)

      // Update store with error
      if (!result.success) {
        useAuthStore.getState().setError({
          message: result.error,
          code: 'invalid_credentials',
        })
      }

      const state = useAuthStore.getState()
      expect(state.status).toBe('error')
      expect(state.error).not.toBeNull()
      expect(state.error?.message).toBe('Invalid username or password')
      expect(state.error?.code).toBe('invalid_credentials')
      expect(state.user).toBeNull()
    })

    it('should handle lockout state correctly', async () => {
      const loginPageHtml = `
        <form>
          <input name="__trustedProperties" value="trusted-token" />
        </form>
      `

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(loginPageHtml),
        headers: new Headers(),
      })

      const lockedUntil = Date.now() + 300000

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 423,
        json: () =>
          Promise.resolve({
            message: 'Account locked for 5 minutes',
            lockedUntil,
          }),
        headers: new Headers(),
      })

      const authService = createAuthService(mockConfig)
      const result = await authService.login('user', 'pass')

      expect(result.success).toBe(false)

      if (!result.success) {
        useAuthStore.getState().setError({
          message: result.error,
          code: 'locked',
          lockedUntilSeconds: result.lockedUntil
            ? Math.ceil((result.lockedUntil - Date.now()) / 1000)
            : undefined,
        })
      }

      const state = useAuthStore.getState()
      expect(state.status).toBe('error')
      expect(state.error?.code).toBe('locked')
      expect(state.error?.lockedUntilSeconds).toBeDefined()
    })
  })

  describe('session check with store update', () => {
    it('should restore session state on valid session', async () => {
      const dashboardHtml = `
        <div data-csrf-token="session-csrf">
          <script>
            window.activeParty = JSON.parse('${JSON.stringify({
              __identity: 'user-456',
              groupedEligibleAttributeValues: [
                {
                  __identity: 'occ-ref-rvno',
                  roleIdentifier: 'Indoorvolleyball.RefAdmin:Referee',
                  inflatedValue: { shortName: 'RVNO', name: 'RV Nordostschweiz' },
                },
                {
                  __identity: 'occ-ref-rvsz',
                  roleIdentifier: 'Indoorvolleyball.RefAdmin:Referee',
                  inflatedValue: { shortName: 'RVSZ', name: 'RV Zentralschweiz' },
                },
              ],
            })}');
          </script>
        </div>
      `

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(dashboardHtml),
        headers: new Headers(),
      })

      // Simulate checking session
      useAuthStore.getState().setStatus('loading')

      const authService = createAuthService(mockConfig)
      const result = await authService.checkSession()

      expect(result.valid).toBe(true)
      expect(result.csrfToken).toBe('session-csrf')

      // Update store based on session check
      if (result.valid && result.activeParty) {
        const { user, activeOccupationId } = authService.deriveUserFromActiveParty(
          result.activeParty,
          null,
          null
        )

        useAuthStore.getState().setUser(user)
        if (activeOccupationId) {
          useAuthStore.getState().setActiveOccupation(activeOccupationId)
        }
      }

      const state = useAuthStore.getState()
      expect(state.status).toBe('authenticated')
      expect(state.user?.id).toBe('user-456')
      expect(state.user?.occupations).toHaveLength(2)
      expect(state.hasMultipleAssociations()).toBe(true)
    })

    it('should handle invalid session', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: new Headers(),
      })

      useAuthStore.getState().setStatus('loading')

      const authService = createAuthService(mockConfig)
      const result = await authService.checkSession()

      expect(result.valid).toBe(false)

      // On invalid session, reset to idle
      if (!result.valid) {
        useAuthStore.getState().setStatus('idle')
      }

      const state = useAuthStore.getState()
      expect(state.status).toBe('idle')
      expect(state.user).toBeNull()
    })

    it('should preserve existing activeOccupationId on session restore', async () => {
      const dashboardHtml = `
        <div data-csrf-token="session-csrf">
          <script>
            window.activeParty = JSON.parse('${JSON.stringify({
              __identity: 'user-789',
              groupedEligibleAttributeValues: [
                {
                  __identity: 'occ-1',
                  roleIdentifier: 'Indoorvolleyball.RefAdmin:Referee',
                  inflatedValue: { shortName: 'SV' },
                },
                {
                  __identity: 'occ-2',
                  roleIdentifier: 'Indoorvolleyball.RefAdmin:Referee',
                  inflatedValue: { shortName: 'RVNO' },
                },
              ],
            })}');
          </script>
        </div>
      `

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(dashboardHtml),
        headers: new Headers(),
      })

      // Simulate user had previously selected occ-2
      const previousActiveOccupationId = 'occ-2'

      const authService = createAuthService(mockConfig)
      const result = await authService.checkSession()

      if (result.valid && result.activeParty) {
        const { user, activeOccupationId } = authService.deriveUserFromActiveParty(
          result.activeParty,
          null,
          previousActiveOccupationId // Persisted from storage
        )

        useAuthStore.getState().setUser(user)
        if (activeOccupationId) {
          useAuthStore.getState().setActiveOccupation(activeOccupationId)
        }
      }

      // Should preserve the previous selection
      expect(useAuthStore.getState().activeOccupationId).toBe('occ-2')
    })
  })

  describe('logout flow', () => {
    it('should clear store state on logout', async () => {
      // Setup authenticated state
      useAuthStore.getState().setUser({
        id: 'user-123',
        firstName: 'John',
        lastName: 'Doe',
        occupations: [{ id: 'occ-1', type: 'referee', associationCode: 'SV' }],
      })
      useAuthStore.getState().setDataSource('api')

      expect(useAuthStore.getState().status).toBe('authenticated')
      expect(useAuthStore.getState().user).not.toBeNull()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers(),
      })

      const authService = createAuthService(mockConfig)
      await authService.logout()

      // Clear store
      useAuthStore.getState().logout()

      const state = useAuthStore.getState()
      expect(state.status).toBe('idle')
      expect(state.user).toBeNull()
      expect(state.activeOccupationId).toBeNull()
      // Data source is preserved on logout
      expect(state.dataSource).toBe('api')
    })
  })

  describe('data source transitions', () => {
    it('should handle demo mode authentication', () => {
      // Set demo mode
      useAuthStore.getState().setDataSource('demo')

      // Set demo user
      useAuthStore.getState().setUser({
        id: 'demo-user',
        firstName: 'Demo',
        lastName: 'User',
        occupations: [
          { id: 'demo-occ-sv', type: 'referee', associationCode: 'SV' },
          { id: 'demo-occ-rvno', type: 'referee', associationCode: 'RVNO' },
        ],
      })

      const state = useAuthStore.getState()
      expect(state.status).toBe('authenticated')
      expect(state.dataSource).toBe('demo')
      expect(state.isDemoMode()).toBe(true)
      expect(state.getAuthMode()).toBe('demo')
    })

    it('should handle calendar mode authentication', () => {
      useAuthStore.getState().setDataSource('calendar')
      useAuthStore.getState().setCalendarCode('ABC123')

      useAuthStore.getState().setUser({
        id: 'calendar-user',
        firstName: 'Calendar',
        lastName: 'User',
        occupations: [{ id: 'cal-occ', type: 'referee' }],
      })

      const state = useAuthStore.getState()
      expect(state.status).toBe('authenticated')
      expect(state.dataSource).toBe('calendar')
      expect(state.isCalendarMode()).toBe(true)
      expect(state.getAuthMode()).toBe('calendar')
      expect(state.calendarCode).toBe('ABC123')
    })

    it('should transition between data sources correctly', () => {
      // Start with API auth
      useAuthStore.getState().setUser({
        id: 'api-user',
        firstName: 'API',
        lastName: 'User',
        occupations: [{ id: 'api-occ', type: 'referee' }],
      })

      expect(useAuthStore.getState().getAuthMode()).toBe('full')

      // Logout and switch to demo
      useAuthStore.getState().logout()
      useAuthStore.getState().setDataSource('demo')

      expect(useAuthStore.getState().getAuthMode()).toBe('none')

      // Auth in demo mode
      useAuthStore.getState().setUser({
        id: 'demo-user',
        firstName: 'Demo',
        lastName: 'User',
        occupations: [],
      })

      expect(useAuthStore.getState().getAuthMode()).toBe('demo')
    })
  })
})
