import { useState, useRef, useCallback, useEffect } from 'react'

/** Raw pixels to pull before triggering refresh (before resistance applied) */
const RAW_PULL_THRESHOLD = 80

/** Maximum visual pull distance (with resistance applied) */
const MAX_PULL_DISTANCE = 120

/** Resistance factor - higher = more resistance */
const RESISTANCE_FACTOR = 0.4

/** Threshold with resistance applied - this is what pullDistance is compared against */
const PULL_THRESHOLD = RAW_PULL_THRESHOLD * RESISTANCE_FACTOR

export interface UsePullToRefreshOptions {
  /** Callback to execute when refresh is triggered */
  onRefresh: () => Promise<void>
  /** Whether pull-to-refresh is enabled (default: true) */
  enabled?: boolean
}

export interface UsePullToRefreshResult {
  /** Current pull distance in pixels (with resistance applied) */
  pullDistance: number
  /** Whether a refresh is currently in progress */
  isRefreshing: boolean
  /** Threshold distance that triggers refresh */
  threshold: number
  /** Props to spread on the scrollable container */
  containerProps: {
    onTouchStart: (e: React.TouchEvent) => void
    onTouchMove: (e: React.TouchEvent) => void
    onTouchEnd: () => void
  }
}

/**
 * Hook to implement pull-to-refresh functionality.
 * Only activates when scrolled to the top of the page.
 *
 * @example
 * ```tsx
 * const { pullDistance, isRefreshing, threshold, containerProps } = usePullToRefresh({
 *   onRefresh: async () => { await refetch() }
 * })
 *
 * return (
 *   <div {...containerProps}>
 *     <PullIndicator distance={pullDistance} threshold={threshold} isRefreshing={isRefreshing} />
 *     {children}
 *   </div>
 * )
 * ```
 */
export function usePullToRefresh({
  onRefresh,
  enabled = true,
}: UsePullToRefreshOptions): UsePullToRefreshResult {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Track touch state
  const startY = useRef(0)
  const isPulling = useRef(false)

  // Reset state when disabled
  useEffect(() => {
    if (!enabled) {
      setPullDistance(0)
      setIsRefreshing(false)
      startY.current = 0
      isPulling.current = false
    }
  }, [enabled])

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled || isRefreshing) return

      // Only enable pull-to-refresh when at the top of the scroll container
      // Check both window scroll and the element's scroll position
      const element = e.currentTarget as HTMLElement
      const isAtTop = window.scrollY <= 0 && element.scrollTop <= 0
      const touch = e.touches[0]

      if (isAtTop && touch) {
        startY.current = touch.clientY
        isPulling.current = true
      }
    },
    [enabled, isRefreshing]
  )

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      // isPulling.current is the authoritative check for whether a pull gesture is active
      if (!enabled || !isPulling.current || isRefreshing) {
        return
      }

      const touch = e.touches[0]
      if (!touch) return

      const currentY = touch.clientY
      const diff = currentY - startY.current

      // Only track downward pulls
      if (diff > 0) {
        // Apply resistance - the further you pull, the harder it gets
        const resistedDistance = Math.min(diff * RESISTANCE_FACTOR, MAX_PULL_DISTANCE)
        setPullDistance(resistedDistance)

        // Prevent native scroll when pulling down at top
        if (window.scrollY <= 0) {
          e.preventDefault()
        }
      } else {
        // User is scrolling up, cancel pull
        setPullDistance(0)
        isPulling.current = false
      }
    },
    [enabled, isRefreshing]
  )

  const handleTouchEnd = useCallback(async () => {
    if (!enabled || !isPulling.current) return

    isPulling.current = false

    if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true)
      // Keep showing indicator during refresh
      setPullDistance(PULL_THRESHOLD)

      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
        setPullDistance(0)
      }
    } else {
      // Snap back if threshold not reached
      setPullDistance(0)
    }

    startY.current = 0
  }, [enabled, pullDistance, isRefreshing, onRefresh])

  return {
    pullDistance,
    isRefreshing,
    threshold: PULL_THRESHOLD,
    containerProps: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  }
}
