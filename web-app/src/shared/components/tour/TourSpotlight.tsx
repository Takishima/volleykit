import { useEffect, useState, useCallback, useRef, useLayoutEffect } from 'react'

import { createPortal } from 'react-dom'

import { useTranslation } from '@/shared/hooks/useTranslation'

import type { TooltipPlacement } from './definitions/types'

interface TargetRect {
  top: number
  left: number
  right: number
  bottom: number
  width: number
  height: number
}

interface TourSpotlightProps {
  targetSelector: string
  placement: TooltipPlacement
  onDismiss: () => void
  children: React.ReactNode
  /** When true, position updates are frozen (useful during swipe animations) */
  freezePosition?: boolean
  /** When true, disables backdrop blur so drawer buttons are clearly visible */
  disableBlur?: boolean
  /** When true, blocks all interaction with the target element (during auto-swipe demo) */
  blockInteraction?: boolean
  /** When true, blocks interaction with the entire page except for the tour tooltip */
  blockAllInteraction?: boolean
}

const SPOTLIGHT_PADDING = 8
const TOOLTIP_OFFSET = 16
const ARROW_SIZE = 12
const VIEWPORT_MARGIN = 16
const MUTATION_OBSERVER_DEBOUNCE_MS = 100
// Z-index layers for tour overlay (must be between backdrop z-40 and tooltip z-50)
const TARGET_ELEVATION_Z_INDEX = '45'
const INTERACTION_BLOCKER_Z_INDEX = 'z-[46]'

function calculateTargetRect(target: Element): TargetRect {
  const rect = target.getBoundingClientRect()
  return {
    top: rect.top - SPOTLIGHT_PADDING,
    left: rect.left - SPOTLIGHT_PADDING,
    right: rect.right + SPOTLIGHT_PADDING,
    bottom: rect.bottom + SPOTLIGHT_PADDING,
    width: rect.width + SPOTLIGHT_PADDING * 2,
    height: rect.height + SPOTLIGHT_PADDING * 2,
  }
}

function calculateTooltipPosition(
  paddedRect: TargetRect,
  tooltipRect: DOMRect,
  placement: TooltipPlacement
): { top: number; left: number } {
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  let top = 0
  let left = 0

  switch (placement) {
    case 'bottom':
      top = paddedRect.bottom + TOOLTIP_OFFSET
      left = paddedRect.left + paddedRect.width / 2 - tooltipRect.width / 2
      break
    case 'top':
      top = paddedRect.top - tooltipRect.height - TOOLTIP_OFFSET
      left = paddedRect.left + paddedRect.width / 2 - tooltipRect.width / 2
      break
    case 'left':
      top = paddedRect.top + paddedRect.height / 2 - tooltipRect.height / 2
      left = paddedRect.left - tooltipRect.width - TOOLTIP_OFFSET
      break
    case 'right':
      top = paddedRect.top + paddedRect.height / 2 - tooltipRect.height / 2
      left = paddedRect.right + TOOLTIP_OFFSET
      break
  }

  // Keep tooltip within viewport bounds
  left = Math.max(
    VIEWPORT_MARGIN,
    Math.min(left, viewportWidth - tooltipRect.width - VIEWPORT_MARGIN)
  )
  top = Math.max(
    VIEWPORT_MARGIN,
    Math.min(top, viewportHeight - tooltipRect.height - VIEWPORT_MARGIN)
  )

  return { top, left }
}

