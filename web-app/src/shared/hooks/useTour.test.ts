import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { useTour } from './useTour'

// Mock the tour store
const mockStartTour = vi.fn()
const mockNextStep = vi.fn()
const mockCompleteTour = vi.fn()
const mockShouldShowTour = vi.fn()
const mockIsTourActive = vi.fn()

let mockActiveTour: string | null = null
let mockCurrentStep = 0

vi.mock('@/shared/stores/tour', () => ({
  useTourStore: () => ({
    activeTour: mockActiveTour,
    currentStep: mockCurrentStep,
    startTour: mockStartTour,
    nextStep: mockNextStep,
    completeTour: mockCompleteTour,
    shouldShowTour: mockShouldShowTour,
    isTourActive: mockIsTourActive,
  }),
}))

describe('useTour', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockActiveTour = null
    mockCurrentStep = 0
    mockStartTour.mockClear()
    mockNextStep.mockClear()
    mockCompleteTour.mockClear()
    mockShouldShowTour.mockReturnValue(true)
    mockIsTourActive.mockReturnValue(false)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('should return initial state with tour not active', () => {
      mockIsTourActive.mockReturnValue(false)
      mockShouldShowTour.mockReturnValue(true)

      const { result } = renderHook(() => useTour('assignments'))

      expect(result.current.isActive).toBe(false)
      expect(result.current.isTourMode).toBe(false)
      expect(result.current.currentStep).toBe(0)
      expect(result.current.shouldShow).toBe(true)
    })

    it('should return isActive true when tour is active', () => {
      mockActiveTour = 'assignments'
      mockIsTourActive.mockReturnValue(true)

      const { result } = renderHook(() => useTour('assignments'))

      expect(result.current.isActive).toBe(true)
      expect(result.current.isTourMode).toBe(true)
    })

    it('should return shouldShow false when tour is completed', () => {
      mockShouldShowTour.mockReturnValue(false)

      const { result } = renderHook(() => useTour('assignments'))

      expect(result.current.shouldShow).toBe(false)
    })
  })

  describe('showDummyData calculation', () => {
    it('should be true when tour is active', () => {
      mockActiveTour = 'assignments'
      mockIsTourActive.mockReturnValue(true)
      mockShouldShowTour.mockReturnValue(true)

      const { result } = renderHook(() => useTour('assignments'))

      expect(result.current.showDummyData).toBe(true)
    })

    it('should be true when tour should show and autoStart is enabled', () => {
      mockShouldShowTour.mockReturnValue(true)

      const { result } = renderHook(() => useTour('assignments', { autoStart: true }))

      expect(result.current.showDummyData).toBe(true)
    })

    it('should be false when tour should show but autoStart is disabled', () => {
      mockShouldShowTour.mockReturnValue(true)
      mockIsTourActive.mockReturnValue(false)
      mockActiveTour = null

      const { result } = renderHook(() => useTour('assignments', { autoStart: false }))

      expect(result.current.showDummyData).toBe(false)
    })

    it('should be false when tour is completed and not active', () => {
      mockShouldShowTour.mockReturnValue(false)
      mockIsTourActive.mockReturnValue(false)
      mockActiveTour = null

      const { result } = renderHook(() => useTour('assignments'))

      expect(result.current.showDummyData).toBe(false)
    })
  })

  describe('auto-start behavior', () => {
    it('should auto-start tour after delay when autoStart is true', async () => {
      mockShouldShowTour.mockReturnValue(true)

      renderHook(() => useTour('assignments', { autoStart: true, startDelay: 500 }))

      expect(mockStartTour).not.toHaveBeenCalled()

      act(() => {
        vi.advanceTimersByTime(500)
      })

      expect(mockStartTour).toHaveBeenCalledWith('assignments')
      expect(mockStartTour).toHaveBeenCalledTimes(1)
    })

    it('should use default delay of 500ms', async () => {
      mockShouldShowTour.mockReturnValue(true)

      renderHook(() => useTour('assignments'))

      expect(mockStartTour).not.toHaveBeenCalled()

      act(() => {
        vi.advanceTimersByTime(499)
      })

      expect(mockStartTour).not.toHaveBeenCalled()

      act(() => {
        vi.advanceTimersByTime(1)
      })

      expect(mockStartTour).toHaveBeenCalledWith('assignments')
    })

    it('should not auto-start when autoStart is false', () => {
      mockShouldShowTour.mockReturnValue(true)

      renderHook(() => useTour('assignments', { autoStart: false }))

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      expect(mockStartTour).not.toHaveBeenCalled()
    })

    it('should not auto-start when tour should not show', () => {
      mockShouldShowTour.mockReturnValue(false)

      renderHook(() => useTour('assignments'))

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      expect(mockStartTour).not.toHaveBeenCalled()
    })

    it('should not auto-start when another tour is active', () => {
      mockShouldShowTour.mockReturnValue(true)
      mockActiveTour = 'compensations' // Different tour is active

      renderHook(() => useTour('assignments'))

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      expect(mockStartTour).not.toHaveBeenCalled()
    })

    it('should only auto-start once per mount', () => {
      mockShouldShowTour.mockReturnValue(true)

      const { rerender } = renderHook(() => useTour('assignments'))

      act(() => {
        vi.advanceTimersByTime(500)
      })

      expect(mockStartTour).toHaveBeenCalledTimes(1)

      // Rerender should not trigger another auto-start
      rerender()

      act(() => {
        vi.advanceTimersByTime(500)
      })

      expect(mockStartTour).toHaveBeenCalledTimes(1)
    })
  })

  describe('manual tour control', () => {
    it('should call store startTour when startTour is called', () => {
      const { result } = renderHook(() => useTour('assignments', { autoStart: false }))

      act(() => {
        result.current.startTour()
      })

      expect(mockStartTour).toHaveBeenCalledWith('assignments')
    })

    it('should call store completeTour when endTour is called', () => {
      const { result } = renderHook(() => useTour('assignments'))

      act(() => {
        result.current.endTour()
      })

      expect(mockCompleteTour).toHaveBeenCalled()
    })

    it('should call store nextStep when nextStep is called', () => {
      const { result } = renderHook(() => useTour('assignments'))

      act(() => {
        result.current.nextStep()
      })

      expect(mockNextStep).toHaveBeenCalled()
    })
  })

  describe('currentStep tracking', () => {
    it('should return current step from store', () => {
      mockCurrentStep = 2

      const { result } = renderHook(() => useTour('assignments'))

      expect(result.current.currentStep).toBe(2)
    })
  })

  describe('cleanup', () => {
    it('should clear timer on unmount', () => {
      mockShouldShowTour.mockReturnValue(true)

      const { unmount } = renderHook(() => useTour('assignments', { startDelay: 500 }))

      // Unmount before timer fires
      unmount()

      act(() => {
        vi.advanceTimersByTime(500)
      })

      // Timer should have been cleared, startTour should not be called
      expect(mockStartTour).not.toHaveBeenCalled()
    })
  })

  describe('tour reset handling', () => {
    it('should reset hasAutoStarted when shouldShow changes from false to true', () => {
      // Start with tour completed
      mockShouldShowTour.mockReturnValue(false)

      const { rerender } = renderHook(() => useTour('assignments'))

      act(() => {
        vi.advanceTimersByTime(500)
      })

      expect(mockStartTour).not.toHaveBeenCalled()

      // Simulate tour reset - shouldShow becomes true again
      mockShouldShowTour.mockReturnValue(true)
      rerender()

      act(() => {
        vi.advanceTimersByTime(500)
      })

      expect(mockStartTour).toHaveBeenCalledWith('assignments')
    })
  })

  describe('different tour IDs', () => {
    it('should work with different tour IDs', () => {
      mockIsTourActive.mockImplementation((id: string) => id === 'compensations')
      mockShouldShowTour.mockImplementation((id: string) => id === 'compensations')
      mockActiveTour = 'compensations'

      const { result } = renderHook(() => useTour('compensations'))

      expect(result.current.isActive).toBe(true)
      expect(result.current.isTourMode).toBe(true)
      expect(result.current.shouldShow).toBe(true)
    })

    it('should not be active for different tour ID', () => {
      mockIsTourActive.mockReturnValue(false)
      mockShouldShowTour.mockReturnValue(true)
      mockActiveTour = 'compensations'

      const { result } = renderHook(() => useTour('assignments'))

      expect(result.current.isActive).toBe(false)
      expect(result.current.isTourMode).toBe(false)
    })
  })
})
