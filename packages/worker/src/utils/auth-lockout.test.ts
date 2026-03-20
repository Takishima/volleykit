import { describe, it, expect, vi } from 'vitest'

import {
  AUTH_LOCKOUT_ATTEMPT_WINDOW_SECONDS,
  AUTH_LOCKOUT_INITIAL_DURATION_SECONDS,
  AUTH_LOCKOUT_MAX_ATTEMPTS,
  AUTH_LOCKOUT_MAX_DURATION_SECONDS,
  type AuthLockoutKV,
  type AuthLockoutState,
  calculateLockoutDuration,
  checkLockoutStatus,
  clearAuthLockout,
  getAuthLockoutKey,
  getAuthLockoutState,
  isValidAuthLockoutState,
  recordFailedAttempt,
} from './auth-lockout'
import { isAuthRequest, isFailedLoginResponse, isSuccessfulLoginResponse } from './auth-detection'

describe('Auth Lockout', () => {
  // Mock KV implementation for testing
  function createMockKV(): AuthLockoutKV & { store: Map<string, string> } {
    const store = new Map<string, string>()
    return {
      store,
      get: vi.fn(async (key: string) => store.get(key) ?? null),
      put: vi.fn(async (key: string, value: string) => {
        store.set(key, value)
      }),
      delete: vi.fn(async (key: string) => {
        store.delete(key)
      }),
    }
  }

  describe('Constants', () => {
    it('has correct max attempts', () => {
      expect(AUTH_LOCKOUT_MAX_ATTEMPTS).toBe(5)
    })

    it('has correct initial lockout duration (30 seconds)', () => {
      expect(AUTH_LOCKOUT_INITIAL_DURATION_SECONDS).toBe(30)
    })

    it('has correct max lockout duration (5 minutes)', () => {
      expect(AUTH_LOCKOUT_MAX_DURATION_SECONDS).toBe(300)
    })

    it('has correct attempt window (15 minutes)', () => {
      expect(AUTH_LOCKOUT_ATTEMPT_WINDOW_SECONDS).toBe(900)
    })
  })

  describe('getAuthLockoutKey', () => {
    it('creates correct key format', () => {
      expect(getAuthLockoutKey('192.168.1.1')).toBe('auth:lockout:192.168.1.1')
    })

    it('handles IPv6 addresses', () => {
      expect(getAuthLockoutKey('::1')).toBe('auth:lockout:::1')
    })
  })

  describe('getAuthLockoutState', () => {
    it('returns null when no state exists', async () => {
      const kv = createMockKV()
      const state = await getAuthLockoutState(kv, '192.168.1.1')
      expect(state).toBeNull()
    })

    it('returns parsed state when exists', async () => {
      const kv = createMockKV()
      const storedState: AuthLockoutState = {
        failedAttempts: 3,
        firstAttemptAt: Date.now(),
        lockedUntil: null,
        lockoutCount: 0,
      }
      kv.store.set('auth:lockout:192.168.1.1', JSON.stringify(storedState))

      const state = await getAuthLockoutState(kv, '192.168.1.1')
      expect(state).toEqual(storedState)
    })

    it('returns null for invalid JSON', async () => {
      const kv = createMockKV()
      kv.store.set('auth:lockout:192.168.1.1', 'invalid json')

      const state = await getAuthLockoutState(kv, '192.168.1.1')
      expect(state).toBeNull()
    })

    it('returns null for corrupted data (valid JSON, wrong shape)', async () => {
      const kv = createMockKV()
      // Valid JSON but missing required fields
      kv.store.set('auth:lockout:192.168.1.1', JSON.stringify({ foo: 'bar' }))

      const state = await getAuthLockoutState(kv, '192.168.1.1')
      expect(state).toBeNull()
    })

    it('returns null for data with wrong types', async () => {
      const kv = createMockKV()
      // Has all fields but wrong types
      kv.store.set(
        'auth:lockout:192.168.1.1',
        JSON.stringify({
          failedAttempts: 'not a number',
          firstAttemptAt: Date.now(),
          lockedUntil: null,
          lockoutCount: 0,
        })
      )

      const state = await getAuthLockoutState(kv, '192.168.1.1')
      expect(state).toBeNull()
    })
  })

  describe('isValidAuthLockoutState', () => {
    it('returns true for valid state', () => {
      const state = {
        failedAttempts: 3,
        firstAttemptAt: Date.now(),
        lockedUntil: null,
        lockoutCount: 0,
      }
      expect(isValidAuthLockoutState(state)).toBe(true)
    })

    it('returns true for valid state with lockedUntil set', () => {
      const state = {
        failedAttempts: 5,
        firstAttemptAt: Date.now(),
        lockedUntil: Date.now() + 30000,
        lockoutCount: 1,
      }
      expect(isValidAuthLockoutState(state)).toBe(true)
    })

    it('returns false for null', () => {
      expect(isValidAuthLockoutState(null)).toBe(false)
    })

    it('returns false for non-object', () => {
      expect(isValidAuthLockoutState('string')).toBe(false)
      expect(isValidAuthLockoutState(123)).toBe(false)
    })

    it('returns false for missing fields', () => {
      expect(isValidAuthLockoutState({})).toBe(false)
      expect(isValidAuthLockoutState({ failedAttempts: 1 })).toBe(false)
    })

    it('returns false for wrong field types', () => {
      expect(
        isValidAuthLockoutState({
          failedAttempts: 'not a number',
          firstAttemptAt: Date.now(),
          lockedUntil: null,
          lockoutCount: 0,
        })
      ).toBe(false)
    })
  })

  describe('checkLockoutStatus', () => {
    it('returns not locked when state is null', () => {
      const result = checkLockoutStatus(null)
      expect(result.isLocked).toBe(false)
      expect(result.remainingSeconds).toBe(0)
      expect(result.failedAttempts).toBe(0)
      expect(result.attemptsRemaining).toBe(AUTH_LOCKOUT_MAX_ATTEMPTS)
    })

    it('returns locked when lockedUntil is in the future', () => {
      const now = Date.now()
      const state: AuthLockoutState = {
        failedAttempts: 5,
        firstAttemptAt: now - 60000,
        lockedUntil: now + 30000, // 30 seconds from now
        lockoutCount: 1,
      }

      const result = checkLockoutStatus(state, now)
      expect(result.isLocked).toBe(true)
      expect(result.remainingSeconds).toBe(30)
      expect(result.failedAttempts).toBe(5)
      expect(result.attemptsRemaining).toBe(0)
    })

    it('returns not locked when lockedUntil has passed', () => {
      const now = Date.now()
      const state: AuthLockoutState = {
        failedAttempts: 5,
        firstAttemptAt: now - 120000,
        lockedUntil: now - 30000, // 30 seconds ago
        lockoutCount: 1,
      }

      const result = checkLockoutStatus(state, now)
      expect(result.isLocked).toBe(false)
      expect(result.remainingSeconds).toBe(0)
    })

    it('resets counter when attempt window has expired', () => {
      const now = Date.now()
      const state: AuthLockoutState = {
        failedAttempts: 4,
        firstAttemptAt: now - (AUTH_LOCKOUT_ATTEMPT_WINDOW_SECONDS * 1000 + 1000), // Window expired
        lockedUntil: null,
        lockoutCount: 0,
      }

      const result = checkLockoutStatus(state, now)
      expect(result.failedAttempts).toBe(0)
      expect(result.attemptsRemaining).toBe(AUTH_LOCKOUT_MAX_ATTEMPTS)
    })

    it('returns correct attempts remaining', () => {
      const now = Date.now()
      const state: AuthLockoutState = {
        failedAttempts: 3,
        firstAttemptAt: now - 60000,
        lockedUntil: null,
        lockoutCount: 0,
      }

      const result = checkLockoutStatus(state, now)
      expect(result.attemptsRemaining).toBe(2)
    })
  })

  describe('calculateLockoutDuration', () => {
    it('returns initial duration for first lockout', () => {
      expect(calculateLockoutDuration(0)).toBe(30)
    })

    it('doubles duration for each subsequent lockout', () => {
      expect(calculateLockoutDuration(1)).toBe(60)
      expect(calculateLockoutDuration(2)).toBe(120)
      expect(calculateLockoutDuration(3)).toBe(240)
    })

    it('caps at max duration', () => {
      expect(calculateLockoutDuration(4)).toBe(300) // Would be 480, but capped at 300
      expect(calculateLockoutDuration(10)).toBe(300)
    })
  })

  describe('recordFailedAttempt', () => {
    it('creates new state for first attempt', async () => {
      const kv = createMockKV()
      const now = Date.now()

      await recordFailedAttempt(kv, '192.168.1.1', now)

      const storedData = kv.store.get('auth:lockout:192.168.1.1')
      expect(storedData).toBeDefined()
      const state = JSON.parse(storedData!) as AuthLockoutState
      expect(state.failedAttempts).toBe(1)
      expect(state.firstAttemptAt).toBe(now)
      expect(state.lockedUntil).toBeNull()
    })

    it('increments failed attempts', async () => {
      const kv = createMockKV()
      const now = Date.now()

      await recordFailedAttempt(kv, '192.168.1.1', now)
      await recordFailedAttempt(kv, '192.168.1.1', now + 1000)
      await recordFailedAttempt(kv, '192.168.1.1', now + 2000)

      const storedData = kv.store.get('auth:lockout:192.168.1.1')
      const state = JSON.parse(storedData!) as AuthLockoutState
      expect(state.failedAttempts).toBe(3)
    })

    it('locks out after max attempts', async () => {
      const kv = createMockKV()
      const now = Date.now()

      // Make 5 failed attempts
      for (let i = 0; i < AUTH_LOCKOUT_MAX_ATTEMPTS; i++) {
        await recordFailedAttempt(kv, '192.168.1.1', now + i * 1000)
      }

      const storedData = kv.store.get('auth:lockout:192.168.1.1')
      const state = JSON.parse(storedData!) as AuthLockoutState
      expect(state.lockedUntil).toBeGreaterThan(now)
      expect(state.lockoutCount).toBe(1)
    })

    it('resets counter when window expires', async () => {
      const kv = createMockKV()
      const now = Date.now()

      // First attempt
      await recordFailedAttempt(kv, '192.168.1.1', now)

      // Wait for window to expire
      const afterWindow = now + AUTH_LOCKOUT_ATTEMPT_WINDOW_SECONDS * 1000 + 1000
      await recordFailedAttempt(kv, '192.168.1.1', afterWindow)

      const storedData = kv.store.get('auth:lockout:192.168.1.1')
      const state = JSON.parse(storedData!) as AuthLockoutState
      expect(state.failedAttempts).toBe(1) // Reset to 1, not 2
      expect(state.firstAttemptAt).toBe(afterWindow)
    })

    it('applies progressive lockout duration', async () => {
      const kv = createMockKV()
      const now = Date.now()

      // First lockout cycle
      for (let i = 0; i < AUTH_LOCKOUT_MAX_ATTEMPTS; i++) {
        await recordFailedAttempt(kv, '192.168.1.1', now + i * 1000)
      }

      let state = JSON.parse(kv.store.get('auth:lockout:192.168.1.1')!) as AuthLockoutState
      const firstLockoutDuration = state.lockedUntil! - (now + 4000)
      expect(firstLockoutDuration).toBe(30 * 1000) // 30 seconds

      // Wait for first lockout to expire
      const afterFirstLockout = state.lockedUntil! + 1000

      // Second lockout cycle
      for (let i = 0; i < AUTH_LOCKOUT_MAX_ATTEMPTS; i++) {
        await recordFailedAttempt(kv, '192.168.1.1', afterFirstLockout + i * 1000)
      }

      state = JSON.parse(kv.store.get('auth:lockout:192.168.1.1')!) as AuthLockoutState
      expect(state.lockoutCount).toBe(2)
    })
  })

  describe('clearAuthLockout', () => {
    it('removes lockout state', async () => {
      const kv = createMockKV()
      kv.store.set(
        'auth:lockout:192.168.1.1',
        JSON.stringify({
          failedAttempts: 3,
          firstAttemptAt: Date.now(),
          lockedUntil: null,
          lockoutCount: 0,
        })
      )

      await clearAuthLockout(kv, '192.168.1.1')

      expect(kv.store.get('auth:lockout:192.168.1.1')).toBeUndefined()
    })
  })

  describe('isAuthRequest', () => {
    it('detects POST to /login', () => {
      expect(isAuthRequest('/login', 'POST')).toBe(true)
    })

    it('detects GET to /login (iOS Safari bug)', () => {
      expect(isAuthRequest('/login', 'GET')).toBe(true)
    })

    it('detects authentication endpoint', () => {
      expect(isAuthRequest('/sportmanager.security/authentication/authenticate', 'POST')).toBe(true)
    })

    it('rejects non-auth paths', () => {
      expect(isAuthRequest('/dashboard', 'GET')).toBe(false)
      expect(isAuthRequest('/indoorvolleyball.refadmin/api/test', 'POST')).toBe(false)
    })

    it('rejects other methods on auth paths', () => {
      expect(isAuthRequest('/login', 'PUT')).toBe(false)
      expect(isAuthRequest('/login', 'DELETE')).toBe(false)
    })
  })

  describe('isFailedLoginResponse', () => {
    function mockResponse(
      status: number,
      location?: string
    ): { status: number; headers: { get: (name: string) => string | null } } {
      return {
        status,
        headers: {
          get: (name: string) => (name === 'Location' ? (location ?? null) : null),
        },
      }
    }

    it('detects redirect to login page', () => {
      expect(isFailedLoginResponse(mockResponse(302, '/login'))).toBe(true)
    })

    it('detects redirect to root', () => {
      expect(isFailedLoginResponse(mockResponse(302, '/'))).toBe(true)
    })

    it('detects redirect to authentication endpoint', () => {
      expect(
        isFailedLoginResponse(mockResponse(302, '/sportmanager.security/authentication/login'))
      ).toBe(true)
    })

    it('detects 401 Unauthorized', () => {
      expect(isFailedLoginResponse(mockResponse(401))).toBe(true)
    })

    it('detects 403 Forbidden', () => {
      expect(isFailedLoginResponse(mockResponse(403))).toBe(true)
    })

    it('detects error indicator in body', () => {
      expect(
        isFailedLoginResponse(mockResponse(200), '<div color="error">Invalid credentials</div>')
      ).toBe(true)
    })

    it('detects login form in body (credentials rejected)', () => {
      const loginHtml = `
        <html>
          <form>
            <input name="username" />
            <input name="password" />
            <button>Login</button>
          </form>
        </html>
      `
      expect(isFailedLoginResponse(mockResponse(200), loginHtml)).toBe(true)
    })

    it('returns false for normal redirect', () => {
      expect(isFailedLoginResponse(mockResponse(302, '/dashboard'))).toBe(false)
    })

    it('returns false for normal 200 response', () => {
      expect(isFailedLoginResponse(mockResponse(200), '<html>Dashboard</html>')).toBe(false)
    })
  })

  describe('isSuccessfulLoginResponse', () => {
    function mockResponse(
      status: number,
      headers: Record<string, string> = {}
    ): { status: number; headers: { get: (name: string) => string | null } } {
      return {
        status,
        headers: {
          get: (name: string) => headers[name] ?? null,
        },
      }
    }

    it('detects redirect to dashboard', () => {
      expect(
        isSuccessfulLoginResponse(
          mockResponse(302, { Location: '/sportmanager.volleyball/main/dashboard' })
        )
      ).toBe(true)
    })

    it('detects redirect with CSRF token', () => {
      expect(
        isSuccessfulLoginResponse(mockResponse(302, { Location: '/dashboard?__csrftoken=abc123' }))
      ).toBe(true)
    })

    it('detects session cookie in 200 response', () => {
      expect(
        isSuccessfulLoginResponse(
          mockResponse(200, { 'Set-Cookie': 'Neos_Session=abc123; Path=/' })
        )
      ).toBe(true)
    })

    it('detects redirect to /indoor/ path', () => {
      expect(
        isSuccessfulLoginResponse(
          mockResponse(302, { Location: 'https://volleymanager.volleyball.ch/indoor/start' })
        )
      ).toBe(true)
    })

    it('returns false for redirect to login', () => {
      expect(isSuccessfulLoginResponse(mockResponse(302, { Location: '/login' }))).toBe(false)
    })

    it('returns false for redirect to login with query params', () => {
      expect(
        isSuccessfulLoginResponse(mockResponse(302, { Location: '/login?error=invalid' }))
      ).toBe(false)
    })

    it('returns false for redirect to root path without session cookie', () => {
      expect(
        isSuccessfulLoginResponse(
          mockResponse(302, { Location: 'https://volleymanager.volleyball.ch/' })
        )
      ).toBe(false)
    })

    it('detects redirect to root with session cookie', () => {
      // If session cookie is set, login succeeded even if redirecting to root
      expect(
        isSuccessfulLoginResponse(
          mockResponse(302, {
            Location: 'https://volleymanager.volleyball.ch/',
            'Set-Cookie': 'Neos_Session=abc123; Path=/',
          })
        )
      ).toBe(true)
    })

    it('returns false for redirect to authentication endpoint', () => {
      expect(
        isSuccessfulLoginResponse(
          mockResponse(302, { Location: '/sportmanager.security/authentication' })
        )
      ).toBe(false)
    })

    it('returns false for 200 without session cookie', () => {
      expect(isSuccessfulLoginResponse(mockResponse(200))).toBe(false)
    })
  })
})
