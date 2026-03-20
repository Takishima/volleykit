import { describe, it, expect, vi } from 'vitest'

interface JsonBody {
  [key: string]: unknown
  status?: string
  timestamp?: string
  services?: {
    proxy?: string
    mistral_ocr?: string
    mistral_ocr_error?: string
  }
  workerGitHash?: string
  success?: boolean
  redirectUrl?: string
  sessionCaptured?: boolean
  error?: string
  lockedUntil?: number
  message?: string
  pages?: unknown[]
}

describe('Integration: OJP Endpoint', () => {
  function createMockEnv() {
    return {
      ALLOWED_ORIGINS: 'https://example.com',
      TARGET_HOST: 'https://volleymanager.volleyball.ch',
      RATE_LIMITER: {
        limit: vi.fn().mockResolvedValue({ success: true }),
      },
      OJP_API_KEY: 'test-ojp-key',
    }
  }

  it('returns 403 for disallowed origin', async () => {
    const { default: worker } = await import('../index')
    const mockEnv = createMockEnv()

    const request = new Request('https://proxy.example.com/ojp', {
      method: 'POST',
      headers: {
        Origin: 'https://evil.com',
        'Content-Type': 'application/xml',
      },
      body: '<OJP/>',
    })

    const response = await worker.fetch(request, mockEnv)

    expect(response.status).toBe(403)
    expect(await response.text()).toBe('Forbidden: Origin not allowed')
  })

  it('returns 403 without CORS headers when origin is missing', async () => {
    const { default: worker } = await import('../index')
    const mockEnv = createMockEnv()

    const request = new Request('https://proxy.example.com/ojp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/xml' },
      body: '<OJP/>',
    })

    const response = await worker.fetch(request, mockEnv)

    expect(response.status).toBe(403)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull()
  })

  it('handles CORS preflight', async () => {
    const { default: worker } = await import('../index')
    const mockEnv = createMockEnv()

    const request = new Request('https://proxy.example.com/ojp', {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://example.com',
      },
    })

    const response = await worker.fetch(request, mockEnv)

    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://example.com')
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST')
  })

  it('returns 405 for non-POST methods', async () => {
    const { default: worker } = await import('../index')
    const mockEnv = createMockEnv()

    const request = new Request('https://proxy.example.com/ojp', {
      method: 'GET',
      headers: {
        Origin: 'https://example.com',
      },
    })

    const response = await worker.fetch(request, mockEnv)

    expect(response.status).toBe(405)
    expect(await response.text()).toBe('Method Not Allowed')
    expect(response.headers.get('Allow')).toBe('POST')
  })

  it('returns 503 when OJP API key is not configured', async () => {
    const { default: worker } = await import('../index')
    const mockEnv = {
      ...createMockEnv(),
      OJP_API_KEY: undefined,
    }

    const request = new Request('https://proxy.example.com/ojp', {
      method: 'POST',
      headers: {
        Origin: 'https://example.com',
        'Content-Type': 'application/xml',
      },
      body: '<OJP/>',
    })

    const response = await worker.fetch(request, mockEnv)
    const body = (await response.json()) as JsonBody

    expect(response.status).toBe(503)
    expect(body.error).toBe('OJP service not configured')
  })

  it('returns 413 for oversized request body', async () => {
    const { default: worker } = await import('../index')
    const mockEnv = createMockEnv()

    // 64KB + 1 byte
    const largeBody = 'x'.repeat(64 * 1024 + 1)

    const request = new Request('https://proxy.example.com/ojp', {
      method: 'POST',
      headers: {
        Origin: 'https://example.com',
        'Content-Type': 'application/xml',
      },
      body: largeBody,
    })

    const response = await worker.fetch(request, mockEnv)
    const body = (await response.json()) as JsonBody

    expect(response.status).toBe(413)
    expect(body.error).toBe('Request body too large')
  })

  it('returns 429 when rate limited', async () => {
    const { default: worker } = await import('../index')
    const mockEnv = {
      ...createMockEnv(),
      RATE_LIMITER: {
        limit: vi.fn().mockResolvedValue({ success: false }),
      },
    }

    const request = new Request('https://proxy.example.com/ojp', {
      method: 'POST',
      headers: {
        Origin: 'https://example.com',
        'CF-Connecting-IP': '192.168.1.1',
        'Content-Type': 'application/xml',
      },
      body: '<OJP/>',
    })

    const response = await worker.fetch(request, mockEnv)
    const body = (await response.json()) as JsonBody

    expect(response.status).toBe(429)
    expect(body.error).toBe('Too many requests')
    expect(response.headers.get('Retry-After')).toBe('60')
  })

  it('proxies successful OJP request', async () => {
    const { default: worker } = await import('../index')
    const mockEnv = createMockEnv()

    const mockOjpResponse = '<OJP><TripResult>...</TripResult></OJP>'

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(mockOjpResponse, {
          status: 200,
          headers: { 'Content-Type': 'application/xml' },
        })
      )
    )

    const request = new Request('https://proxy.example.com/ojp', {
      method: 'POST',
      headers: {
        Origin: 'https://example.com',
        'Content-Type': 'application/xml',
      },
      body: '<OJP><TripRequest/></OJP>',
    })

    const response = await worker.fetch(request, mockEnv)

    expect(response.status).toBe(200)
    expect(await response.text()).toBe(mockOjpResponse)
    expect(response.headers.get('Content-Type')).toBe('application/xml')
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://example.com')

    // Verify the upstream request included the API key
    const fetchMock = vi.mocked(globalThis.fetch)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.opentransportdata.swiss/ojp20',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-ojp-key',
        }),
      })
    )

    vi.unstubAllGlobals()
  })

  it('returns 503 when OJP API returns 401', async () => {
    const { default: worker } = await import('../index')
    const mockEnv = createMockEnv()

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Unauthorized', { status: 401 })))

    const request = new Request('https://proxy.example.com/ojp', {
      method: 'POST',
      headers: {
        Origin: 'https://example.com',
        'Content-Type': 'application/xml',
      },
      body: '<OJP/>',
    })

    const response = await worker.fetch(request, mockEnv)
    const body = (await response.json()) as JsonBody

    expect(response.status).toBe(503)
    expect(body.error).toBe('OJP service authentication failed')

    vi.unstubAllGlobals()
  })

  it('returns 429 when OJP API is rate limited', async () => {
    const { default: worker } = await import('../index')
    const mockEnv = createMockEnv()

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Rate limited', { status: 429 })))

    const request = new Request('https://proxy.example.com/ojp', {
      method: 'POST',
      headers: {
        Origin: 'https://example.com',
        'Content-Type': 'application/xml',
      },
      body: '<OJP/>',
    })

    const response = await worker.fetch(request, mockEnv)
    const body = (await response.json()) as JsonBody

    expect(response.status).toBe(429)
    expect(body.error).toBe('OJP service rate limit exceeded')

    vi.unstubAllGlobals()
  })

  it('returns 502 when OJP API returns other errors', async () => {
    const { default: worker } = await import('../index')
    const mockEnv = createMockEnv()

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Server Error', { status: 500 })))

    const request = new Request('https://proxy.example.com/ojp', {
      method: 'POST',
      headers: {
        Origin: 'https://example.com',
        'Content-Type': 'application/xml',
      },
      body: '<OJP/>',
    })

    const response = await worker.fetch(request, mockEnv)
    const body = (await response.json()) as JsonBody

    expect(response.status).toBe(502)
    expect(body.error).toBe('OJP request failed')

    vi.unstubAllGlobals()
  })

  it('returns 500 when OJP fetch fails', async () => {
    const { default: worker } = await import('../index')
    const mockEnv = createMockEnv()

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))

    const request = new Request('https://proxy.example.com/ojp', {
      method: 'POST',
      headers: {
        Origin: 'https://example.com',
        'Content-Type': 'application/xml',
      },
      body: '<OJP/>',
    })

    const response = await worker.fetch(request, mockEnv)
    const body = (await response.json()) as JsonBody

    expect(response.status).toBe(500)
    expect(body.error).toBe('Internal server error during OJP request')

    vi.unstubAllGlobals()
  })
})
