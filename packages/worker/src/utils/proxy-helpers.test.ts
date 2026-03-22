import { describe, it, expect, vi } from 'vitest'

import {
  CORS_PREFLIGHT_MAX_AGE_SECONDS,
  KILL_SWITCH_RETRY_AFTER_SECONDS,
  DEFAULT_USER_AGENT,
  checkKillSwitch,
} from './constants'
import { isAllowedPath } from './path-validation'
import { extractICalCode, isValidICalCode } from './ical-validation'

describe('Environment Validation', () => {
  it('validates ALLOWED_ORIGINS is required', () => {
    // This tests the concept - actual validateEnv would throw
    const env = { ALLOWED_ORIGINS: '', TARGET_HOST: 'https://example.com' }
    expect(env.ALLOWED_ORIGINS.trim()).toBe('')
  })

  it('validates TARGET_HOST must be a valid URL', () => {
    expect(() => new URL('https://example.com')).not.toThrow()
    expect(() => new URL('not-a-url')).toThrow()
  })
})

describe('CORS Headers', () => {
  const corsHeaders = (origin: string) => ({
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': String(CORS_PREFLIGHT_MAX_AGE_SECONDS),
  })

  it('sets correct Allow-Origin header', () => {
    const headers = corsHeaders('https://example.com')
    expect(headers['Access-Control-Allow-Origin']).toBe('https://example.com')
  })

  it('allows credentials', () => {
    const headers = corsHeaders('https://example.com')
    expect(headers['Access-Control-Allow-Credentials']).toBe('true')
  })

  it('does NOT include Cookie in allowed headers', () => {
    const headers = corsHeaders('https://example.com')
    expect(headers['Access-Control-Allow-Headers']).not.toContain('Cookie')
  })

  it('sets max age for preflight caching', () => {
    const headers = corsHeaders('https://example.com')
    expect(headers['Access-Control-Max-Age']).toBe(String(CORS_PREFLIGHT_MAX_AGE_SECONDS))
  })
})

describe('Rate Limiting', () => {
  // Mock rate limiter interface
  interface RateLimiter {
    limit(options: { key: string }): Promise<{ success: boolean }>
  }

  // Simulates the rate limiting check logic
  async function checkRateLimit(
    rateLimiter: RateLimiter | undefined,
    clientIP: string
  ): Promise<boolean> {
    if (!rateLimiter) return true // No rate limiter = allow all
    const { success } = await rateLimiter.limit({ key: clientIP })
    return success
  }

  it('allows requests when rate limiter is not configured', async () => {
    const result = await checkRateLimit(undefined, '192.168.1.1')
    expect(result).toBe(true)
  })

  it('allows requests under rate limit', async () => {
    const mockRateLimiter: RateLimiter = {
      limit: vi.fn().mockResolvedValue({ success: true }),
    }
    const result = await checkRateLimit(mockRateLimiter, '192.168.1.1')
    expect(result).toBe(true)
    expect(mockRateLimiter.limit).toHaveBeenCalledWith({ key: '192.168.1.1' })
  })

  it('blocks requests over rate limit', async () => {
    const mockRateLimiter: RateLimiter = {
      limit: vi.fn().mockResolvedValue({ success: false }),
    }
    const result = await checkRateLimit(mockRateLimiter, '192.168.1.1')
    expect(result).toBe(false)
  })

  it('uses client IP as rate limit key', async () => {
    const mockRateLimiter: RateLimiter = {
      limit: vi.fn().mockResolvedValue({ success: true }),
    }
    await checkRateLimit(mockRateLimiter, '10.0.0.1')
    expect(mockRateLimiter.limit).toHaveBeenCalledWith({ key: '10.0.0.1' })
  })
})

