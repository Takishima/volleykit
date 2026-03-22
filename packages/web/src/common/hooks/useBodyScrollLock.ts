import { useEffect } from 'react'

/**
 * Locks body scroll and prevents overscroll behavior while active.
 * Restores previous values on cleanup.
 */
export function useBodyScrollLock(isActive: boolean): void {
  useEffect(() => {
    if (!isActive) return
    const prev = document.body.style.overflow
    const prevOverscroll = document.body.style.overscrollBehavior
    document.body.style.overflow = 'hidden'
    document.body.style.overscrollBehavior = 'none'
    return () => {
      document.body.style.overflow = prev
      document.body.style.overscrollBehavior = prevOverscroll
    }
  }, [isActive])
}
