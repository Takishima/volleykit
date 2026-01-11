import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { TourAutoSwipe } from './TourAutoSwipe'

// Mock the translation hook
vi.mock('@/shared/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'tour.accessibility.swipeDemoInProgress': 'Demonstrating swipe gesture',
      }
      return translations[key] || key
    },
  }),
}))

describe('TourAutoSwipe', () => {
  let container: HTMLDivElement
  let swipeableContent: HTMLDivElement

  beforeEach(() => {
    // Create a mock SwipeableCard structure
    container = document.createElement('div')
    container.setAttribute('data-tour', 'test-card')
    container.style.width = '300px'

    swipeableContent = document.createElement('div')
    swipeableContent.className = 'z-10 bg-white'
    swipeableContent.style.transform = 'translateX(0px)'

    container.appendChild(swipeableContent)
    document.body.appendChild(container)

    // Mock getBoundingClientRect
    container.getBoundingClientRect = vi.fn(() => ({
      width: 300,
      height: 100,
      top: 0,
      left: 0,
      right: 300,
      bottom: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }))

    vi.useFakeTimers()

    // Mock requestAnimationFrame to execute callback synchronously
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0)
      return 0
    })
  })

  afterEach(() => {
    document.body.removeChild(container)
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  const defaultProps = {
    targetSelector: "[data-tour='test-card']",
    direction: 'left' as const,
    onComplete: vi.fn(),
  }

  describe('animation', () => {
    it('applies swipe animation after delay', async () => {
      render(<TourAutoSwipe {...defaultProps} delay={500} duration={1000} />)

      // Before delay, transform should be unchanged
      expect(swipeableContent.style.transform).toBe('translateX(0px)')

      // Advance past delay
      await act(async () => {
        vi.advanceTimersByTime(500)
      })

      // Run animation frame
      await act(async () => {
        vi.advanceTimersByTime(16) // One frame
      })

      // Transform should now be applied (left swipe = negative translateX)
      expect(swipeableContent.style.transform).toContain('translateX(-')
    })

    it('swipes left when direction is left', async () => {
      render(<TourAutoSwipe {...defaultProps} direction="left" delay={100} duration={500} />)

      await act(async () => {
        vi.advanceTimersByTime(120)
      })

      // Left swipe should have negative translateX
      expect(swipeableContent.style.transform).toMatch(/translateX\(-\d+/)
    })

    it('swipes right when direction is right', async () => {
      render(<TourAutoSwipe {...defaultProps} direction="right" delay={100} duration={500} />)

      await act(async () => {
        vi.advanceTimersByTime(120)
      })

      // Right swipe should have positive translateX (no minus sign after the opening paren)
      expect(swipeableContent.style.transform).toMatch(/translateX\(\d+/)
    })

    it('blocks pointer events during animation', async () => {
      render(<TourAutoSwipe {...defaultProps} delay={100} duration={1000} />)

      await act(async () => {
        vi.advanceTimersByTime(120)
      })

      expect(swipeableContent.style.pointerEvents).toBe('none')
    })

    it('restores pointer events after animation completes', async () => {
      render(<TourAutoSwipe {...defaultProps} delay={100} duration={500} />)

      // Start animation
      await act(async () => {
        vi.advanceTimersByTime(120)
      })

      // Complete animation
      await act(async () => {
        vi.advanceTimersByTime(500)
      })

      expect(swipeableContent.style.pointerEvents).toBe('')
    })
  })

  describe('onComplete callback', () => {
    it('calls onComplete after animation duration', async () => {
      const onComplete = vi.fn()

      render(<TourAutoSwipe {...defaultProps} onComplete={onComplete} delay={100} duration={500} />)

      // Before animation completes
      await act(async () => {
        vi.advanceTimersByTime(120)
      })
      expect(onComplete).not.toHaveBeenCalled()

      // After animation completes
      await act(async () => {
        vi.advanceTimersByTime(500)
      })
      expect(onComplete).toHaveBeenCalledTimes(1)
    })

    it('dispatches tour-swipe-complete event on container', async () => {
      const eventHandler = vi.fn()
      container.addEventListener('tour-swipe-complete', eventHandler)

      render(<TourAutoSwipe {...defaultProps} delay={100} duration={500} />)

      await act(async () => {
        vi.advanceTimersByTime(620) // delay + duration
      })

      expect(eventHandler).toHaveBeenCalledTimes(1)

      container.removeEventListener('tour-swipe-complete', eventHandler)
    })
  })

  describe('cleanup', () => {
    it('cleans up animation on unmount during delay', async () => {
      const { unmount } = render(<TourAutoSwipe {...defaultProps} delay={1000} duration={500} />)

      // Unmount before delay completes
      await act(async () => {
        vi.advanceTimersByTime(200)
      })
      unmount()

      // Advance past when animation would have started
      await act(async () => {
        vi.advanceTimersByTime(1500)
      })

      // Transform should be unchanged (animation never started)
      expect(swipeableContent.style.transform).toBe('translateX(0px)')
    })

    it('restores original styles on unmount during animation', async () => {
      const originalTransform = swipeableContent.style.transform

      const { unmount } = render(<TourAutoSwipe {...defaultProps} delay={100} duration={2000} />)

      // Start animation
      await act(async () => {
        vi.advanceTimersByTime(120)
      })

      // Unmount during animation
      unmount()

      // Styles should be restored
      expect(swipeableContent.style.transform).toBe(originalTransform)
      expect(swipeableContent.style.pointerEvents).toBe('')
    })
  })

  describe('edge cases', () => {
    it('finds swipeable content when target is inside it (real-world structure)', async () => {
      // This test simulates the real DOM structure where:
      // SwipeableCard contains .z-10.bg-white which contains Card[data-tour="..."]

      // Remove and keep reference to original container for cleanup
      container.remove()

      // Create realistic structure: SwipeableCard > swipeable-div > Card[data-tour]
      const swipeableCardWrapper = document.createElement('div')
      swipeableCardWrapper.className = 'relative overflow-hidden rounded-xl'
      swipeableCardWrapper.style.width = '300px'

      const swipeableDiv = document.createElement('div')
      swipeableDiv.className = 'z-10 bg-white rounded-xl'
      swipeableDiv.style.transform = 'translateX(0px)'

      const innerCard = document.createElement('div')
      innerCard.setAttribute('data-tour', 'assignment-card')
      innerCard.textContent = 'Card content'

      swipeableDiv.appendChild(innerCard)
      swipeableCardWrapper.appendChild(swipeableDiv)
      document.body.appendChild(swipeableCardWrapper)

      // Mock getBoundingClientRect on the element found by targetSelector (innerCard)
      innerCard.getBoundingClientRect = vi.fn(() => ({
        width: 300,
        height: 100,
        top: 0,
        left: 0,
        right: 300,
        bottom: 100,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }))

      const onComplete = vi.fn()

      render(
        <TourAutoSwipe
          targetSelector="[data-tour='assignment-card']"
          direction="left"
          onComplete={onComplete}
          delay={100}
          duration={500}
        />
      )

      await act(async () => {
        vi.advanceTimersByTime(120)
      })

      // The swipeableDiv (parent of target) should be animated, not the innerCard
      expect(swipeableDiv.style.transform).toContain('translateX(-')

      // Clean up test-specific structure and restore original for afterEach
      swipeableCardWrapper.remove()
      document.body.appendChild(container)
    })

    it('does not animate when target element is not found', async () => {
      const onComplete = vi.fn()

      render(
        <TourAutoSwipe
          {...defaultProps}
          targetSelector=".nonexistent"
          onComplete={onComplete}
          delay={100}
          duration={500}
        />
      )

      await act(async () => {
        vi.advanceTimersByTime(700)
      })

      // onComplete should not be called since target wasn't found
      expect(onComplete).not.toHaveBeenCalled()
    })

    it('does not animate when swipeable content is not found', async () => {
      // Remove the swipeable content
      container.removeChild(swipeableContent)

      const onComplete = vi.fn()

      render(<TourAutoSwipe {...defaultProps} onComplete={onComplete} delay={100} duration={500} />)

      await act(async () => {
        vi.advanceTimersByTime(700)
      })

      expect(onComplete).not.toHaveBeenCalled()

      // Restore for cleanup
      container.appendChild(swipeableContent)
    })

    it('only animates once even if re-rendered', async () => {
      const onComplete = vi.fn()

      const { rerender } = render(
        <TourAutoSwipe {...defaultProps} onComplete={onComplete} delay={100} duration={500} />
      )

      // Start first animation
      await act(async () => {
        vi.advanceTimersByTime(120)
      })

      // Rerender
      rerender(
        <TourAutoSwipe {...defaultProps} onComplete={onComplete} delay={100} duration={500} />
      )

      // Complete animation
      await act(async () => {
        vi.advanceTimersByTime(500)
      })

      // Should only complete once
      expect(onComplete).toHaveBeenCalledTimes(1)
    })
  })

  describe('accessibility', () => {
    it('renders aria-live region with announcement', async () => {
      render(<TourAutoSwipe {...defaultProps} />)

      // The aria-live region should be rendered immediately
      const announcement = screen.getByRole('status')
      expect(announcement).toBeInTheDocument()
      expect(announcement).toHaveAttribute('aria-live', 'polite')
      expect(announcement).toHaveAttribute('aria-atomic', 'true')
      expect(announcement).toHaveTextContent('Demonstrating swipe gesture')
    })

    it('renders announcement as visually hidden (sr-only)', () => {
      render(<TourAutoSwipe {...defaultProps} />)

      const announcement = screen.getByRole('status')
      expect(announcement).toHaveClass('sr-only')
    })
  })

  describe('default values', () => {
    it('uses default duration of 1500ms', async () => {
      const onComplete = vi.fn()

      render(
        <TourAutoSwipe
          targetSelector={defaultProps.targetSelector}
          direction="left"
          onComplete={onComplete}
          delay={100}
        />
      )

      await act(async () => {
        vi.advanceTimersByTime(120)
      })

      // Should not complete before 1500ms
      await act(async () => {
        vi.advanceTimersByTime(1400)
      })
      expect(onComplete).not.toHaveBeenCalled()

      // Should complete after 1500ms
      await act(async () => {
        vi.advanceTimersByTime(100)
      })
      expect(onComplete).toHaveBeenCalled()
    })

    it('uses default delay of 800ms', async () => {
      render(
        <TourAutoSwipe
          targetSelector={defaultProps.targetSelector}
          direction="left"
          onComplete={vi.fn()}
          duration={100}
        />
      )

      // Transform should be unchanged before delay
      await act(async () => {
        vi.advanceTimersByTime(700)
      })
      expect(swipeableContent.style.transform).toBe('translateX(0px)')

      // Transform should change after delay
      await act(async () => {
        vi.advanceTimersByTime(120)
      })
      expect(swipeableContent.style.transform).not.toBe('translateX(0px)')
    })
  })
})
