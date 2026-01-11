import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { launchConfetti } from './confetti'

describe('launchConfetti', () => {
  let originalMatchMedia: typeof window.matchMedia
  let appendChildSpy: ReturnType<typeof vi.spyOn>
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    originalMatchMedia = window.matchMedia
    appendChildSpy = vi.spyOn(document.body, 'appendChild')
    addEventListenerSpy = vi.spyOn(window, 'addEventListener')
  })

  afterEach(() => {
    window.matchMedia = originalMatchMedia
    vi.restoreAllMocks()
    // Clean up any canvases that might have been added
    document.querySelectorAll('canvas').forEach((c) => c.remove())
  })

  describe('prefers-reduced-motion', () => {
    it('should not create canvas when user prefers reduced motion', () => {
      window.matchMedia = vi.fn().mockReturnValue({
        matches: true,
        media: '(prefers-reduced-motion: reduce)',
      })

      launchConfetti()

      expect(appendChildSpy).not.toHaveBeenCalled()
    })

    it('should create canvas when user does not prefer reduced motion', () => {
      window.matchMedia = vi.fn().mockReturnValue({
        matches: false,
        media: '(prefers-reduced-motion: reduce)',
      })

      launchConfetti()

      expect(appendChildSpy).toHaveBeenCalled()
      const canvas = appendChildSpy.mock.calls[0]?.[0]
      expect(canvas).toBeInstanceOf(HTMLCanvasElement)
    })
  })

  describe('canvas setup', () => {
    beforeEach(() => {
      window.matchMedia = vi.fn().mockReturnValue({
        matches: false,
        media: '(prefers-reduced-motion: reduce)',
      })
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
      window.matchMedia = vi.fn().mockReturnValue({
        matches: false,
        media: '(prefers-reduced-motion: reduce)',
      })
    })

    it('should handle missing context gracefully', () => {
      // Mock getContext to return null
      const originalGetContext = HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(null)

      // Should not throw
      expect(() => launchConfetti(100)).not.toThrow()

      HTMLCanvasElement.prototype.getContext = originalGetContext
    })
  })
})
