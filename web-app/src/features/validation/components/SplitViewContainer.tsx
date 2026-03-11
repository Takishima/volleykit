import { useState, useRef, useCallback, type ReactNode } from 'react'

import { GripHorizontal } from '@/shared/components/icons'

import { ReferenceImageViewer } from './ReferenceImageViewer'

interface SplitViewContainerProps {
  /** Object URL of the scoresheet reference image */
  referenceImageUrl: string
  /** The step form content */
  children: ReactNode
}

/** Default split percentage for the image panel (top) */
const DEFAULT_SPLIT_PERCENT = 40
/** Minimum split percentage */
const MIN_SPLIT_PERCENT = 20
/** Maximum split percentage */
const MAX_SPLIT_PERCENT = 70
/** Height of the draggable divider handle in pixels */
const DIVIDER_HEIGHT_PX = 24

/**
 * Split-view layout showing the scoresheet reference image on top
 * and the step form content on the bottom with a draggable divider.
 */
export function SplitViewContainer({ referenceImageUrl, children }: SplitViewContainerProps) {
  const [splitPercent, setSplitPercent] = useState(DEFAULT_SPLIT_PERCENT)
  const containerRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)

  const handleDragStart = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    isDraggingRef.current = true
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [])

  const handleDragMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const y = e.clientY - rect.top
    const percent = (y / rect.height) * 100
    setSplitPercent(Math.max(MIN_SPLIT_PERCENT, Math.min(MAX_SPLIT_PERCENT, percent)))
  }, [])

  const handleDragEnd = useCallback(() => {
    isDraggingRef.current = false
  }, [])

  return (
    <div ref={containerRef} className="flex flex-col h-full" style={{ touchAction: 'none' }}>
      {/* Image panel (top) */}
      <div style={{ height: `calc(${splitPercent}% - ${DIVIDER_HEIGHT_PX / 2}px)` }}>
        <ReferenceImageViewer imageUrl={referenceImageUrl} className="h-full rounded-t-lg" />
      </div>

      {/* Draggable divider */}
      <div
        className="flex items-center justify-center cursor-row-resize bg-surface-muted dark:bg-surface-subtle-dark border-y border-border-default dark:border-border-default-dark hover:bg-surface-strong dark:hover:bg-surface-muted-dark transition-colors"
        style={{ height: `${DIVIDER_HEIGHT_PX}px`, touchAction: 'none' }}
        onPointerDown={handleDragStart}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
        onPointerCancel={handleDragEnd}
        role="separator"
        aria-orientation="horizontal"
        aria-valuenow={Math.round(splitPercent)}
        aria-valuemin={MIN_SPLIT_PERCENT}
        aria-valuemax={MAX_SPLIT_PERCENT}
      >
        <GripHorizontal
          className="w-5 h-5 text-text-subtle dark:text-text-subtle-dark"
          aria-hidden="true"
        />
      </div>

      {/* Form panel (bottom) */}
      <div
        className="overflow-y-auto"
        style={{ height: `calc(${100 - splitPercent}% - ${DIVIDER_HEIGHT_PX / 2}px)` }}
      >
        {children}
      </div>
    </div>
  )
}
