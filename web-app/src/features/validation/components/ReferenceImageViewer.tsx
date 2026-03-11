import { useState, useRef, useCallback, useEffect } from 'react'

import { X } from '@/shared/components/icons'
import { useTranslation } from '@/shared/hooks/useTranslation'

interface ReferenceImageViewerProps {
  /** Object URL of the scoresheet reference image */
  imageUrl: string
  /** Called when the user wants to dismiss the viewer (quick-compare mode) */
  onClose?: () => void
  /** Whether to show the close button (quick-compare mode) */
  showCloseButton?: boolean
  /** Maximum height constraint (for split-view mode) */
  className?: string
}

/** Minimum zoom level */
const MIN_ZOOM = 1
/** Maximum zoom level */
const MAX_ZOOM = 5
/** Double-tap zoom level */
const DOUBLE_TAP_ZOOM = 2.5
/** Maximum time between taps for double-tap detection (ms) */
const DOUBLE_TAP_THRESHOLD_MS = 300
/** Zoom step per scroll wheel tick */
const WHEEL_ZOOM_STEP = 0.2

/**
 * Zoomable, pannable image viewer for the scoresheet reference photo.
 * Supports pinch-to-zoom and double-tap on touch devices, scroll wheel zoom on desktop.
 */
export function ReferenceImageViewer({
  imageUrl,
  onClose,
  showCloseButton = false,
  className = '',
}: ReferenceImageViewerProps) {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(MIN_ZOOM)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const lastTapRef = useRef(0)
  const isPanningRef = useRef(false)
  const lastPanPointRef = useRef({ x: 0, y: 0 })
  const initialPinchDistanceRef = useRef<number | null>(null)
  const initialPinchZoomRef = useRef(MIN_ZOOM)
  const [prevImageUrl, setPrevImageUrl] = useState(imageUrl)

  // Reset zoom/pan when image changes (computed during render, per React docs)
  if (prevImageUrl !== imageUrl) {
    setPrevImageUrl(imageUrl)
    setZoom(MIN_ZOOM)
    setPan({ x: 0, y: 0 })
  }

  const clampPan = useCallback((x: number, y: number, currentZoom: number) => {
    if (currentZoom <= MIN_ZOOM) return { x: 0, y: 0 }
    const container = containerRef.current
    if (!container) return { x, y }
    const maxPanX = (container.clientWidth * (currentZoom - 1)) / 2
    const maxPanY = (container.clientHeight * (currentZoom - 1)) / 2
    return {
      x: Math.max(-maxPanX, Math.min(maxPanX, x)),
      y: Math.max(-maxPanY, Math.min(maxPanY, y)),
    }
  }, [])

  // Attach wheel listener imperatively with { passive: false } so preventDefault works
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -WHEEL_ZOOM_STEP : WHEEL_ZOOM_STEP
      setZoom((prev) => {
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev + delta))
        if (newZoom <= MIN_ZOOM) setPan({ x: 0, y: 0 })
        return newZoom
      })
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [])

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Double-tap detection
      const now = Date.now()
      if (now - lastTapRef.current < DOUBLE_TAP_THRESHOLD_MS) {
        // Double-tap: toggle between zoomed and reset
        if (zoom > MIN_ZOOM) {
          setZoom(MIN_ZOOM)
          setPan({ x: 0, y: 0 })
        } else {
          setZoom(DOUBLE_TAP_ZOOM)
        }
        lastTapRef.current = 0
        return
      }
      lastTapRef.current = now

      if (zoom > MIN_ZOOM) {
        isPanningRef.current = true
        setIsPanning(true)
        lastPanPointRef.current = { x: e.clientX, y: e.clientY }
      }
    },
    [zoom]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isPanningRef.current) return
      const dx = e.clientX - lastPanPointRef.current.x
      const dy = e.clientY - lastPanPointRef.current.y
      lastPanPointRef.current = { x: e.clientX, y: e.clientY }
      setPan((prev) => clampPan(prev.x + dx, prev.y + dy, zoom))
    },
    [zoom, clampPan]
  )

  const handlePointerUp = useCallback(() => {
    isPanningRef.current = false
    setIsPanning(false)
  }, [])

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        const t0 = e.touches[0]!
        const t1 = e.touches[1]!
        const dx = t0.clientX - t1.clientX
        const dy = t0.clientY - t1.clientY
        initialPinchDistanceRef.current = Math.hypot(dx, dy)
        initialPinchZoomRef.current = zoom
      }
    },
    [zoom]
  )

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialPinchDistanceRef.current !== null) {
      e.preventDefault()
      const t0 = e.touches[0]!
      const t1 = e.touches[1]!
      const dx = t0.clientX - t1.clientX
      const dy = t0.clientY - t1.clientY
      const distance = Math.hypot(dx, dy)
      const scale = distance / initialPinchDistanceRef.current
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, initialPinchZoomRef.current * scale))
      setZoom(newZoom)
      if (newZoom <= MIN_ZOOM) setPan({ x: 0, y: 0 })
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    initialPinchDistanceRef.current = null
  }, [])

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden bg-surface-subtle dark:bg-surface-card-dark select-none ${className}`}
      style={{ touchAction: 'none' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <img
        src={imageUrl}
        alt={t('validation.referenceImage.alt')}
        className="w-full h-full object-contain"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
          transition: isPanning ? 'none' : 'transform 0.15s ease-out',
        }}
        draggable={false}
      />

      {/* Zoom indicator */}
      {zoom > MIN_ZOOM && (
        <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 text-white text-xs rounded">
          {Math.round(zoom * 100)}%
        </div>
      )}

      {showCloseButton && onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
          aria-label={t('validation.referenceImage.backToForm')}
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