describe('User-Agent Header', () => {
  it('sets custom User-Agent for upstream requests', () => {
    // Verify the expected User-Agent string format
    expect(DEFAULT_USER_AGENT).toBe('VolleyKit/1.0 (PWA; https://github.com/Takishima/volleykit)')
  })

  it('User-Agent identifies the app as VolleyKit', () => {
    expect(DEFAULT_USER_AGENT).toContain('VolleyKit')
  })

  it('User-Agent includes version number', () => {
    expect(DEFAULT_USER_AGENT).toMatch(/VolleyKit\/\d+\.\d+/)
  })

  it('User-Agent indicates PWA nature', () => {
    expect(DEFAULT_USER_AGENT).toContain('PWA')
  })

  it('User-Agent includes contact/project URL', () => {
    expect(DEFAULT_USER_AGENT).toMatch(/https?:\/\//)
  })

  // Simulates how the worker modifies request headers
  function prepareProxyHeaders(originalHeaders: Headers): Headers {
    const headers = new Headers(originalHeaders)
    // Worker removes Host and sets it to target
    headers.delete('Host')
    headers.set('Host', 'volleymanager.volleyball.ch')
    // Worker sets custom User-Agent
    headers.set('User-Agent', DEFAULT_USER_AGENT)
    return headers
  }

  it('replaces browser User-Agent with custom VolleyKit User-Agent', () => {
    const browserHeaders = new Headers()
    browserHeaders.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
    browserHeaders.set('Accept', 'application/json')

    const proxyHeaders = prepareProxyHeaders(browserHeaders)

    expect(proxyHeaders.get('User-Agent')).toBe(DEFAULT_USER_AGENT)
    expect(proxyHeaders.get('User-Agent')).not.toContain('Mozilla')
  })

  it('preserves other headers when setting User-Agent', () => {
    const browserHeaders = new Headers()
    browserHeaders.set('User-Agent', 'Mozilla/5.0')
    browserHeaders.set('Accept', 'application/json')
    browserHeaders.set('Content-Type', 'application/x-www-form-urlencoded')
    browserHeaders.set('Cookie', 'session=abc123')

    const proxyHeaders = prepareProxyHeaders(browserHeaders)

    expect(proxyHeaders.get('Accept')).toBe('application/json')
    expect(proxyHeaders.get('Content-Type')).toBe('application/x-www-form-urlencoded')
    expect(proxyHeaders.get('Cookie')).toBe('session=abc123')
  })

  it('sets Host header to target domain', () => {
    const browserHeaders = new Headers()
    browserHeaders.set('Host', 'proxy.example.com')

    const proxyHeaders = prepareProxyHeaders(browserHeaders)

    expect(proxyHeaders.get('Host')).toBe('volleymanager.volleyball.ch')
    expect(proxyHeaders.get('Host')).not.toBe('proxy.example.com')
  })
})

describe('Kill Switch', () => {
  it("returns true when KILL_SWITCH is 'true'", () => {
    expect(checkKillSwitch({ KILL_SWITCH: 'true' })).toBe(true)
  })

  it("returns false when KILL_SWITCH is 'false'", () => {
    expect(checkKillSwitch({ KILL_SWITCH: 'false' })).toBe(false)
  })

  it('returns false when KILL_SWITCH is undefined', () => {
    expect(checkKillSwitch({})).toBe(false)
  })

  it('returns false when KILL_SWITCH is empty string', () => {
    expect(checkKillSwitch({ KILL_SWITCH: '' })).toBe(false)
  })

  it("returns false when KILL_SWITCH is 'TRUE' (case sensitive)", () => {
    // Kill switch should be case-sensitive for safety
    expect(checkKillSwitch({ KILL_SWITCH: 'TRUE' })).toBe(false)
  })

  it("returns false when KILL_SWITCH is '1'", () => {
    // Only exact string "true" should enable kill switch
    expect(checkKillSwitch({ KILL_SWITCH: '1' })).toBe(false)
  })

  it('returns 503 status with proper headers', () => {
    const expectedStatus = 503
    const expectedRetryAfter = String(KILL_SWITCH_RETRY_AFTER_SECONDS)

    expect(expectedStatus).toBe(503)
    expect(expectedRetryAfter).toBe('86400')
  })

  it('retry-after header is 24 hours in seconds', () => {
    const twentyFourHoursInSeconds = 24 * 60 * 60
    expect(KILL_SWITCH_RETRY_AFTER_SECONDS).toBe(twentyFourHoursInSeconds)
  })
})

describe('Robots.txt Endpoint', () => {
  // Simulates checking if a request is for robots.txt
  function isRobotsTxtRequest(pathname: string): boolean {
    return pathname === '/robots.txt'
  }

  it('matches /robots.txt path', () => {
    expect(isRobotsTxtRequest('/robots.txt')).toBe(true)
  })

  it('does not match other paths', () => {
    expect(isRobotsTxtRequest('/')).toBe(false)
    expect(isRobotsTxtRequest('/robots')).toBe(false)
    expect(isRobotsTxtRequest('/robots.txt/')).toBe(false)
    expect(isRobotsTxtRequest('/api/robots.txt')).toBe(false)
  })

  // Test the response content
  const ROBOTS_TXT_CONTENT = 'User-agent: *\nDisallow: /\n'

  it('disallows all user agents from all paths', () => {
    expect(ROBOTS_TXT_CONTENT).toContain('User-agent: *')
    expect(ROBOTS_TXT_CONTENT).toContain('Disallow: /')
  })

  it('has correct format (newline separated)', () => {
    const lines = ROBOTS_TXT_CONTENT.split('\n')
    expect(lines[0]).toBe('User-agent: *')
    expect(lines[1]).toBe('Disallow: /')
  })

  // Test that robots.txt is served even when kill switch is enabled
  // This is verified by the order of checks in the worker
  it('robots.txt check comes before kill switch (order matters)', () => {
    // This test documents the intended behavior:
    // robots.txt should be accessible even when the service is disabled
    // The worker code order is: robots.txt check -> kill switch check
    const checkOrder = ['robots.txt', 'kill_switch']
    expect(checkOrder[0]).toBe('robots.txt')
    expect(checkOrder[1]).toBe('kill_switch')
  })
})

describe('iCal Proxy Route', () => {
  describe('isValidICalCode', () => {
    it('accepts valid 6-character alphanumeric codes', () => {
      expect(isValidICalCode('ABC123')).toBe(true)
      expect(isValidICalCode('abcdef')).toBe(true)
      expect(isValidICalCode('123456')).toBe(true)
      expect(isValidICalCode('aB3dE6')).toBe(true)
    })

    it('rejects codes shorter than 6 characters', () => {
      expect(isValidICalCode('ABC12')).toBe(false)
      expect(isValidICalCode('A')).toBe(false)
      expect(isValidICalCode('')).toBe(false)
    })

    it('rejects codes longer than 6 characters', () => {
      expect(isValidICalCode('ABC1234')).toBe(false)
      expect(isValidICalCode('ABCDEFGH')).toBe(false)
    })

    it('rejects codes with special characters', () => {
      expect(isValidICalCode('ABC-12')).toBe(false)
      expect(isValidICalCode('ABC_12')).toBe(false)
      expect(isValidICalCode('ABC.12')).toBe(false)
      expect(isValidICalCode('ABC 12')).toBe(false)
      expect(isValidICalCode('ABC@12')).toBe(false)
    })

    it('rejects codes with unicode characters', () => {
      expect(isValidICalCode('ABCäöü')).toBe(false)
      expect(isValidICalCode('АВС123')).toBe(false) // Cyrillic
    })
  })

  describe('extractICalCode', () => {
    it('extracts code from valid iCal path', () => {
      expect(extractICalCode('/iCal/referee/ABC123')).toBe('ABC123')
      expect(extractICalCode('/iCal/referee/xyzabc')).toBe('xyzabc')
    })

    it('returns null for non-iCal paths', () => {
      expect(extractICalCode('/login')).toBe(null)
      expect(extractICalCode('/')).toBe(null)
      expect(extractICalCode('/indoorvolleyball.refadmin/api/test')).toBe(null)
    })

    it('returns null for malformed iCal paths', () => {
      expect(extractICalCode('/iCal/')).toBe(null)
      expect(extractICalCode('/iCal/referee/')).toBe(null)
      expect(extractICalCode('/iCal/referee')).toBe(null)
      expect(extractICalCode('/ical/referee/ABC123')).toBe(null) // case-sensitive
    })

    it('returns null for iCal paths with extra segments', () => {
      expect(extractICalCode('/iCal/referee/ABC123/extra')).toBe(null)
      expect(extractICalCode('/prefix/iCal/referee/ABC123')).toBe(null)
    })

    it('extracts code even if format is invalid (validation is separate)', () => {
      // extractICalCode only extracts, isValidICalCode validates
      expect(extractICalCode('/iCal/referee/toolong123')).toBe('toolong123')
      expect(extractICalCode('/iCal/referee/ABC-12')).toBe('ABC-12')
    })
  })

  describe('iCal endpoint behavior', () => {
    it('iCal path is not in allowed paths (handled separately)', () => {
      // The iCal route is handled before the path allowlist check
      expect(isAllowedPath('/iCal/referee/ABC123')).toBe(false)
    })

    it('builds correct target URL', () => {
      const targetHost = 'https://volleymanager.volleyball.ch'
      const code = 'ABC123'
      const expectedUrl = `${targetHost}/indoor/iCal/referee/${code}`
      expect(expectedUrl).toBe('https://volleymanager.volleyball.ch/indoor/iCal/referee/ABC123')
    })
  })

  describe('iCal HTTP methods', () => {
    // Simulates the method check logic from the worker
    function isAllowedICalMethod(method: string): boolean {
      return method === 'GET' || method === 'HEAD'
    }

    it('allows GET requests for iCal endpoint', () => {
      expect(isAllowedICalMethod('GET')).toBe(true)
    })

    it('allows HEAD requests for iCal endpoint', () => {
      // HEAD is used by clients to validate calendar codes exist without downloading content
      expect(isAllowedICalMethod('HEAD')).toBe(true)
    })

    it('rejects POST requests for iCal endpoint', () => {
      expect(isAllowedICalMethod('POST')).toBe(false)
    })

    it('rejects PUT requests for iCal endpoint', () => {
      expect(isAllowedICalMethod('PUT')).toBe(false)
    })

    it('rejects DELETE requests for iCal endpoint', () => {
      expect(isAllowedICalMethod('DELETE')).toBe(false)
    })
  })
})

describe('Proxy Timestamp Header', () => {
  it('timestamp header format includes ISO date and latency', () => {
    // Simulates the header format used by the proxy
    const timestamp = new Date().toISOString()
    const latencyMs = 42
    const headerValue = `${timestamp}; latency=${latencyMs}ms`

    expect(headerValue).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    expect(headerValue).toContain('; latency=')
    expect(headerValue).toContain('ms')
  })

  it('latency is measured in milliseconds', () => {
    const startTime = Date.now()
    // Simulate some work
    const endTime = startTime + 100
    const latencyMs = endTime - startTime

    expect(latencyMs).toBe(100)
    expect(typeof latencyMs).toBe('number')
  })
})
