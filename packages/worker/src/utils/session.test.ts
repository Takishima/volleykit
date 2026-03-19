import { describe, it, expect } from 'vitest'

import { detectSessionIssue } from './session'

describe('Session Issue Detection', () => {
  // Helper to create mock response
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

  describe('detectSessionIssue', () => {
    it('detects redirect to /login', () => {
      expect(detectSessionIssue(mockResponse(302, '/login'))).toBe(true)
      expect(detectSessionIssue(mockResponse(303, '/login?redirect=...'))).toBe(true)
    })

    it('detects redirect to root (often login redirect)', () => {
      expect(detectSessionIssue(mockResponse(302, '/'))).toBe(true)
      expect(detectSessionIssue(mockResponse(302, 'https://example.com/'))).toBe(true)
    })

    it('detects redirect to authentication endpoint', () => {
      expect(
        detectSessionIssue(mockResponse(302, '/sportmanager.security/authentication/login'))
      ).toBe(true)
    })

    it('detects 401 Unauthorized responses', () => {
      expect(detectSessionIssue(mockResponse(401))).toBe(true)
    })

    it('detects 403 Forbidden responses', () => {
      expect(detectSessionIssue(mockResponse(403))).toBe(true)
    })

    it('detects login form in HTML body', () => {
      const loginHtml = `
        <html>
          <body>
            <form>
              <input name="username" type="text" />
              <input name="password" type="password" />
              <button>Login</button>
            </form>
          </body>
        </html>
      `
      expect(detectSessionIssue(mockResponse(200), loginHtml)).toBe(true)
    })

    it('does not flag normal 200 responses', () => {
      expect(detectSessionIssue(mockResponse(200))).toBe(false)
    })

    it('does not flag redirects to non-login paths', () => {
      expect(detectSessionIssue(mockResponse(302, '/dashboard'))).toBe(false)
      expect(detectSessionIssue(mockResponse(302, '/api/data'))).toBe(false)
    })

    it('does not flag normal HTML without login form', () => {
      const normalHtml = `
        <html>
          <body>
            <h1>Dashboard</h1>
            <p>Welcome to the application</p>
          </body>
        </html>
      `
      expect(detectSessionIssue(mockResponse(200), normalHtml)).toBe(false)
    })

    it('does not flag HTML with only username field (not a complete login form)', () => {
      const partialForm = `
        <html>
          <body>
            <form>
              <input name="username" type="text" />
              <button>Search</button>
            </form>
          </body>
        </html>
      `
      expect(detectSessionIssue(mockResponse(200), partialForm)).toBe(false)
    })

    it('handles case-insensitive location headers', () => {
      expect(detectSessionIssue(mockResponse(302, '/LOGIN'))).toBe(true)
      expect(detectSessionIssue(mockResponse(302, '/Authentication/Login'))).toBe(true)
    })
  })
})
