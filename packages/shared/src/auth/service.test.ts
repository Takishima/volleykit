/**
 * Tests for authentication service
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createAuthService } from './service'
import type { AuthServiceConfig } from './types'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('createAuthService', () => {
  const mockConfig: AuthServiceConfig = {
    apiBaseUrl: 'https://api.test.com',
    getSessionHeaders: () => ({ 'X-Session': 'test-session' }),
    captureSessionToken: vi.fn(),
    cookieProcessingDelayMs: 0, // No delay for tests
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('login', () => {
    it('should return success with CSRF token on successful login', async () => {
      const loginPageHtml = `
        <form>
          <input name="__trustedProperties" value="trusted-token" />
          <input name="__referrer[@package]" value="SportManager.Volleyball" />
        </form>
      `

      const dashboardHtml = '<div data-csrf-token="csrf-12345">Dashboard</div>'

      // First call: fetch login page
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(loginPageHtml),
        headers: new Headers(),
      })

      // Second call: submit credentials - redirect to dashboard
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 303,
        type: 'default',
        headers: new Headers({ Location: '/sportmanager.volleyball/main/dashboard' }),
        text: () => Promise.resolve(''),
      })

      // Third call: fetch dashboard
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(dashboardHtml),
        headers: new Headers(),
      })

      const authService = createAuthService(mockConfig)
      const resultPromise = authService.login('testuser', 'testpass')

      // Advance timers for the cookie processing delay
      await vi.runAllTimersAsync()

      const result = await resultPromise

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.csrfToken).toBe('csrf-12345')
        expect(result.dashboardHtml).toContain('Dashboard')
      }
    })

    it('should return error for invalid credentials', async () => {
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

      const authService = createAuthService(mockConfig)
      const result = await authService.login('baduser', 'badpass')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Invalid username or password')
      }
    })

    it('should handle lockout response', async () => {
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

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 423,
        json: () =>
          Promise.resolve({
            message: 'Account locked for 5 minutes',
            lockedUntil: Date.now() + 300000,
          }),
        headers: new Headers(),
      })

      const authService = createAuthService(mockConfig)
      const result = await authService.login('user', 'pass')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Account locked for 5 minutes')
        expect(result.lockedUntil).toBeDefined()
      }
    })

    it('should handle TFA page response', async () => {
      const loginPageHtml = `
        <form>
          <input name="__trustedProperties" value="trusted-token" />
        </form>
      `

      const tfaPageHtml = '<input name="secondFactorToken" />'

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
        text: () => Promise.resolve(tfaPageHtml),
      })

      const authService = createAuthService(mockConfig)
      const result = await authService.login('user', 'pass')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('Two-factor authentication is not supported')
      }
    })

    it('should handle failed login page fetch', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: new Headers(),
      })

      const authService = createAuthService(mockConfig)
      const result = await authService.login('user', 'pass')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Failed to load login page')
      }
    })

    it('should handle missing form fields', async () => {
      const invalidLoginPageHtml = '<div>No form fields</div>'

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(invalidLoginPageHtml),
        headers: new Headers(),
      })

      const authService = createAuthService(mockConfig)
      const result = await authService.login('user', 'pass')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Could not extract form fields from login page')
      }
    })

    it('should detect already logged in state', async () => {
      // Login page that shows CSRF token (already authenticated)
      const loginPageWithCsrf = '<div data-csrf-token="existing-token">Already logged in</div>'
      const dashboardHtml = '<div data-csrf-token="dashboard-token">Dashboard</div>'

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(loginPageWithCsrf),
        headers: new Headers(),
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(dashboardHtml),
        headers: new Headers(),
      })

      const authService = createAuthService(mockConfig)
      const resultPromise = authService.login('user', 'pass')

      await vi.runAllTimersAsync()

      const result = await resultPromise

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.csrfToken).toBe('dashboard-token')
      }
    })

    it('should handle opaqueredirect response', async () => {
      const loginPageHtml = `
        <form>
          <input name="__trustedProperties" value="trusted-token" />
        </form>
      `
      const dashboardHtml = '<div data-csrf-token="csrf-opaque">Dashboard</div>'

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(loginPageHtml),
        headers: new Headers(),
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        type: 'opaqueredirect',
        headers: new Headers(),
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(dashboardHtml),
        headers: new Headers(),
      })

      const authService = createAuthService(mockConfig)
      const resultPromise = authService.login('user', 'pass')

      await vi.runAllTimersAsync()

      const result = await resultPromise

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.csrfToken).toBe('csrf-opaque')
      }
    })

    it('should handle JSON response from proxy', async () => {
      const loginPageHtml = `
        <form>
          <input name="__trustedProperties" value="trusted-token" />
        </form>
      `
      const dashboardHtml = '<div data-csrf-token="csrf-json">Dashboard</div>'

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(loginPageHtml),
        headers: new Headers(),
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        type: 'default',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: () =>
          Promise.resolve({
            success: true,
            redirectUrl: '/sportmanager.volleyball/main/dashboard',
          }),
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(dashboardHtml),
        headers: new Headers(),
      })

      const authService = createAuthService(mockConfig)
      const resultPromise = authService.login('user', 'pass')

      await vi.runAllTimersAsync()

      const result = await resultPromise

      expect(result.success).toBe(true)
    })

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const authService = createAuthService(mockConfig)
      const result = await authService.login('user', 'pass')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Network error')
      }
    })
  })

  describe('logout', () => {
    it('should call logout endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers(),
      })

      const authService = createAuthService(mockConfig)
      await authService.logout()

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/logout',
        expect.objectContaining({
          credentials: 'include',
          redirect: 'manual',
        })
      )
    })

    it('should handle logout errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Logout failed'))

      const authService = createAuthService(mockConfig)

      // Should not throw
      await expect(authService.logout()).resolves.toBeUndefined()
    })
  })

  describe('checkSession', () => {
    it('should return valid true with CSRF token for authenticated session', async () => {
      const dashboardHtml = `
        <div data-csrf-token="session-csrf">
          <script>
            window.activeParty = JSON.parse('{"__identity":"user-123","eligibleRoles":{}}');
          </script>
        </div>
      `

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(dashboardHtml),
        headers: new Headers(),
      })

      const authService = createAuthService(mockConfig)
      const result = await authService.checkSession()

      expect(result.valid).toBe(true)
      expect(result.csrfToken).toBe('session-csrf')
      expect(result.activeParty).toBeDefined()
    })

    it('should return valid false for login page redirect', async () => {
      const loginPageHtml = `
        <form action="/login">
          <input id="username" />
          <input id="password" />
        </form>
      `

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(loginPageHtml),
        headers: new Headers(),
      })

      const authService = createAuthService(mockConfig)
      const result = await authService.checkSession()

      expect(result.valid).toBe(false)
    })

    it('should return valid false for failed request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: new Headers(),
      })

      const authService = createAuthService(mockConfig)
      const result = await authService.checkSession()

      expect(result.valid).toBe(false)
    })

    it('should return valid false on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const authService = createAuthService(mockConfig)
      const result = await authService.checkSession()

      expect(result.valid).toBe(false)
    })

    it('should return valid false if CSRF token is missing', async () => {
      const dashboardHtml = '<div>Dashboard without CSRF token</div>'

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(dashboardHtml),
        headers: new Headers(),
      })

      const authService = createAuthService(mockConfig)
      const result = await authService.checkSession()

      expect(result.valid).toBe(false)
    })
  })

  describe('deriveUserFromActiveParty', () => {
    it('should derive user with occupations from activeParty', () => {
      const activeParty = {
        __identity: 'party-123',
        groupedEligibleAttributeValues: [
          {
            __identity: 'occ-1',
            roleIdentifier: 'Indoorvolleyball.RefAdmin:Referee',
            inflatedValue: { shortName: 'RVNO' },
          },
        ],
      }

      const authService = createAuthService(mockConfig)
      const result = authService.deriveUserFromActiveParty(activeParty, null, null)

      expect(result.user.id).toBe('party-123')
      expect(result.user.occupations).toHaveLength(1)
      expect(result.user.occupations[0].associationCode).toBe('RVNO')
      expect(result.activeOccupationId).toBe('occ-1')
    })

    it('should preserve existing user data', () => {
      const activeParty = {
        __identity: 'party-new',
        groupedEligibleAttributeValues: [],
      }

      const existingUser = {
        id: 'user-old',
        firstName: 'John',
        lastName: 'Doe',
        occupations: [{ id: 'occ-1', type: 'referee' as const }],
      }

      const authService = createAuthService(mockConfig)
      const result = authService.deriveUserFromActiveParty(activeParty, existingUser, 'occ-1')

      expect(result.user.firstName).toBe('John')
      expect(result.user.lastName).toBe('Doe')
      expect(result.user.id).toBe('party-new') // Updated from activeParty
      expect(result.user.occupations).toHaveLength(1) // Preserved
    })

    it('should validate existing activeOccupationId', () => {
      const activeParty = {
        __identity: 'party-123',
        groupedEligibleAttributeValues: [
          {
            __identity: 'occ-2',
            roleIdentifier: 'Indoorvolleyball.RefAdmin:Referee',
            inflatedValue: { shortName: 'RVSZ' },
          },
        ],
      }

      const authService = createAuthService(mockConfig)
      // Invalid occupation ID should be replaced with first available
      const result = authService.deriveUserFromActiveParty(activeParty, null, 'invalid-occ-id')

      expect(result.activeOccupationId).toBe('occ-2')
    })

    it('should handle null activeParty', () => {
      const existingUser = {
        id: 'user-1',
        firstName: 'Jane',
        lastName: 'Smith',
        occupations: [{ id: 'occ-1', type: 'referee' as const }],
      }

      const authService = createAuthService(mockConfig)
      const result = authService.deriveUserFromActiveParty(null, existingUser, 'occ-1')

      expect(result.user.id).toBe('user-1')
      expect(result.user.occupations).toEqual(existingUser.occupations)
    })

    it('should fallback to eligibleAttributeValues if groupedEligibleAttributeValues empty', () => {
      const activeParty = {
        __identity: 'party-456',
        groupedEligibleAttributeValues: [],
        eligibleAttributeValues: [
          {
            __identity: 'occ-fallback',
            roleIdentifier: 'Indoorvolleyball.RefAdmin:Referee',
            inflatedValue: { shortName: 'SV' },
          },
        ],
      }

      const authService = createAuthService(mockConfig)
      const result = authService.deriveUserFromActiveParty(activeParty, null, null)

      expect(result.user.occupations).toHaveLength(1)
      expect(result.user.occupations[0].id).toBe('occ-fallback')
    })
  })
})
