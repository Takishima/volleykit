import { useCallback } from 'react'

interface OverlayTouchHandlers {
  onTouchStart: (e: React.TouchEvent) => void
  onTouchMove: (e: React.TouchEvent) => void
  onTouchEnd: (e: React.TouchEvent) => void
}

/**
 * Returns touch event handlers that prevent propagation through React's
 * synthetic event system.
 *
 * Without this, React's events bubble from portal-rendered overlays through
 * the React component hierarchy up to PullToRefresh, which can misinterpret
 * drawing strokes or scrolling as pull-to-refresh gestures.
 *
 * Touch events on canvas, textarea, and input elements are allowed through.
 * Elements within containers marked with `data-scrollable` are also allowed.
 */
export function useOverlayTouchGuard(): OverlayTouchHandlers {
  const stopPropagation = useCallback((e: React.TouchEvent) => {
    e.stopPropagation()
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.stopPropagation()
    // Allow touch on interactive elements (inputs, textareas, buttons, scrollable content)
    const target = e.target as HTMLElement
    if (
      target instanceof HTMLCanvasElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLInputElement
    )
      return
    // Allow scrolling within scrollable containers
    if (target.closest('[data-scrollable]')) return
    e.preventDefault()
  }, [])

  return {
    onTouchStart: stopPropagation,
    onTouchMove: handleTouchMove,
    onTouchEnd: stopPropagation,
  }
}
