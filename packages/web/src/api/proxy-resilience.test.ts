import { describe, it, expect, vi, beforeEach } from 'vitest'

const PRIMARY = 'https://primary.example.com'
const FALLBACK = 'https://fallback.example.com'

vi.mock('import.meta.env', () => ({}))
beforeEach(() => {
  localStorage.clear()
  vi.stubEnv('VITE_API_PROXY_URL', PRIMARY)
  vi.stubEnv('VITE_FALLBACK_PROXY_URLS', FALLBACK)
})

// Dynamic import to pick up env changes
async function loadModule() {
  // Clear module cache so import.meta.env is re-evaluated
  vi.resetModules()
  return import('./proxy-resilience')
}

describe('proxy-resilience', () => {
  describe('getApiBaseUrl', () => {
    it('returns primary URL by default', async () => {
      const { getApiBaseUrl } = await loadModule()
      expect(getApiBaseUrl()).toBe(PRIMARY)
    })

    it('returns stored URL if it is in the configured list', async () => {
      localStorage.setItem('volleykit-active-proxy-url', FALLBACK)
      // Set recent timestamp so TTL hasn't expired
      localStorage.setItem('volleykit-proxy-rotation-timestamp', String(Date.now()))
      const { getApiBaseUrl } = await loadModule()
      expect(getApiBaseUrl()).toBe(FALLBACK)
    })

    it('ignores stored URL if not in configured list', async () => {
      localStorage.setItem('volleykit-active-proxy-url', 'https://unknown.example.com')
      const { getApiBaseUrl } = await loadModule()
      expect(getApiBaseUrl()).toBe(PRIMARY)
    })

    it('returns empty string when no URLs configured', async () => {
      vi.stubEnv('VITE_API_PROXY_URL', '')
      vi.stubEnv('VITE_FALLBACK_PROXY_URLS', '')
      const { getApiBaseUrl } = await loadModule()
      expect(getApiBaseUrl()).toBe('')
    })

    it('rotates back to primary after TTL expires', async () => {
      localStorage.setItem('volleykit-active-proxy-url', FALLBACK)
      // Set timestamp 11 minutes ago (TTL is 10 min)
      localStorage.setItem(
        'volleykit-proxy-rotation-timestamp',
        String(Date.now() - 11 * 60 * 1000)
      )
      const { getApiBaseUrl } = await loadModule()
      expect(getApiBaseUrl()).toBe(PRIMARY)
    })

    it('stays on fallback within TTL window', async () => {
      localStorage.setItem('volleykit-active-proxy-url', FALLBACK)
      // Set timestamp 5 minutes ago (within 10 min TTL)
      localStorage.setItem(
        'volleykit-proxy-rotation-timestamp',
        String(Date.now() - 5 * 60 * 1000)
      )
      const { getApiBaseUrl } = await loadModule()
      expect(getApiBaseUrl()).toBe(FALLBACK)
    })
  })

  describe('reportProxyFailure', () => {
    it('does not rotate before reaching threshold', async () => {
      const { reportProxyFailure, getApiBaseUrl } = await loadModule()

      expect(reportProxyFailure()).toBe(false)
      expect(reportProxyFailure()).toBe(false)
      expect(getApiBaseUrl()).toBe(PRIMARY)
    })

    it('rotates after MAX_FAILURES_BEFORE_ROTATION failures', async () => {
      const { reportProxyFailure, getApiBaseUrl } = await loadModule()

      reportProxyFailure() // 1
      reportProxyFailure() // 2
      const rotated = reportProxyFailure() // 3 → rotate

      expect(rotated).toBe(true)
      expect(getApiBaseUrl()).toBe(FALLBACK)
    })

    it('returns false when only one URL is configured', async () => {
      vi.stubEnv('VITE_FALLBACK_PROXY_URLS', '')
      const { reportProxyFailure } = await loadModule()

      expect(reportProxyFailure()).toBe(false)
    })

    it('sets rotation timestamp on rotation', async () => {
      const { reportProxyFailure } = await loadModule()

      reportProxyFailure()
      reportProxyFailure()
      reportProxyFailure()

      const timestamp = localStorage.getItem('volleykit-proxy-rotation-timestamp')
      expect(timestamp).toBeTruthy()
      expect(Number(timestamp)).toBeGreaterThan(0)
    })

    it('wraps around to primary after exhausting all fallbacks', async () => {
      const { reportProxyFailure, getApiBaseUrl } = await loadModule()

      // Rotate primary → fallback
      reportProxyFailure()
      reportProxyFailure()
      reportProxyFailure()
      expect(getApiBaseUrl()).toBe(FALLBACK)

      // Rotate fallback → primary (wrap around)
      reportProxyFailure()
      reportProxyFailure()
      reportProxyFailure()
      expect(getApiBaseUrl()).toBe(PRIMARY)
    })
  })

  describe('reportProxySuccess', () => {
    it('resets failure counter', async () => {
      const { reportProxyFailure, reportProxySuccess, getApiBaseUrl } = await loadModule()

      reportProxyFailure() // count = 1
      reportProxyFailure() // count = 2
      reportProxySuccess() // count = 0

      // Next failure should start from 0 again, so 3 more needed to rotate
      reportProxyFailure() // 1
      reportProxyFailure() // 2
      expect(getApiBaseUrl()).toBe(PRIMARY) // still primary
    })

    it('is a no-op when counter is already 0', async () => {
      const { reportProxySuccess } = await loadModule()
      // Should not throw
      reportProxySuccess()
      expect(localStorage.getItem('volleykit-proxy-failure-count')).toBeNull()
    })
  })

  describe('localStorage unavailable', () => {
    it('falls back gracefully when localStorage throws', async () => {
      const { getApiBaseUrl, reportProxyFailure, reportProxySuccess } = await loadModule()

      // Simulate localStorage being unavailable
      vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
        throw new Error('SecurityError')
      })
      vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
        throw new Error('SecurityError')
      })

      expect(getApiBaseUrl()).toBe(PRIMARY)
      expect(reportProxyFailure()).toBe(false)
      expect(() => reportProxySuccess()).not.toThrow()

      vi.restoreAllMocks()
    })
  })
})