export function TourSpotlight({
  targetSelector,
  placement,
  onDismiss,
  children,
  freezePosition = false,
  disableBlur = false,
  blockInteraction = false,
  blockAllInteraction = false,
}: TourSpotlightProps) {
  // Start with null - position will be set after mount when element is ready
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 })
  const [isPositioned, setIsPositioned] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const { t } = useTranslation()

  // Find target element and calculate positions
  const updatePositions = useCallback(
    (force = false) => {
      // Skip updates when position is frozen (during swipe animations)
      if (freezePosition && isPositioned && !force) return

      const target = document.querySelector(targetSelector)
      if (!target) return

      const paddedRect = calculateTargetRect(target)
      setTargetRect(paddedRect)
      setIsPositioned(true)

      // Calculate tooltip position after render
      requestAnimationFrame(() => {
        if (!tooltipRef.current) return

        const tooltipRect = tooltipRef.current.getBoundingClientRect()
        const position = calculateTooltipPosition(paddedRect, tooltipRect, placement)
        setTooltipPosition(position)
      })
    },
    [targetSelector, placement, freezePosition, isPositioned]
  )

  // Elevate target element and its SwipeableCard container above overlay
  // using useLayoutEffect to apply styles before paint
  useLayoutEffect(() => {
    const target = document.querySelector(targetSelector)
    if (!target) return

    const element = target as HTMLElement

    // Store original styles in local variables for cleanup
    const originalPosition = element.style.position
    const originalZIndex = element.style.zIndex

    // Elevate the element
    element.style.position = 'relative'
    element.style.zIndex = TARGET_ELEVATION_Z_INDEX

    // Also elevate SwipeableCard container if target is inside one
    // This ensures the swipe drawer actions are also above the overlay
    const swipeableContainer = element.closest('.overflow-hidden') as HTMLElement | null
    let originalContainerPosition: string | undefined
    let originalContainerZIndex: string | undefined

    if (swipeableContainer && swipeableContainer !== element) {
      originalContainerPosition = swipeableContainer.style.position
      originalContainerZIndex = swipeableContainer.style.zIndex
      swipeableContainer.style.position = 'relative'
      swipeableContainer.style.zIndex = TARGET_ELEVATION_Z_INDEX
    }

    return () => {
      // Restore original styles
      element.style.position = originalPosition
      element.style.zIndex = originalZIndex

      if (swipeableContainer && swipeableContainer !== element) {
        swipeableContainer.style.position = originalContainerPosition ?? ''
        swipeableContainer.style.zIndex = originalContainerZIndex ?? ''
      }
    }
  }, [targetSelector])

  // Update tooltip position after initial render
  useEffect(() => {
    if (!targetRect || !tooltipRef.current) return

    const tooltipRect = tooltipRef.current.getBoundingClientRect()
    const position = calculateTooltipPosition(targetRect, tooltipRect, placement)
    setTooltipPosition(position)
  }, [targetRect, placement])

  // Scroll target into view - this is a separate effect that only depends on targetSelector
  // to avoid re-scrolling when other dependencies change
  useEffect(() => {
    const target = document.querySelector(targetSelector)
    if (!target) return

    // First calculate initial position so spotlight appears immediately
    updatePositions(true)

    // Then scroll element into view with smooth animation
    // The scroll event listener will update positions during the animation
    target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Only scroll when target changes, not when updatePositions changes
  }, [targetSelector])

  // Subscribe to scroll/resize events for position updates during the tour
  useEffect(() => {
    const handleUpdate = () => updatePositions()

    // Listen on window for resize
    window.addEventListener('resize', handleUpdate, { passive: true })

    // Listen on document with capture to catch all scroll events (including nested containers)
    document.addEventListener('scroll', handleUpdate, { passive: true, capture: true })

    // Debounce MutationObserver to avoid performance issues
    let mutationTimeout: ReturnType<typeof setTimeout> | null = null
    const handleMutation = () => {
      if (mutationTimeout) clearTimeout(mutationTimeout)
      mutationTimeout = setTimeout(handleUpdate, MUTATION_OBSERVER_DEBOUNCE_MS)
    }

    // Also observe DOM changes in case content shifts
    const observer = new MutationObserver(handleMutation)
    observer.observe(document.body, { childList: true, subtree: true })

    return () => {
      window.removeEventListener('resize', handleUpdate)
      document.removeEventListener('scroll', handleUpdate, { capture: true })
      if (mutationTimeout) clearTimeout(mutationTimeout)
      observer.disconnect()
    }
  }, [updatePositions])

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onDismiss()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onDismiss])

  // Don't render until we have a valid position to prevent flashing at wrong location
  if (!targetRect || !isPositioned) return null

  // Generate clip-path polygon that cuts out the target area
  const clipPath = `polygon(
    0% 0%,
    0% 100%,
    ${targetRect.left}px 100%,
    ${targetRect.left}px ${targetRect.top}px,
    ${targetRect.right}px ${targetRect.top}px,
    ${targetRect.right}px ${targetRect.bottom}px,
    ${targetRect.left}px ${targetRect.bottom}px,
    ${targetRect.left}px 100%,
    100% 100%,
    100% 0%
  )`

  // Calculate arrow position based on placement
  const getArrowStyles = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'absolute',
      width: 0,
      height: 0,
      borderStyle: 'solid',
    }

    switch (placement) {
      case 'bottom':
        return {
          ...base,
          top: -ARROW_SIZE,
          left: '50%',
          transform: 'translateX(-50%)',
          borderWidth: `0 ${ARROW_SIZE}px ${ARROW_SIZE}px ${ARROW_SIZE}px`,
          borderColor: 'transparent transparent var(--arrow-color) transparent',
        }
      case 'top':
        return {
          ...base,
          bottom: -ARROW_SIZE,
          left: '50%',
          transform: 'translateX(-50%)',
          borderWidth: `${ARROW_SIZE}px ${ARROW_SIZE}px 0 ${ARROW_SIZE}px`,
          borderColor: 'var(--arrow-color) transparent transparent transparent',
        }
      case 'left':
        return {
          ...base,
          right: -ARROW_SIZE,
          top: '50%',
          transform: 'translateY(-50%)',
          borderWidth: `${ARROW_SIZE}px 0 ${ARROW_SIZE}px ${ARROW_SIZE}px`,
          borderColor: 'transparent transparent transparent var(--arrow-color)',
        }
      case 'right':
        return {
          ...base,
          left: -ARROW_SIZE,
          top: '50%',
          transform: 'translateY(-50%)',
          borderWidth: `${ARROW_SIZE}px ${ARROW_SIZE}px ${ARROW_SIZE}px 0`,
          borderColor: 'transparent var(--arrow-color) transparent transparent',
        }
    }
  }

  return createPortal(
    <div
      className="tour-spotlight pointer-events-none"
      role="dialog"
      aria-modal="true"
      aria-label={t('tour.accessibility.spotlightLabel')}
    >
      {/* Full-screen interaction blocker - blocks all page interaction during tour */}
      {blockAllInteraction && (
        <div className="fixed inset-0 z-40 pointer-events-auto" aria-hidden="true" />
      )}

      {/* Backdrop overlay with blur and cutout - pointer-events-none to let clicks through */}
      <div
        className={`fixed inset-0 z-40 bg-black/70 transition-opacity ${disableBlur ? '' : 'backdrop-blur-sm'}`}
        style={{ clipPath }}
        aria-hidden="true"
      />

      {/* Interaction blocker - covers target area during auto-swipe demo */}
      {blockInteraction && (
        <div
          className={`fixed ${INTERACTION_BLOCKER_Z_INDEX} pointer-events-auto`}
          style={{
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height,
          }}
          aria-hidden="true"
        />
      )}

      {/* Tooltip - needs pointer-events-auto to be interactive */}
      <div
        ref={tooltipRef}
        className="fixed z-50 w-72 sm:w-80 bg-surface-card dark:bg-surface-card-dark rounded-xl shadow-2xl border border-border-subtle dark:border-border-subtle-dark/50 overflow-hidden pointer-events-auto"
        style={{
          top: tooltipPosition.top,
          left: tooltipPosition.left,
          // CSS variable for arrow color matching tooltip background
          ['--arrow-color' as string]: 'var(--color-surface-card)',
        }}
      >
        {/* Arrow */}
        <div
          style={getArrowStyles()}
          className="[--arrow-color:theme(colors.white)] dark:[--arrow-color:theme(colors.gray.800)]"
          aria-hidden="true"
        />

        {children}
      </div>
    </div>,
    document.body
  )
}
