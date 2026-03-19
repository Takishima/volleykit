import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import * as i18n from '@/i18n'
import * as useDateFormat from '@/shared/hooks/useDateFormat'

import { usePreloadLocales } from './usePreloadLocales'

// Extend Window interface for requestIdleCallback
declare global {
  interface Window {
    requestIdleCallback: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number
    cancelIdleCallback: (id: number) => void
  }
}

vi.mock('@/i18n', () => ({
  preloadTranslations: vi.fn(),
}))

vi.mock('@/shared/hooks/useDateFormat', () => ({
  preloadDateLocales: vi.fn(),
}))

const mockLogError = vi.fn()

vi.mock('@/shared/utils/logger', () => {
  return {
    createLogger: () => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: (...args: unknown[]) => mockLogError(...args),
    }),
  }
})

describe('usePreloadLocales', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('requestIdleCallback behavior', () => {
    it('preloads locales when browser is idle', () => {
      const mockPreloadTranslations = vi.mocked(i18n.preloadTranslations)
      const mockPreloadDateLocales = vi.mocked(useDateFormat.preloadDateLocales)

      mockPreloadTranslations.mockResolvedValue()
      mockPreloadDateLocales.mockResolvedValue()

      const mockRequestIdleCallback = vi.fn((callback: IdleRequestCallback) => {
        callback({} as IdleDeadline)
        return 1
      })
      const mockCancelIdleCallback = vi.fn()

      window.requestIdleCallback = mockRequestIdleCallback
      window.cancelIdleCallback = mockCancelIdleCallback

      renderHook(() => usePreloadLocales())

      expect(mockRequestIdleCallback).toHaveBeenCalledWith(expect.any(Function), { timeout: 1000 })
      expect(mockPreloadTranslations).toHaveBeenCalledTimes(1)
      expect(mockPreloadDateLocales).toHaveBeenCalledTimes(1)
    })

    it('cleans up idle callback on unmount', () => {
      const mockRequestIdleCallback = vi.fn(() => 42)
      const mockCancelIdleCallback = vi.fn()

      window.requestIdleCallback = mockRequestIdleCallback
      window.cancelIdleCallback = mockCancelIdleCallback

      const { unmount } = renderHook(() => usePreloadLocales())

      expect(mockRequestIdleCallback).toHaveBeenCalled()

      unmount()

      expect(mockCancelIdleCallback).toHaveBeenCalledWith(42)
    })
  })

  describe('setTimeout fallback', () => {
    it('falls back to setTimeout when requestIdleCallback unavailable', () => {
      const mockPreloadTranslations = vi.mocked(i18n.preloadTranslations)
      const mockPreloadDateLocales = vi.mocked(useDateFormat.preloadDateLocales)

      mockPreloadTranslations.mockResolvedValue()
      mockPreloadDateLocales.mockResolvedValue()

      // Remove requestIdleCallback
      const originalRequestIdleCallback = window.requestIdleCallback
      // @ts-expect-error - Intentionally deleting for test
      delete window.requestIdleCallback

      renderHook(() => usePreloadLocales())

      expect(mockPreloadTranslations).not.toHaveBeenCalled()
      expect(mockPreloadDateLocales).not.toHaveBeenCalled()

      vi.advanceTimersByTime(1000)

      expect(mockPreloadTranslations).toHaveBeenCalledTimes(1)
      expect(mockPreloadDateLocales).toHaveBeenCalledTimes(1)

      // Restore
      window.requestIdleCallback = originalRequestIdleCallback
    })

    it('cleans up timeout on unmount when using fallback', () => {
      const mockPreloadTranslations = vi.mocked(i18n.preloadTranslations)
      const mockPreloadDateLocales = vi.mocked(useDateFormat.preloadDateLocales)

      mockPreloadTranslations.mockResolvedValue()
      mockPreloadDateLocales.mockResolvedValue()

      // Remove requestIdleCallback
      const originalRequestIdleCallback = window.requestIdleCallback
      // @ts-expect-error - Intentionally deleting for test
      delete window.requestIdleCallback

      const { unmount } = renderHook(() => usePreloadLocales())

      unmount()

      vi.advanceTimersByTime(1000)

      // Should not have been called since we unmounted before timeout
      expect(mockPreloadTranslations).not.toHaveBeenCalled()
      expect(mockPreloadDateLocales).not.toHaveBeenCalled()

      // Restore
      window.requestIdleCallback = originalRequestIdleCallback
    })
  })

  describe('error handling', () => {
    it('handles preloadTranslations errors gracefully', async () => {
      const mockPreloadTranslations = vi.mocked(i18n.preloadTranslations)
      const mockPreloadDateLocales = vi.mocked(useDateFormat.preloadDateLocales)

      const testError = new Error('Translation load failed')
      mockPreloadTranslations.mockRejectedValue(testError)
      mockPreloadDateLocales.mockResolvedValue()

      const mockRequestIdleCallback = vi.fn((callback: IdleRequestCallback) => {
        callback({} as IdleDeadline)
        return 1
      })

      window.requestIdleCallback = mockRequestIdleCallback

      renderHook(() => usePreloadLocales())

      await vi.waitFor(() => {
        expect(mockLogError).toHaveBeenCalledWith('Failed to preload locales:', testError)
      })
    })

    it('handles preloadDateLocales errors gracefully', async () => {
      const mockPreloadTranslations = vi.mocked(i18n.preloadTranslations)
      const mockPreloadDateLocales = vi.mocked(useDateFormat.preloadDateLocales)

      const testError = new Error('Date locale load failed')
      mockPreloadTranslations.mockResolvedValue()
      mockPreloadDateLocales.mockRejectedValue(testError)

      const mockRequestIdleCallback = vi.fn((callback: IdleRequestCallback) => {
        callback({} as IdleDeadline)
        return 1
      })

      window.requestIdleCallback = mockRequestIdleCallback

      renderHook(() => usePreloadLocales())

      await vi.waitFor(() => {
        expect(mockLogError).toHaveBeenCalledWith('Failed to preload locales:', testError)
      })
    })

    it('handles both preload functions failing', async () => {
      const mockPreloadTranslations = vi.mocked(i18n.preloadTranslations)
      const mockPreloadDateLocales = vi.mocked(useDateFormat.preloadDateLocales)

      const testError = new Error('All preloads failed')
      mockPreloadTranslations.mockRejectedValue(testError)
      mockPreloadDateLocales.mockRejectedValue(testError)

      const mockRequestIdleCallback = vi.fn((callback: IdleRequestCallback) => {
        callback({} as IdleDeadline)
        return 1
      })

      window.requestIdleCallback = mockRequestIdleCallback

      renderHook(() => usePreloadLocales())

      await vi.waitFor(() => {
        expect(mockLogError).toHaveBeenCalledWith('Failed to preload locales:', testError)
      })
    })
  })

  describe('timing behavior', () => {
    it('uses 1000ms timeout for requestIdleCallback', () => {
      const mockRequestIdleCallback = vi.fn(() => 1)
      window.requestIdleCallback = mockRequestIdleCallback

      renderHook(() => usePreloadLocales())

      expect(mockRequestIdleCallback).toHaveBeenCalledWith(expect.any(Function), { timeout: 1000 })
    })

    it('uses 1000ms delay for setTimeout fallback', () => {
      const mockPreloadTranslations = vi.mocked(i18n.preloadTranslations)
      const mockPreloadDateLocales = vi.mocked(useDateFormat.preloadDateLocales)

      mockPreloadTranslations.mockResolvedValue()
      mockPreloadDateLocales.mockResolvedValue()

      // Remove requestIdleCallback
      const originalRequestIdleCallback = window.requestIdleCallback
      // @ts-expect-error - Intentionally deleting for test
      delete window.requestIdleCallback

      renderHook(() => usePreloadLocales())

      // Not called before timeout
      vi.advanceTimersByTime(999)
      expect(mockPreloadTranslations).not.toHaveBeenCalled()

      // Called at timeout
      vi.advanceTimersByTime(1)
      expect(mockPreloadTranslations).toHaveBeenCalledTimes(1)
      expect(mockPreloadDateLocales).toHaveBeenCalledTimes(1)

      // Restore
      window.requestIdleCallback = originalRequestIdleCallback
    })
  })
})
