import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { usePullToRefresh } from './usePullToRefresh'

describe('usePullToRefresh', () => {
  const mockOnRefresh = vi.fn().mockResolvedValue(undefined)

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    // Reset scroll position
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initial state', () => {
    it('returns initial state with pullDistance 0', () => {
      const { result } = renderHook(() =>
        usePullToRefresh({ onRefresh: mockOnRefresh, enabled: true })
      )

      expect(result.current.pullDistance).toBe(0)
      expect(result.current.isRefreshing).toBe(false)
      expect(result.current.threshold).toBeGreaterThan(0)
    })

    it('provides container props for touch handling', () => {
      const { result } = renderHook(() =>
        usePullToRefresh({ onRefresh: mockOnRefresh, enabled: true })
      )

      expect(result.current.containerProps).toHaveProperty('onTouchStart')
      expect(result.current.containerProps).toHaveProperty('onTouchMove')
      expect(result.current.containerProps).toHaveProperty('onTouchEnd')
    })
  })

  describe('when disabled', () => {
    it('does not track pull gestures', () => {
      const { result } = renderHook(() =>
        usePullToRefresh({ onRefresh: mockOnRefresh, enabled: false })
      )

      // Simulate touch events
      const mockElement = { scrollTop: 0 } as HTMLElement
      const touchStartEvent = {
        touches: [{ clientY: 100 }],
        currentTarget: mockElement,
      } as unknown as React.TouchEvent

      act(() => {
        result.current.containerProps.onTouchStart(touchStartEvent)
      })

      const touchMoveEvent = {
        touches: [{ clientY: 200 }],
        preventDefault: vi.fn(),
      } as unknown as React.TouchEvent

      act(() => {
        result.current.containerProps.onTouchMove(touchMoveEvent)
      })

      expect(result.current.pullDistance).toBe(0)
    })

    it('resets state when disabled', () => {
      const { result, rerender } = renderHook(
        ({ enabled }) => usePullToRefresh({ onRefresh: mockOnRefresh, enabled }),
        { initialProps: { enabled: true } }
      )

      // Start a pull
      const mockElement = { scrollTop: 0 } as HTMLElement
      act(() => {
        result.current.containerProps.onTouchStart({
          touches: [{ clientY: 100 }],
          currentTarget: mockElement,
        } as unknown as React.TouchEvent)
        result.current.containerProps.onTouchMove({
          touches: [{ clientY: 200 }],
          preventDefault: vi.fn(),
        } as unknown as React.TouchEvent)
      })

      expect(result.current.pullDistance).toBeGreaterThan(0)

      // Disable
      rerender({ enabled: false })

      expect(result.current.pullDistance).toBe(0)
    })
  })

  describe('pull gesture handling', () => {
    it('tracks pull distance with resistance', () => {
      const { result } = renderHook(() =>
        usePullToRefresh({ onRefresh: mockOnRefresh, enabled: true })
      )

      const mockElement = { scrollTop: 0 } as HTMLElement

      act(() => {
        result.current.containerProps.onTouchStart({
          touches: [{ clientY: 100 }],
          currentTarget: mockElement,
        } as unknown as React.TouchEvent)
      })

      act(() => {
        result.current.containerProps.onTouchMove({
          touches: [{ clientY: 200 }],
          preventDefault: vi.fn(),
        } as unknown as React.TouchEvent)
      })

      // Pull distance should be positive but less than the raw diff (100px)
      // due to resistance factor
      expect(result.current.pullDistance).toBeGreaterThan(0)
      expect(result.current.pullDistance).toBeLessThan(100)
    })

    it('does not track pull when scrolled down', () => {
      Object.defineProperty(window, 'scrollY', { value: 100, writable: true })

      const { result } = renderHook(() =>
        usePullToRefresh({ onRefresh: mockOnRefresh, enabled: true })
      )

      const mockElement = { scrollTop: 0 } as HTMLElement

      act(() => {
        result.current.containerProps.onTouchStart({
          touches: [{ clientY: 100 }],
          currentTarget: mockElement,
        } as unknown as React.TouchEvent)
      })

      act(() => {
        result.current.containerProps.onTouchMove({
          touches: [{ clientY: 200 }],
          preventDefault: vi.fn(),
        } as unknown as React.TouchEvent)
      })

      expect(result.current.pullDistance).toBe(0)
    })

    it('resets pull distance on upward scroll', () => {
      const { result } = renderHook(() =>
        usePullToRefresh({ onRefresh: mockOnRefresh, enabled: true })
      )

      const mockElement = { scrollTop: 0 } as HTMLElement

      // Start pull
      act(() => {
        result.current.containerProps.onTouchStart({
          touches: [{ clientY: 100 }],
          currentTarget: mockElement,
        } as unknown as React.TouchEvent)
      })

      act(() => {
        result.current.containerProps.onTouchMove({
          touches: [{ clientY: 150 }],
          preventDefault: vi.fn(),
        } as unknown as React.TouchEvent)
      })

      expect(result.current.pullDistance).toBeGreaterThan(0)

      // Scroll up (negative diff)
      act(() => {
        result.current.containerProps.onTouchMove({
          touches: [{ clientY: 50 }],
          preventDefault: vi.fn(),
        } as unknown as React.TouchEvent)
      })

      expect(result.current.pullDistance).toBe(0)
    })
  })

  describe('refresh trigger', () => {
    it('triggers refresh when pull exceeds threshold', async () => {
      const { result } = renderHook(() =>
        usePullToRefresh({ onRefresh: mockOnRefresh, enabled: true })
      )

      const mockElement = { scrollTop: 0 } as HTMLElement

      // Start pull
      act(() => {
        result.current.containerProps.onTouchStart({
          touches: [{ clientY: 0 }],
          currentTarget: mockElement,
        } as unknown as React.TouchEvent)
      })

      // Pull far enough to exceed threshold (80px * 0.4 resistance = 32px threshold)
      // 250px raw pull * 0.4 = 100px, which exceeds 32px threshold
      act(() => {
        result.current.containerProps.onTouchMove({
          touches: [{ clientY: 250 }],
          preventDefault: vi.fn(),
        } as unknown as React.TouchEvent)
      })

      // Verify pull distance is set and exceeds threshold
      expect(result.current.pullDistance).toBeGreaterThan(result.current.threshold)

      // Release - need to await the async handler and advance timers for min duration
      await act(async () => {
        // The handler returns a Promise, so we await it
        const handler = result.current.containerProps.onTouchEnd as () => Promise<void>
        const promise = handler()
        // Advance past the minimum refresh duration (500ms)
        await vi.advanceTimersByTimeAsync(500)
        await promise
      })

      expect(mockOnRefresh).toHaveBeenCalledTimes(1)
    })

    it('does not trigger refresh when pull is below threshold', async () => {
      const { result } = renderHook(() =>
        usePullToRefresh({ onRefresh: mockOnRefresh, enabled: true })
      )

      const mockElement = { scrollTop: 0 } as HTMLElement

      // Start pull
      act(() => {
        result.current.containerProps.onTouchStart({
          touches: [{ clientY: 100 }],
          currentTarget: mockElement,
        } as unknown as React.TouchEvent)
      })

      // Small pull (20px * 0.4 = 8px, below threshold of 32px)
      act(() => {
        result.current.containerProps.onTouchMove({
          touches: [{ clientY: 120 }],
          preventDefault: vi.fn(),
        } as unknown as React.TouchEvent)
      })

      // Release
      await act(async () => {
        const handler = result.current.containerProps.onTouchEnd as () => Promise<void>
        await handler()
      })

      expect(mockOnRefresh).not.toHaveBeenCalled()
    })

    it('sets isRefreshing to false after refresh completes', async () => {
      // This test verifies the final state - isRefreshing is false after completion
      const { result } = renderHook(() =>
        usePullToRefresh({ onRefresh: mockOnRefresh, enabled: true })
      )

      const mockElement = { scrollTop: 0 } as HTMLElement

      // Start and complete pull
      act(() => {
        result.current.containerProps.onTouchStart({
          touches: [{ clientY: 0 }],
          currentTarget: mockElement,
        } as unknown as React.TouchEvent)
        result.current.containerProps.onTouchMove({
          touches: [{ clientY: 250 }],
          preventDefault: vi.fn(),
        } as unknown as React.TouchEvent)
      })

      // Complete the refresh with timer advance for min duration
      await act(async () => {
        const handler = result.current.containerProps.onTouchEnd as () => Promise<void>
        const promise = handler()
        await vi.advanceTimersByTimeAsync(500)
        await promise
      })

      // After refresh completes, isRefreshing should be false
      expect(result.current.isRefreshing).toBe(false)
      expect(mockOnRefresh).toHaveBeenCalled()
    })

    it('resets pullDistance after refresh completes', async () => {
      const { result } = renderHook(() =>
        usePullToRefresh({ onRefresh: mockOnRefresh, enabled: true })
      )

      const mockElement = { scrollTop: 0 } as HTMLElement

      act(() => {
        result.current.containerProps.onTouchStart({
          touches: [{ clientY: 0 }],
          currentTarget: mockElement,
        } as unknown as React.TouchEvent)
        result.current.containerProps.onTouchMove({
          touches: [{ clientY: 250 }],
          preventDefault: vi.fn(),
        } as unknown as React.TouchEvent)
      })

      await act(async () => {
        const handler = result.current.containerProps.onTouchEnd as () => Promise<void>
        const promise = handler()
        await vi.advanceTimersByTimeAsync(500)
        await promise
      })

      expect(result.current.pullDistance).toBe(0)
    })
  })

  describe('snap back behavior', () => {
    it('snaps back to 0 when released below threshold', async () => {
      const { result } = renderHook(() =>
        usePullToRefresh({ onRefresh: mockOnRefresh, enabled: true })
      )

      const mockElement = { scrollTop: 0 } as HTMLElement

      act(() => {
        result.current.containerProps.onTouchStart({
          touches: [{ clientY: 100 }],
          currentTarget: mockElement,
        } as unknown as React.TouchEvent)
        result.current.containerProps.onTouchMove({
          touches: [{ clientY: 120 }],
          preventDefault: vi.fn(),
        } as unknown as React.TouchEvent)
      })

      expect(result.current.pullDistance).toBeGreaterThan(0)

      await act(async () => {
        const handler = result.current.containerProps.onTouchEnd as () => Promise<void>
        await handler()
      })

      expect(result.current.pullDistance).toBe(0)
    })
  })
})
