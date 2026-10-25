import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest'

import { partialMock } from '@/test/partial-mock'

import { launchConfetti } from './confetti'

describe('launchConfetti', () => {
  let appendChildSpy: MockInstance<HTMLElement['appendChild']>
  let addEventListenerSpy: MockInstance<Window['addEventListener']>

  /** Only `matches` is read by launchConfetti */
  function mockPrefersReducedMotion(matches: boolean) {
    vi.spyOn(window, 'matchMedia').mockReturnValue(
      partialMock<MediaQueryList>({ matches, media: '(prefers-reduced-motion: reduce)' })
    )
  }

  beforeEach(() => {
    appendChildSpy = vi.spyOn(document.body, 'appendChild')
    addEventListenerSpy = vi.spyOn(window, 'addEventListener')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    // Clean up any canvases that might have been added
    document.querySelectorAll('canvas').forEach((c) => c.remove())
  })

  describe('prefers-reduced-motion', () => {
    it('should not create canvas when user prefers reduced motion', () => {
      mockPrefersReducedMotion(true)

      launchConfetti()

      expect(appendChildSpy).not.toHaveBeenCalled()
    })

    it('should create canvas when user does not prefer reduced motion', () => {
      mockPrefersReducedMotion(false)

      launchConfetti()

      expect(appendChildSpy).toHaveBeenCalled()
      const canvas = appendChildSpy.mock.calls[0]?.[0]
      expect(canvas).toBeInstanceOf(HTMLCanvasElement)
    })
  })

  describe('canvas setup', () => {
    beforeEach(() => {
      mockPrefersReducedMotion(false)
    })

    it('should create a fixed position canvas', () => {
      launchConfetti()

      const canvas = appendChildSpy.mock.calls[0]?.[0] as HTMLCanvasElement
      expect(canvas.style.position).toBe('fixed')
      // jsdom normalizes '0' to '0px'
      expect(canvas.style.top).toMatch(/^0(px)?$/)
      expect(canvas.style.left).toMatch(/^0(px)?$/)
      expect(canvas.style.width).toBe('100%')
      expect(canvas.style.height).toBe('100%')
      expect(canvas.style.pointerEvents).toBe('none')
    })

    it('should set high z-index for visibility', () => {
      launchConfetti()

      const canvas = appendChildSpy.mock.calls[0]?.[0] as HTMLCanvasElement
      expect(canvas.style.zIndex).toBe('9999')
    })

    it('should add resize event listener', () => {
      launchConfetti()

      expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function))
    })
  })

  describe('cleanup', () => {
    beforeEach(() => {
      mockPrefersReducedMotion(false)
    })

    it('should handle missing context gracefully', () => {
      // Mock getContext to return null (restored by vi.restoreAllMocks in afterEach)
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)

      // Should not throw
      expect(() => launchConfetti(100)).not.toThrow()
    })
  })
})
