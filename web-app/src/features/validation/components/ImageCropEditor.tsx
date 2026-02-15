/**
 * ImageCropEditor Component
 *
 * Pan/zoom/rotate image editor for cropping scoresheet images to the correct aspect ratio.
 * Uses react-easy-crop for reliable touch gestures and coordinate calculations.
 */

import { useState, useCallback, useMemo, useEffect } from 'react'

import Cropper from 'react-easy-crop'

import type { ScoresheetType } from '@/features/ocr/utils/scoresheet-detector'
import { X, Check, RotateCcw, RotateCw, AlertCircle } from '@/shared/components/icons'
import { useTranslation } from '@/shared/hooks/useTranslation'

import { getCroppedImage } from '../utils/image-crop'

import type { Area, Point } from 'react-easy-crop'

/** Aspect ratio for electronic scoresheet (17:20 portrait, ~0.85) */
const ELECTRONIC_WIDTH = 17
const ELECTRONIC_HEIGHT = 20
const ELECTRONIC_ASPECT_RATIO = ELECTRONIC_WIDTH / ELECTRONIC_HEIGHT

/** Aspect ratio for manuscript scoresheet roster section (4:5 portrait) */
const MANUSCRIPT_WIDTH = 4
const MANUSCRIPT_HEIGHT = 5
const MANUSCRIPT_ASPECT_RATIO = MANUSCRIPT_WIDTH / MANUSCRIPT_HEIGHT

/** Minimum zoom level */
const MIN_ZOOM = 0.5

/** Maximum zoom level */
const MAX_ZOOM = 3

/** Rotation step in degrees */
const ROTATION_STEP = 90

interface ImageCropEditorProps {
  /** Image blob to crop */
  imageBlob: Blob
  /** Type of scoresheet (affects aspect ratio) */
  scoresheetType: ScoresheetType
  /** Called when user confirms the crop */
  onConfirm: (croppedBlob: Blob) => void
  /** Called when user cancels */
  onCancel: () => void
}

/**
 * Image crop editor with pan/zoom/rotate functionality.
 * Shows a fixed-aspect-ratio frame and lets the user position the image within it.
 */
export function ImageCropEditor({
  imageBlob,
  scoresheetType,
  onConfirm,
  onCancel,
}: ImageCropEditorProps) {
  const { t } = useTranslation()

  // Create object URL for the image
  const imageUrl = useMemo(() => URL.createObjectURL(imageBlob), [imageBlob])

  // Cleanup object URL on unmount or when imageBlob changes
  useEffect(() => {
    return () => URL.revokeObjectURL(imageUrl)
  }, [imageUrl])

  // Crop state
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const aspectRatio =
    scoresheetType === 'electronic' ? ELECTRONIC_ASPECT_RATIO : MANUSCRIPT_ASPECT_RATIO

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleRotateLeft = useCallback(() => {
    setRotation((r) => r - ROTATION_STEP)
  }, [])

  const handleRotateRight = useCallback(() => {
    setRotation((r) => r + ROTATION_STEP)
  }, [])

  const handleConfirm = useCallback(async () => {
    if (!croppedAreaPixels) return

    setIsProcessing(true)
    setError(null)
    try {
      const croppedBlob = await getCroppedImage(imageUrl, croppedAreaPixels, rotation)
      onConfirm(croppedBlob)
    } catch (err) {
      console.error('Failed to crop image:', err)
      setError(t('validation.ocr.errors.processingFailed'))
      setIsProcessing(false)
    }
  }, [croppedAreaPixels, imageUrl, rotation, onConfirm, t])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-900">
      {/* Cropper viewport */}
      <div className="relative flex-1">
        <Cropper
          image={imageUrl}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={aspectRatio}
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onRotationChange={setRotation}
          onCropComplete={onCropComplete}
          showGrid={true}
          classes={{
            containerClassName: '!absolute !inset-0',
            cropAreaClassName: '!border-2 !border-white/90',
          }}
        />
      </div>

      {/* Hint, error, and rotation controls */}
      <div className="flex-shrink-0 py-2 px-4">
        {/* Error message */}
        {error && (
          <div
            className="flex items-center gap-2 mb-2 px-3 py-2 text-sm text-danger-200 bg-danger-900/50 rounded"
            role="alert"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            {error}
          </div>
        )}

        <div className="flex items-center justify-between">
          {/* Rotate left */}
          <button
            type="button"
            onClick={handleRotateLeft}
            className="p-2 text-gray-300 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            aria-label={t('validation.ocr.rotateLeft')}
          >
            <RotateCcw className="w-6 h-6" aria-hidden="true" />
          </button>

          {/* Hint text */}
          <span className="px-3 py-1 text-sm text-gray-300 bg-white/10 rounded">
            {t('validation.ocr.photoGuide.alignScoresheet')}
          </span>

          {/* Rotate right */}
          <button
            type="button"
            onClick={handleRotateRight}
            className="p-2 text-gray-300 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            aria-label={t('validation.ocr.rotateRight')}
          >
            <RotateCw className="w-6 h-6" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex-shrink-0 flex gap-4 p-4 bg-white dark:bg-gray-800">
        <button
          type="button"
          onClick={onCancel}
          disabled={isProcessing}
          className="flex-1 flex items-center justify-center gap-2 min-h-12 px-4 py-3 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          <X className="w-5 h-5" aria-hidden="true" />
          {t('validation.ocr.cancel')}
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isProcessing || !croppedAreaPixels}
          className="flex-1 flex items-center justify-center gap-2 min-h-12 px-4 py-3 text-white bg-primary-500 hover:bg-primary-600 rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          <Check className="w-5 h-5" aria-hidden="true" />
          {isProcessing ? t('validation.ocr.processing') : t('common.confirm')}
        </button>
      </div>
    </div>
  )
}
