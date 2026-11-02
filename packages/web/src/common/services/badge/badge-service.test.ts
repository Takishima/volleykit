import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { badgeService } from './badge-service'

describe('badgeService', () => {
  const mockSetAppBadge = vi.fn().mockResolvedValue(undefined)
  const mockClearAppBadge = vi.fn().mockResolvedValue(undefined)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Clean up navigator mocks
    if ('setAppBadge' in navigator) {
      // @ts-expect-error - cleaning up test mock
      delete navigator.setAppBadge
    }
    if ('clearAppBadge' in navigator) {
      // @ts-expect-error - cleaning up test mock
      delete navigator.clearAppBadge
    }
  })

  describe('isSupported', () => {
    it('returns false when Badging API is not available', () => {
      expect(badgeService.isSupported()).toBe(false)
    })

    it('returns true when setAppBadge is available', () => {
      Object.defineProperty(navigator, 'setAppBadge', {
        value: mockSetAppBadge,
        configurable: true,
      })

      expect(badgeService.isSupported()).toBe(true)
    })
  })

  describe('setBadge', () => {
    it('returns error when API is not supported', async () => {
      const result = await badgeService.setBadge(5)

      expect(result.success).toBe(false)
      expect(result.error).toContain('not supported')
    })

    it('calls setAppBadge with the count when supported', async () => {
      Object.defineProperty(navigator, 'setAppBadge', {
        value: mockSetAppBadge,
        configurable: true,
      })
      Object.defineProperty(navigator, 'clearAppBadge', {
        value: mockClearAppBadge,
        configurable: true,
      })

      const result = await badgeService.setBadge(5)

      expect(result.success).toBe(true)
      expect(mockSetAppBadge).toHaveBeenCalledWith(5)
    })

    it('calls clearAppBadge when count is 0', async () => {
      Object.defineProperty(navigator, 'setAppBadge', {
        value: mockSetAppBadge,
        configurable: true,
      })
      Object.defineProperty(navigator, 'clearAppBadge', {
        value: mockClearAppBadge,
        configurable: true,
      })

      const result = await badgeService.setBadge(0)

      expect(result.success).toBe(true)
      expect(mockClearAppBadge).toHaveBeenCalled()
      expect(mockSetAppBadge).not.toHaveBeenCalled()
    })

    it('handles API errors gracefully', async () => {
      const error = new Error('Permission denied')
      Object.defineProperty(navigator, 'setAppBadge', {
        value: vi.fn().mockRejectedValue(error),
        configurable: true,
      })

      const result = await badgeService.setBadge(5)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Permission denied')
    })
  })

  describe('clearBadge', () => {
    it('clears the badge by setting count to 0', async () => {
      Object.defineProperty(navigator, 'setAppBadge', {
        value: mockSetAppBadge,
        configurable: true,
      })
      Object.defineProperty(navigator, 'clearAppBadge', {
        value: mockClearAppBadge,
        configurable: true,
      })

      const result = await badgeService.clearBadge()

      expect(result.success).toBe(true)
      expect(mockClearAppBadge).toHaveBeenCalled()
    })
  })
})
