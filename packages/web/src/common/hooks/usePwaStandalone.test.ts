import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { usePwaStandalone, isPwaStandalone } from './usePwaStandalone'

describe('usePwaStandalone', () => {
  let matchMediaMock: ReturnType<typeof vi.fn>
  let addEventListenerMock: ReturnType<typeof vi.fn>
  let removeEventListenerMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    // Reset navigator.standalone
    Object.defineProperty(window.navigator, 'standalone', {
      value: undefined,
      writable: true,
      configurable: true,
    })

    // Mock matchMedia
    addEventListenerMock = vi.fn()
    removeEventListenerMock = vi.fn()
    matchMediaMock = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: addEventListenerMock,
      removeEventListener: removeEventListenerMock,
    }))
    window.matchMedia = matchMediaMock as typeof window.matchMedia
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('iOS Safari detection via navigator.standalone', () => {
    it('returns true when navigator.standalone is true (iOS PWA)', () => {
      Object.defineProperty(window.navigator, 'standalone', {
        value: true,
        writable: true,
        configurable: true,
      })

      const { result } = renderHook(() => usePwaStandalone())

      expect(result.current).toBe(true)
    })

    it('returns false when navigator.standalone is false (iOS browser)', () => {
      Object.defineProperty(window.navigator, 'standalone', {
        value: false,
        writable: true,
        configurable: true,
      })

      const { result } = renderHook(() => usePwaStandalone())

      expect(result.current).toBe(false)
    })
  })

  describe('display-mode media query detection', () => {
    it('returns true when display-mode: standalone matches', () => {
      matchMediaMock.mockImplementation((query: string) => ({
        matches: query === '(display-mode: standalone)',
        media: query,
        addEventListener: addEventListenerMock,
        removeEventListener: removeEventListenerMock,
      }))

      const { result } = renderHook(() => usePwaStandalone())

      expect(result.current).toBe(true)
    })

    it('returns true when display-mode: minimal-ui matches', () => {
      matchMediaMock.mockImplementation((query: string) => ({
        matches: query === '(display-mode: minimal-ui)',
        media: query,
        addEventListener: addEventListenerMock,
        removeEventListener: removeEventListenerMock,
      }))

      const { result } = renderHook(() => usePwaStandalone())

      expect(result.current).toBe(true)
    })

    it('returns false when no display-mode matches', () => {
      matchMediaMock.mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: addEventListenerMock,
        removeEventListener: removeEventListenerMock,
      }))

      const { result } = renderHook(() => usePwaStandalone())

      expect(result.current).toBe(false)
    })
  })

  describe('media query change listener', () => {
    it('adds event listeners for display-mode changes', () => {
      renderHook(() => usePwaStandalone())

      // Should add listeners for both standalone and minimal-ui
      expect(addEventListenerMock).toHaveBeenCalledWith('change', expect.any(Function))
      expect(addEventListenerMock).toHaveBeenCalledTimes(2)
    })

    it('removes event listeners on unmount', () => {
      const { unmount } = renderHook(() => usePwaStandalone())

      unmount()

      expect(removeEventListenerMock).toHaveBeenCalledWith('change', expect.any(Function))
      expect(removeEventListenerMock).toHaveBeenCalledTimes(2)
    })

    it('updates state when display-mode changes', () => {
      let standaloneHandler: ((e: MediaQueryListEvent) => void) | null = null

      matchMediaMock.mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: (_event: string, handler: (e: MediaQueryListEvent) => void) => {
          if (query === '(display-mode: standalone)') {
            standaloneHandler = handler
          }
        },
        removeEventListener: vi.fn(),
      }))

      const { result } = renderHook(() => usePwaStandalone())

      expect(result.current).toBe(false)

      // Simulate display-mode change
      act(() => {
        matchMediaMock.mockImplementation((query: string) => ({
          matches: query === '(display-mode: standalone)',
          media: query,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        }))
        standaloneHandler?.({ matches: true } as MediaQueryListEvent)
      })

      expect(result.current).toBe(true)
    })
  })
})

describe('isPwaStandalone (non-hook version)', () => {
  beforeEach(() => {
    Object.defineProperty(window.navigator, 'standalone', {
      value: undefined,
      writable: true,
      configurable: true,
    })

    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
    }))
  })

  it('returns true when navigator.standalone is true', () => {
    Object.defineProperty(window.navigator, 'standalone', {
      value: true,
      writable: true,
      configurable: true,
    })

    expect(isPwaStandalone()).toBe(true)
  })

  it('returns true when display-mode: standalone matches', () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(display-mode: standalone)',
      media: query,
    }))

    expect(isPwaStandalone()).toBe(true)
  })

  it('returns false in regular browser', () => {
    expect(isPwaStandalone()).toBe(false)
  })
})
