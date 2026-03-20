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

describe('Integration: /health endpoint origin validation', () => {
  function createMockEnv() {
    return {
      ALLOWED_ORIGINS: 'https://example.com',
      TARGET_HOST: 'https://volleymanager.volleyball.ch',
      RATE_LIMITER: {
        limit: vi.fn().mockResolvedValue({ success: true }),
      },
      MISTRAL_API_KEY: 'test-api-key',
    }
  }

  it('returns 403 with CORS headers when origin is provided but not allowed', async () => {
    const { default: worker } = await import('../index')
    const mockEnv = createMockEnv()

    const request = new Request('https://proxy.example.com/health', {
      headers: {
        Origin: 'https://malicious.com',
      },
    })

    const response = await worker.fetch(request, mockEnv)

    expect(response.status).toBe(403)
    expect(await response.text()).toBe('Forbidden: Origin not allowed')
    // CORS headers should be present so browser can read the error
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://malicious.com')
    expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true')
  })

  it('returns 403 without CORS headers when origin is missing', async () => {
    const { default: worker } = await import('../index')
    const mockEnv = createMockEnv()

    const request = new Request('https://proxy.example.com/health')
    // No Origin header

    const response = await worker.fetch(request, mockEnv)

    expect(response.status).toBe(403)
    expect(await response.text()).toBe('Forbidden: Origin not allowed')
    // No CORS headers when origin is null
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull()
  })

  it('returns 200 with Mistral status when API key is configured and API is healthy', async () => {
    const { default: worker } = await import('../index')
    const mockEnv = createMockEnv()

    // Mock fetch for Mistral API /v1/models endpoint
    const originalFetch = globalThis.fetch
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ data: [] }), { status: 200 }))

    try {
      const request = new Request('https://proxy.example.com/health', {
        headers: {
          Origin: 'https://example.com',
        },
      })

      const response = await worker.fetch(request, mockEnv)
      const body = (await response.json()) as JsonBody

      expect(response.status).toBe(200)
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://example.com')
      expect(body.status).toBe('ok')
      expect(body.services!.proxy).toBe('ok')
      expect(body.services!.mistral_ocr).toBe('ok')
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('returns 503 degraded status when Mistral API returns error', async () => {
    const { default: worker } = await import('../index')
    const mockEnv = createMockEnv()

    // Mock fetch for Mistral API returning 401
    const originalFetch = globalThis.fetch
    globalThis.fetch = vi.fn().mockResolvedValue(new Response('Unauthorized', { status: 401 }))

    try {
      const request = new Request('https://proxy.example.com/health', {
        headers: {
          Origin: 'https://example.com',
        },
      })

      const response = await worker.fetch(request, mockEnv)
      const body = (await response.json()) as JsonBody

      expect(response.status).toBe(503)
      expect(body.status).toBe('degraded')
      expect(body.services!.proxy).toBe('ok')
      expect(body.services!.mistral_ocr).toBe('error')
      expect(body.services!.mistral_ocr_error).toBe('Invalid API key')
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('returns 503 degraded status when Mistral API key is not configured', async () => {
    const { default: worker } = await import('../index')
    const mockEnv = {
      ...createMockEnv(),
      MISTRAL_API_KEY: undefined,
    }

    const request = new Request('https://proxy.example.com/health', {
      headers: {
        Origin: 'https://example.com',
      },
    })

    const response = await worker.fetch(request, mockEnv)
    const body = (await response.json()) as JsonBody

    expect(response.status).toBe(503)
    expect(body.status).toBe('degraded')
    expect(body.services!.proxy).toBe('ok')
    expect(body.services!.mistral_ocr).toBe('not_configured')
  })

  it('returns 503 degraded status when Mistral API connection fails', async () => {
    const { default: worker } = await import('../index')
    const mockEnv = createMockEnv()

    // Mock fetch to throw network error
    const originalFetch = globalThis.fetch
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    try {
      const request = new Request('https://proxy.example.com/health', {
        headers: {
          Origin: 'https://example.com',
        },
      })

      const response = await worker.fetch(request, mockEnv)
      const body = (await response.json()) as JsonBody

      expect(response.status).toBe(503)
      expect(body.status).toBe('degraded')
      expect(body.services!.proxy).toBe('ok')
      expect(body.services!.mistral_ocr).toBe('error')
      expect(body.services!.mistral_ocr_error).toBe('Network error')
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('returns 503 degraded status when Mistral API times out', async () => {
    const { default: worker } = await import('../index')
    const mockEnv = createMockEnv()

    // Mock fetch to simulate timeout via AbortError
    const originalFetch = globalThis.fetch
    globalThis.fetch = vi.fn().mockImplementation(() => {
      const error = new Error('The operation was aborted')
      error.name = 'AbortError'
      return Promise.reject(error)
    })

    try {
      const request = new Request('https://proxy.example.com/health', {
        headers: {
          Origin: 'https://example.com',
        },
      })

      const response = await worker.fetch(request, mockEnv)
      const body = (await response.json()) as JsonBody

      expect(response.status).toBe(503)
      expect(body.status).toBe('degraded')
      expect(body.services!.proxy).toBe('ok')
      expect(body.services!.mistral_ocr).toBe('error')
      expect(body.services!.mistral_ocr_error).toBe('Health check timed out')
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})

describe('Integration: /version endpoint', () => {
  function createMockEnv() {
    return {
      ALLOWED_ORIGINS: 'https://example.com',
      TARGET_HOST: 'https://volleymanager.volleyball.ch',
      RATE_LIMITER: {
        limit: vi.fn().mockResolvedValue({ success: true }),
      },
    }
  }

  it('returns 403 with CORS headers when origin is not allowed', async () => {
    const { default: worker } = await import('../index')
    const mockEnv = createMockEnv()

    const request = new Request('https://proxy.example.com/version', {
      headers: {
        Origin: 'https://malicious.com',
      },
    })

    const response = await worker.fetch(request, mockEnv)

    expect(response.status).toBe(403)
    expect(await response.text()).toBe('Forbidden: Origin not allowed')
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://malicious.com')
  })

  it('returns 403 without CORS headers when origin is missing', async () => {
    const { default: worker } = await import('../index')
    const mockEnv = createMockEnv()

    const request = new Request('https://proxy.example.com/version')

    const response = await worker.fetch(request, mockEnv)

    expect(response.status).toBe(403)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull()
  })

  it('returns version info for allowed origin', async () => {
    const { default: worker } = await import('../index')
    const mockEnv = createMockEnv()

    const request = new Request('https://proxy.example.com/version', {
      headers: {
        Origin: 'https://example.com',
      },
    })

    const response = await worker.fetch(request, mockEnv)

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('application/json')
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://example.com')
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=300')

    const body = (await response.json()) as JsonBody
    expect(body).toHaveProperty('workerGitHash')
    expect(body).toHaveProperty('timestamp')
    // Default value when not defined
    expect(body.workerGitHash).toBe('dev')
  })

  it('handles CORS preflight request', async () => {
    const { default: worker } = await import('../index')
    const mockEnv = createMockEnv()

    const request = new Request('https://proxy.example.com/version', {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://example.com',
      },
    })

    const response = await worker.fetch(request, mockEnv)

    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://example.com')
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET')
  })
})
