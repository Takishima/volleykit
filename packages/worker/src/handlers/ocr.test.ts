import { describe, it, expect, vi } from 'vitest'
import { OCR_MAX_FILE_SIZE_BYTES } from '../utils'

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

describe('Integration: /ocr endpoint origin validation', () => {
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

    const request = new Request('https://proxy.example.com/ocr', {
      method: 'POST',
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

    const request = new Request('https://proxy.example.com/ocr', {
      method: 'POST',
    })
    // No Origin header

    const response = await worker.fetch(request, mockEnv)

    expect(response.status).toBe(403)
    expect(await response.text()).toBe('Forbidden: Origin not allowed')
    // No CORS headers when origin is null
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull()
  })
})

describe('Integration: OCR Endpoint', () => {
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

  it('returns 405 for non-POST methods', async () => {
    const { default: worker } = await import('../index')
    const mockEnv = createMockEnv()

    const request = new Request('https://proxy.example.com/ocr', {
      method: 'GET',
      headers: {
        Origin: 'https://example.com',
      },
    })

    const response = await worker.fetch(request, mockEnv)

    expect(response.status).toBe(405)
    expect(await response.json()).toEqual({ error: 'Method Not Allowed' })
    expect(response.headers.get('Allow')).toBe('POST')
  })

  it('handles CORS preflight for OCR endpoint', async () => {
    const { default: worker } = await import('../index')
    const mockEnv = createMockEnv()

    const request = new Request('https://proxy.example.com/ocr', {
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

  it('returns 503 when Mistral API key is not configured', async () => {
    const { default: worker } = await import('../index')
    const mockEnv = {
      ...createMockEnv(),
      MISTRAL_API_KEY: undefined,
    }

    const formData = new FormData()
    formData.append('image', new Blob(['fake image'], { type: 'image/jpeg' }))

    const request = new Request('https://proxy.example.com/ocr', {
      method: 'POST',
      headers: {
        Origin: 'https://example.com',
      },
      body: formData,
    })

    const response = await worker.fetch(request, mockEnv)
    const body = (await response.json()) as JsonBody

    expect(response.status).toBe(503)
    expect(body.error).toBe('OCR service not configured')
  })

  it('returns 400 when image field is missing', async () => {
    const { default: worker } = await import('../index')
    const mockEnv = createMockEnv()

    const formData = new FormData()
    formData.append('other_field', 'some value')

    const request = new Request('https://proxy.example.com/ocr', {
      method: 'POST',
      headers: {
        Origin: 'https://example.com',
      },
      body: formData,
    })

    const response = await worker.fetch(request, mockEnv)
    const body = (await response.json()) as JsonBody

    expect(response.status).toBe(400)
    expect(body.error).toBe("Missing 'image' field in form data")
  })

  it('returns 400 for unsupported file types', async () => {
    const { default: worker } = await import('../index')
    const mockEnv = createMockEnv()

    const formData = new FormData()
    formData.append('image', new Blob(['fake data'], { type: 'application/octet-stream' }))

    const request = new Request('https://proxy.example.com/ocr', {
      method: 'POST',
      headers: {
        Origin: 'https://example.com',
      },
      body: formData,
    })

    const response = await worker.fetch(request, mockEnv)
    const body = (await response.json()) as JsonBody

    expect(response.status).toBe(400)
    expect(body.error).toContain('Unsupported file type')
  })

  it('returns 400 for files exceeding size limit', { timeout: 30_000 }, async () => {
    const { default: worker } = await import('../index')
    const mockEnv = createMockEnv()

    // Create a file larger than the limit
    const largeContent = new Uint8Array(OCR_MAX_FILE_SIZE_BYTES + 1)
    const formData = new FormData()
    formData.append('image', new Blob([largeContent], { type: 'image/jpeg' }))

    const request = new Request('https://proxy.example.com/ocr', {
      method: 'POST',
      headers: {
        Origin: 'https://example.com',
      },
      body: formData,
    })

    const response = await worker.fetch(request, mockEnv)
    const body = (await response.json()) as JsonBody

    expect(response.status).toBe(400)
    expect(body.error).toContain('File too large')
    expect(body.error).toContain('Maximum: 50MB')
  })

  it('returns 429 when rate limited', async () => {
    const { default: worker } = await import('../index')
    const mockEnv = {
      ...createMockEnv(),
      RATE_LIMITER: {
        limit: vi.fn().mockResolvedValue({ success: false }),
      },
    }

    const formData = new FormData()
    formData.append('image', new Blob(['fake image'], { type: 'image/jpeg' }))

    const request = new Request('https://proxy.example.com/ocr', {
      method: 'POST',
      headers: {
        Origin: 'https://example.com',
        'CF-Connecting-IP': '192.168.1.1',
      },
      body: formData,
    })

    const response = await worker.fetch(request, mockEnv)
    const body = (await response.json()) as JsonBody

    expect(response.status).toBe(429)
    expect(body.error).toBe('Too many requests')
    expect(response.headers.get('Retry-After')).toBeDefined()
  })

  it('returns 503 when Mistral API returns 401', async () => {
    const { default: worker } = await import('../index')
    const mockEnv = createMockEnv()

    // Mock Mistral API returning 401
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Unauthorized', { status: 401 })))

    const formData = new FormData()
    formData.append('image', new Blob(['fake image data'], { type: 'image/jpeg' }))

    const request = new Request('https://proxy.example.com/ocr', {
      method: 'POST',
      headers: {
        Origin: 'https://example.com',
      },
      body: formData,
    })

    const response = await worker.fetch(request, mockEnv)
    const body = (await response.json()) as JsonBody

    expect(response.status).toBe(503)
    expect(body.error).toBe('OCR service authentication failed')

    vi.unstubAllGlobals()
  })

  it('returns 429 when Mistral API is rate limited', async () => {
    const { default: worker } = await import('../index')
    const mockEnv = createMockEnv()

    // Mock Mistral API returning 429
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Rate limited', { status: 429 })))

    const formData = new FormData()
    formData.append('image', new Blob(['fake image data'], { type: 'image/jpeg' }))

    const request = new Request('https://proxy.example.com/ocr', {
      method: 'POST',
      headers: {
        Origin: 'https://example.com',
      },
      body: formData,
    })

    const response = await worker.fetch(request, mockEnv)
    const body = (await response.json()) as JsonBody

    expect(response.status).toBe(429)
    expect(body.error).toBe('OCR service rate limit exceeded')

    vi.unstubAllGlobals()
  })

  it('returns 502 when Mistral API returns other errors', async () => {
    const { default: worker } = await import('../index')
    const mockEnv = createMockEnv()

    // Mock Mistral API returning 500
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Server Error', { status: 500 })))

    const formData = new FormData()
    formData.append('image', new Blob(['fake image data'], { type: 'image/jpeg' }))

    const request = new Request('https://proxy.example.com/ocr', {
      method: 'POST',
      headers: {
        Origin: 'https://example.com',
      },
      body: formData,
    })

    const response = await worker.fetch(request, mockEnv)
    const body = (await response.json()) as JsonBody

    expect(response.status).toBe(502)
    expect(body.error).toBe('OCR processing failed')

    vi.unstubAllGlobals()
  })

  it('returns OCR results on success', async () => {
    const { default: worker } = await import('../index')
    const mockEnv = createMockEnv()

    const mockOcrResult = {
      pages: [{ markdown: 'Extracted text from image' }],
    }

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify(mockOcrResult), { status: 200 }))
    )

    const formData = new FormData()
    formData.append('image', new Blob(['fake image data'], { type: 'image/jpeg' }))

    const request = new Request('https://proxy.example.com/ocr', {
      method: 'POST',
      headers: {
        Origin: 'https://example.com',
      },
      body: formData,
    })

    const response = await worker.fetch(request, mockEnv)
    const body = (await response.json()) as JsonBody

    expect(response.status).toBe(200)
    expect(body).toEqual(mockOcrResult)

    vi.unstubAllGlobals()
  })

  it('accepts all supported MIME types', async () => {
    const { default: worker } = await import('../index')
    const mockEnv = createMockEnv()

    const mockOcrResult = { pages: [{ markdown: 'text' }] }

    // Create a factory function that returns a new Response for each call
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockImplementation(() =>
          Promise.resolve(new Response(JSON.stringify(mockOcrResult), { status: 200 }))
        )
    )

    const supportedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

    for (const mimeType of supportedTypes) {
      const formData = new FormData()
      formData.append('image', new Blob(['fake data'], { type: mimeType }))

      const request = new Request('https://proxy.example.com/ocr', {
        method: 'POST',
        headers: {
          Origin: 'https://example.com',
        },
        body: formData,
      })

      const response = await worker.fetch(request, mockEnv)
      expect(response.status).toBe(200)
    }

    vi.unstubAllGlobals()
  })
})
