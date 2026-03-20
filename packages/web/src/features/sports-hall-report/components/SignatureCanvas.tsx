import { useCallback, useEffect, useRef, useState } from 'react'

import SignaturePad from 'signature_pad'

import { Button } from '@/shared/components/Button'
import { RotateCw, Trash2, Check, X } from '@/shared/components/icons'
import { useTranslation } from '@/shared/hooks/useTranslation'

interface SignatureCanvasProps {
  onComplete: (dataUrl: string) => void
  onCancel: () => void
}

/**
 * Full-screen signature capture overlay.
 *
 * Covers the entire viewport with a white canvas for drawing.
 * Shows a landscape orientation hint when the device is in portrait mode.
 * Uses signature_pad for touch/mouse/stylus input.
 */
export function SignatureCanvas({ onComplete, onCancel }: SignatureCanvasProps) {
  const { t } = useTranslation()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const padRef = useRef<SignaturePad | null>(null)
  const [isEmpty, setIsEmpty] = useState(true)
  const [isPortrait, setIsPortrait] = useState(
    () => window.matchMedia('(orientation: portrait)').matches
  )

  // Track orientation changes
  useEffect(() => {
    const mql = window.matchMedia('(orientation: portrait)')
    const handler = (e: MediaQueryListEvent) => setIsPortrait(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  // Initialize SignaturePad and handle resize
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resizeCanvas = () => {
      const container = canvas.parentElement
      if (!container) return

      // Save existing data before resize
      const existingData = padRef.current?.toData()

      const ratio = Math.max(window.devicePixelRatio, 1)
      canvas.width = container.clientWidth * ratio
      canvas.height = container.clientHeight * ratio
      canvas.style.width = `${container.clientWidth}px`
      canvas.style.height = `${container.clientHeight}px`

      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.scale(ratio, ratio)
      }

      // Restore data after resize
      if (padRef.current && existingData && existingData.length > 0) {
        padRef.current.fromData(existingData)
      }
    }

    const pad = new SignaturePad(canvas, {
      penColor: '#000000',
      backgroundColor: 'rgba(255, 255, 255, 0)',
    })

    pad.addEventListener('endStroke', () => {
      setIsEmpty(pad.isEmpty())
    })

    padRef.current = pad
    resizeCanvas()

    window.addEventListener('resize', resizeCanvas)
    return () => {
      window.removeEventListener('resize', resizeCanvas)
      pad.off()
    }
  }, [])

  const handleClear = useCallback(() => {
    padRef.current?.clear()
    setIsEmpty(true)
  }, [])

  const handleDone = useCallback(() => {
    if (!padRef.current || padRef.current.isEmpty()) return
    const dataUrl = padRef.current.toDataURL('image/png')
    onComplete(dataUrl)
  }, [onComplete])

  // Lock body scroll while overlay is open
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  return (
    <div
      className="fixed inset-0 bg-white flex flex-col"
      style={{ zIndex: 60 }}
      role="dialog"
      aria-modal="true"
      aria-label={t('pdf.wizard.signature.title')}
    >
      {/* Header toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="w-4 h-4" aria-hidden="true" />
          {t('common.cancel')}
        </Button>

        <h2 className="text-sm font-medium text-gray-900">{t('pdf.wizard.signature.title')}</h2>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleClear} disabled={isEmpty}>
            <Trash2 className="w-4 h-4" aria-hidden="true" />
            {t('pdf.wizard.signature.clear')}
          </Button>
          <Button variant="blue" size="sm" onClick={handleDone} disabled={isEmpty}>
            <Check className="w-4 h-4" aria-hidden="true" />
            {t('pdf.wizard.signature.done')}
          </Button>
        </div>
      </div>

      {/* Canvas area */}
      <div className="relative flex-1">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 touch-none"
          aria-label={t('pdf.wizard.signature.drawHint')}
        />

        {/* Center hint text (visible only when canvas is empty) */}
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-lg text-gray-300 select-none">
              {t('pdf.wizard.signature.drawHint')}
            </p>
          </div>
        )}

        {/* Portrait orientation hint */}
        {isPortrait && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm pointer-events-none">
            <div className="flex flex-col items-center gap-3 text-gray-500">
              <RotateCw className="w-10 h-10 animate-pulse" aria-hidden="true" />
              <p className="text-sm font-medium text-center px-8">
                {t('pdf.wizard.signature.rotateLandscape')}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
