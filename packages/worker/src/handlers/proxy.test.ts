import { describe, it, expect, vi, beforeEach } from 'vitest'

interface JsonBody {
  [key: string]: unknown
  success?: boolean
  redirectUrl?: string
  sessionCaptured?: boolean
  error?: string
  lockedUntil?: number
  message?: string
}

/**
 * Create a mock Response with getSetCookie support.
 * The proxy handler uses getSetCookie() to handle multiple Set-Cookie headers.
 */
function createUpstreamResponse(
  body: string | null,
  init: ResponseInit & { cookies?: string[] } = {}
) {
  const { cookies = [], ...responseInit } = init
  const response = new Response(body, responseInit)

  const headers = response.headers as Headers & { getSetCookie: () => string[] }
  headers.getSetCookie = () => cookies

  return response
}

describe('Integration: proxy handler', () => {
  // Paths that isAllowedPath accepts
  const ALLOWED_PATH = '/sportmanager.security/dashboard'
  // Auth credentials in simple form format (what hasAuthCredentials checks for)
  const AUTH_BODY = 'username=user&password=pass'

  function createMockEnv(overrides: Record<string, unknown> = {}) {
    return {
      ALLOWED_ORIGINS: 'https://example.com',
      TARGET_HOST: 'https://volleymanager.volleyball.ch',
      RATE_LIMITER: {
        limit: vi.fn().mockResolvedValue({ success: true }),
      },
      ...overrides,
    }
  }

  function createRequest(path: string, options: RequestInit & { origin?: string } = {}) {
    const { origin = 'https://example.com', ...init } = options
    const headers = new Headers(init.headers)
    if (origin) headers.set('Origin', origin)
    return new Request(`https://proxy.example.com${path}`, { ...init, headers })
  }

  beforeEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
  })

  describe('path safety validation', () => {
    it('returns 400 for path with double slashes', async () => {
      const { default: worker } = await import('../index')
      const mockEnv = createMockEnv()

      const response = await worker.fetch(
        createRequest('/sportmanager.security//etc/passwd'),
        mockEnv
      )

      expect(response.status).toBe(400)
      expect(await response.text()).toBe('Bad Request: Invalid path')
    })
  })

  describe('path allowlist', () => {
    it('returns 404 for non-allowed paths', async () => {
      const { default: worker } = await import('../index')
      const mockEnv = createMockEnv()

      const response = await worker.fetch(createRequest('/not-allowed-path'), mockEnv)

      expect(response.status).toBe(404)
      expect(await response.text()).toBe('Not Found: Path not proxied')
    })

    it('includes CORS and security headers on 404 response', async () => {
      const { default: worker } = await import('../index')
      const mockEnv = createMockEnv()

      const response = await worker.fetch(createRequest('/not-allowed-path'), mockEnv)

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://example.com')
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
    })
  })

  describe('auth lockout', () => {
    it('returns 423 when IP is locked out on auth request', async () => {
      const { default: worker } = await import('../index')
      const now = Date.now()
      const lockedUntilTime = now + 60_000
      const mockEnv = createMockEnv({
        AUTH_LOCKOUT: {
          get: vi.fn().mockResolvedValue(
            JSON.stringify({
              failedAttempts: 10,
              firstAttemptAt: now - 30_000,
              lockedUntil: lockedUntilTime,
              lockoutCount: 2,
            })
          ),
          put: vi.fn(),
          delete: vi.fn(),
        },
      })

      // Use GET to /login (an auth request) to avoid duplex body issue
      const request = createRequest('/login', {
        method: 'GET',
        headers: {
          'CF-Connecting-IP': '1.2.3.4',
        },
      })

      const response = await worker.fetch(request, mockEnv)

      expect(response.status).toBe(423)
      const body = (await response.json()) as JsonBody
      expect(body.error).toBe('Too many failed login attempts')
      expect(response.headers.get('Retry-After')).toBeTruthy()
    })

    it('skips lockout check when CF-Connecting-IP is absent', async () => {
      const { default: worker } = await import('../index')
      const mockFetch = vi.fn().mockResolvedValue(createUpstreamResponse('OK', { status: 200 }))
      vi.stubGlobal('fetch', mockFetch)

      const mockEnv = createMockEnv({
        AUTH_LOCKOUT: {
          get: vi.fn(),
          put: vi.fn(),
          delete: vi.fn(),
        },
      })

      // Use GET to /login without body to avoid duplex issue
      const request = createRequest('/login')

      const response = await worker.fetch(request, mockEnv)

      expect(response.status).not.toBe(423)
      expect(mockEnv.AUTH_LOCKOUT.get).not.toHaveBeenCalled()
    })
  })

  describe('proxy request forwarding', () => {
    it('forwards request to target host with correct headers', async () => {
      const { default: worker } = await import('../index')
      const mockFetch = vi.fn().mockResolvedValue(
        createUpstreamResponse('{"data": "test"}', {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      vi.stubGlobal('fetch', mockFetch)

      const mockEnv = createMockEnv()
      const response = await worker.fetch(createRequest(ALLOWED_PATH, { method: 'GET' }), mockEnv)

      expect(response.status).toBe(200)
      expect(mockFetch).toHaveBeenCalledTimes(1)

      const fetchedRequest = mockFetch.mock.calls[0][0] as Request
      expect(fetchedRequest.url).toContain('volleymanager.volleyball.ch')
      expect(fetchedRequest.headers.get('Host')).toBe('volleymanager.volleyball.ch')
    })

    it('adds CORS headers to response', async () => {
      const { default: worker } = await import('../index')
      const mockFetch = vi.fn().mockResolvedValue(createUpstreamResponse('OK', { status: 200 }))
      vi.stubGlobal('fetch', mockFetch)

      const mockEnv = createMockEnv()
      const response = await worker.fetch(createRequest(ALLOWED_PATH), mockEnv)

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://example.com')
      expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true')
    })

    it('adds security headers to response', async () => {
      const { default: worker } = await import('../index')
      const mockFetch = vi.fn().mockResolvedValue(createUpstreamResponse('OK', { status: 200 }))
      vi.stubGlobal('fetch', mockFetch)

      const mockEnv = createMockEnv()
      const response = await worker.fetch(createRequest(ALLOWED_PATH), mockEnv)

      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
      expect(response.headers.get('X-Frame-Options')).toBe('SAMEORIGIN')
    })

    it('sets redirect to manual', async () => {
      const { default: worker } = await import('../index')
      const mockFetch = vi.fn().mockResolvedValue(createUpstreamResponse('OK', { status: 200 }))
      vi.stubGlobal('fetch', mockFetch)

      const mockEnv = createMockEnv()
      await worker.fetch(createRequest(ALLOWED_PATH), mockEnv)

      const fetchedRequest = mockFetch.mock.calls[0][0] as Request
      expect(fetchedRequest.redirect).toBe('manual')
    })

    it('rewrites Origin and Referer to target host', async () => {
      const { default: worker } = await import('../index')
      const mockFetch = vi.fn().mockResolvedValue(createUpstreamResponse('OK', { status: 200 }))
      vi.stubGlobal('fetch', mockFetch)

      const mockEnv = createMockEnv()
      const request = createRequest(ALLOWED_PATH, {
        headers: {
          Referer: 'https://example.com/some/page?debug=1',
        },
      })

      await worker.fetch(request, mockEnv)

      const fetchedRequest = mockFetch.mock.calls[0][0] as Request
      expect(fetchedRequest.headers.get('Origin')).toBe('https://volleymanager.volleyball.ch')
      const referer = fetchedRequest.headers.get('Referer')
      expect(referer).toContain('volleymanager.volleyball.ch')
      expect(referer).not.toContain('debug')
    })

    it('sets VolleyKit user agent', async () => {
      const { default: worker } = await import('../index')
      const mockFetch = vi.fn().mockResolvedValue(createUpstreamResponse('OK', { status: 200 }))
      vi.stubGlobal('fetch', mockFetch)

      const mockEnv = createMockEnv()
      await worker.fetch(createRequest(ALLOWED_PATH), mockEnv)

      const fetchedRequest = mockFetch.mock.calls[0][0] as Request
      expect(fetchedRequest.headers.get('User-Agent')).toContain('VolleyKit')
    })
  })

  describe('cache control', () => {
    it('adds no-cache headers for dynamic JSON content', async () => {
      const { default: worker } = await import('../index')
      const mockFetch = vi.fn().mockResolvedValue(
        createUpstreamResponse('{"data": true}', {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ETag: '"abc123"',
          },
        })
      )
      vi.stubGlobal('fetch', mockFetch)

      const mockEnv = createMockEnv()
      const response = await worker.fetch(createRequest(ALLOWED_PATH), mockEnv)

      expect(response.headers.get('Cache-Control')).toContain('no-store')
      expect(response.headers.get('ETag')).toBeNull()
    })

    it('adds proxy timing header', async () => {
      const { default: worker } = await import('../index')
      const mockFetch = vi.fn().mockResolvedValue(createUpstreamResponse('OK', { status: 200 }))
      vi.stubGlobal('fetch', mockFetch)

      const mockEnv = createMockEnv()
      const response = await worker.fetch(createRequest(ALLOWED_PATH), mockEnv)

      const timestamp = response.headers.get('X-Proxy-Timestamp')
      expect(timestamp).toBeTruthy()
      expect(timestamp).toContain('latency=')
    })
  })

  describe('iOS Safari workaround', () => {
    it('rewrites /login POST with auth credentials to auth endpoint', async () => {
      const { default: worker } = await import('../index')
      const mockFetch = vi.fn().mockResolvedValue(createUpstreamResponse('OK', { status: 200 }))
      vi.stubGlobal('fetch', mockFetch)

      const mockEnv = createMockEnv()
      const request = createRequest('/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: AUTH_BODY,
      })

      await worker.fetch(request, mockEnv)

      const fetchedRequest = mockFetch.mock.calls[0][0] as Request
      expect(fetchedRequest.url).toContain('authentication')
    })

    it('converts GET /login with auth credentials to POST', async () => {
      const { default: worker } = await import('../index')
      const mockFetch = vi.fn().mockResolvedValue(createUpstreamResponse('OK', { status: 200 }))
      vi.stubGlobal('fetch', mockFetch)

      const mockEnv = createMockEnv()
      const request = createRequest('/login?username=user&password=pass')

      await worker.fetch(request, mockEnv)

      const fetchedRequest = mockFetch.mock.calls[0][0] as Request
      expect(fetchedRequest.method).toBe('POST')
      expect(fetchedRequest.headers.get('Content-Type')).toBe('application/x-www-form-urlencoded')
    })
  })

  describe('redirect handling', () => {
    it('rewrites internal redirects to go through proxy', async () => {
      const { default: worker } = await import('../index')
      const mockFetch = vi.fn().mockResolvedValue(
        createUpstreamResponse(null, {
          status: 302,
          headers: {
            Location: 'https://volleymanager.volleyball.ch/dashboard',
          },
        })
      )
      vi.stubGlobal('fetch', mockFetch)

      const mockEnv = createMockEnv()
      const response = await worker.fetch(createRequest(ALLOWED_PATH), mockEnv)

      expect(response.status).toBe(302)
      const location = response.headers.get('Location')
      expect(location).toContain('proxy.example.com')
      expect(location).toContain('/dashboard')
    })

    it('converts auth POST redirect to JSON for iOS Safari PWA', async () => {
      const { default: worker } = await import('../index')
      const mockFetch = vi.fn().mockResolvedValue(
        createUpstreamResponse(null, {
          status: 302,
          headers: {
            Location: 'https://volleymanager.volleyball.ch/dashboard',
          },
        })
      )
      vi.stubGlobal('fetch', mockFetch)

      const mockEnv = createMockEnv()
      const request = createRequest('/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: AUTH_BODY,
      })

      const response = await worker.fetch(request, mockEnv)

      // Should be converted to 200 JSON for iOS Safari
      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('application/json')
      const body = (await response.json()) as JsonBody
      expect(body.redirectUrl).toBeTruthy()
    })
  })

  describe('cookie rewriting', () => {
    it('rewrites Set-Cookie for cross-origin with SameSite=None', async () => {
      const { default: worker } = await import('../index')
      const mockFetch = vi.fn().mockResolvedValue(
        createUpstreamResponse('OK', {
          status: 200,
          cookies: ['session_id=abc123; Path=/; HttpOnly'],
        })
      )
      vi.stubGlobal('fetch', mockFetch)

      const mockEnv = createMockEnv()
      const response = await worker.fetch(createRequest(ALLOWED_PATH), mockEnv)

      const setCookie = response.headers.get('Set-Cookie')
      expect(setCookie).toBeTruthy()
      expect(setCookie).toContain('SameSite=None')
      expect(setCookie).toContain('Secure')
      expect(setCookie).toContain('Partitioned')
    })
  })

  describe('session token relay', () => {
    it('merges base64-encoded X-Session-Token into Cookie header', async () => {
      const { default: worker } = await import('../index')
      const mockFetch = vi.fn().mockResolvedValue(createUpstreamResponse('OK', { status: 200 }))
      vi.stubGlobal('fetch', mockFetch)

      const mockEnv = createMockEnv()
      // mergeSessionCookies expects base64-encoded session token
      const sessionCookie = btoa('Neos_Session=abc123')
      const request = createRequest(ALLOWED_PATH, {
        headers: {
          'X-Session-Token': sessionCookie,
        },
      })

      await worker.fetch(request, mockEnv)

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const fetchedRequest = mockFetch.mock.calls[0][0] as Request
      const cookie = fetchedRequest.headers.get('Cookie')
      expect(cookie).toContain('Neos_Session=abc123')
    })
  })

  describe('error handling', () => {
    it('returns 502 on fetch error', async () => {
      const { default: worker } = await import('../index')
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'))
      vi.stubGlobal('fetch', mockFetch)

      const mockEnv = createMockEnv()
      const response = await worker.fetch(createRequest(ALLOWED_PATH), mockEnv)

      expect(response.status).toBe(502)
      expect(await response.text()).toBe('Proxy Error')
    })
  })
})
