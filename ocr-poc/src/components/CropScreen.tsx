/**
 * CropScreen Component
 *
 * Pan/zoom/rotate image editor for cropping scoresheet images.
 * Uses react-easy-crop for reliable touch gestures and coordinate calculations.
 * Adapted from web-app's ImageCropEditor with hardcoded English text.
 */

import { useState, useCallback, useMemo, useEffect } from 'react'

import Cropper from 'react-easy-crop'
import { X, Check, RotateCcw, RotateCw, AlertCircle } from 'lucide-react'

import { useAppStore } from '@/stores/appStore'

import type { Area, Point } from 'react-easy-crop'

/** Aspect ratio for electronic scoresheet (17:20 portrait, ~0.85) */
const ELECTRONIC_WIDTH = 17
const ELECTRONIC_HEIGHT = 20
const ELECTRONIC_ASPECT_RATIO = ELECTRONIC_WIDTH / ELECTRONIC_HEIGHT

/** Aspect ratio for manuscript scoresheet roster section (4:5 portrait) */
const MANUSCRIPT_WIDTH = 4
const MANUSCRIPT_HEIGHT = 5
const MANUSCRIPT_ASPECT_RATIO = MANUSCRIPT_WIDTH / MANUSCRIPT_HEIGHT

/** Full manuscript aspect ratio (7:5 landscape) */
const MANUSCRIPT_FULL_WIDTH = 7
const MANUSCRIPT_FULL_HEIGHT = 5
const MANUSCRIPT_FULL_ASPECT_RATIO = MANUSCRIPT_FULL_WIDTH / MANUSCRIPT_FULL_HEIGHT

const MIN_ZOOM = 0.5
const MAX_ZOOM = 3
const ROTATION_STEP = 90
const DEGREES_PER_HALF_CIRCLE = 180
const DEFAULT_JPEG_QUALITY = 0.92

interface CropScreenProps {
  /** Whether this is a roster-only crop from full manuscript */
  isRosterCrop?: boolean
}

/**
 * Converts degrees to radians.
 */
function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / DEGREES_PER_HALF_CIRCLE
}

/**
 * Calculates the bounding box dimensions of a rotated rectangle.
 */
function getRotatedBoundingBox(
  width: number,
  height: number,
  rotation: number
): { width: number; height: number } {
  const rotRad = degreesToRadians(rotation)
  const sinRot = Math.abs(Math.sin(rotRad))
  const cosRot = Math.abs(Math.cos(rotRad))

  return {
    width: width * cosRot + height * sinRot,
    height: width * sinRot + height * cosRot,
  }
}

/**
 * Creates an Image element from a source URL.
 */
function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (error) => reject(error))
    image.src = url
  })
}

/**
 * Creates a cropped image from the source image and crop area.
 */
async function getCroppedImage(
  imageSrc: string,
  pixelCrop: Area,
  rotation: number,
  quality: number = DEFAULT_JPEG_QUALITY
): Promise<Blob> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('Could not get canvas context')
  }

  const rotRad = degreesToRadians(rotation)
  const { width: bBoxWidth, height: bBoxHeight } = getRotatedBoundingBox(
    image.width,
    image.height,
    rotation
  )

  canvas.width = bBoxWidth
  canvas.height = bBoxHeight

  ctx.translate(bBoxWidth / 2, bBoxHeight / 2)
  ctx.rotate(rotRad)
  ctx.translate(-image.width / 2, -image.height / 2)
  ctx.drawImage(image, 0, 0)

  const croppedCanvas = document.createElement('canvas')
  const croppedCtx = croppedCanvas.getContext('2d')

  if (!croppedCtx) {
    throw new Error('Could not get cropped canvas context')
  }

  croppedCanvas.width = pixelCrop.width
  croppedCanvas.height = pixelCrop.height

  croppedCtx.drawImage(
    canvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  )

  return new Promise((resolve, reject) => {
    croppedCanvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Failed to create blob from canvas'))
        }
      },
      'image/jpeg',
      quality
    )
  })
}

export function CropScreen({ isRosterCrop = false }: CropScreenProps) {
  const capturedImage = useAppStore((s) => s.capturedImage)
  const sheetType = useAppStore((s) => s.sheetType)
  const captureMode = useAppStore((s) => s.captureMode)
  const setCroppedImage = useAppStore((s) => s.setCroppedImage)
  const goToProcessing = useAppStore((s) => s.goToProcessing)
  const goToRosterCrop = useAppStore((s) => s.goToRosterCrop)
  const goBack = useAppStore((s) => s.goBack)

  // Create object URL for the image
  const imageUrl = useMemo(() => {
    if (!capturedImage) return null
    return URL.createObjectURL(capturedImage)
  }, [capturedImage])

  // Cleanup object URL on unmount or when image changes
  useEffect(() => {
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl)
      }
    }
  }, [imageUrl])

  // Crop state
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Determine aspect ratio based on sheet type and crop mode
  const aspectRatio = useMemo(() => {
    if (isRosterCrop) {
      // Roster crop from full manuscript is always 4:5 portrait
      return MANUSCRIPT_ASPECT_RATIO
    }
    if (sheetType === 'electronic') {
      return ELECTRONIC_ASPECT_RATIO
    }
    if (sheetType === 'manuscript' && captureMode === 'full') {
      return MANUSCRIPT_FULL_ASPECT_RATIO
    }
    return MANUSCRIPT_ASPECT_RATIO
  }, [sheetType, captureMode, isRosterCrop])

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
    if (!croppedAreaPixels || !imageUrl) return

    setIsProcessing(true)
    setError(null)

    try {
      const croppedBlob = await getCroppedImage(imageUrl, croppedAreaPixels, rotation)
      setCroppedImage(croppedBlob)

      // If this was full manuscript capture, go to roster crop next
      // Otherwise go directly to processing
      if (sheetType === 'manuscript' && captureMode === 'full' && !isRosterCrop) {
        goToRosterCrop()
      } else {
        goToProcessing()
      }
    } catch (err) {
      console.error('Failed to crop image:', err)
      setError('Failed to process image. Please try again.')
      setIsProcessing(false)
    }
  }, [
    croppedAreaPixels,
    imageUrl,
    rotation,
    setCroppedImage,
    sheetType,
    captureMode,
    isRosterCrop,
    goToRosterCrop,
    goToProcessing,
  ])

  if (!imageUrl) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <p className="text-slate-600">No image to edit</p>
      </div>
    )
  }

  const title = isRosterCrop ? 'Select Roster Area' : 'Adjust Image'

  return (
    <div className="flex-1 flex flex-col bg-gray-900">
      {/* Cropper viewport */}
      <div className="relative flex-1 min-h-0">
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
          <div className="flex items-center gap-2 mb-2 px-3 py-2 text-sm text-red-200 bg-red-900/50 rounded">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="flex items-center justify-between">
          {/* Rotate left */}
          <button
            type="button"
            onClick={handleRotateLeft}
            className="p-2 text-gray-300 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            aria-label="Rotate left"
          >
            <RotateCcw className="w-6 h-6" />
          </button>

          {/* Hint text */}
          <span className="px-3 py-1 text-sm text-gray-300 bg-white/10 rounded">
            {title} - Pinch to zoom, drag to position
          </span>

          {/* Rotate right */}
          <button
            type="button"
            onClick={handleRotateRight}
            className="p-2 text-gray-300 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            aria-label="Rotate right"
          >
            <RotateCw className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex-shrink-0 flex gap-4 p-4 bg-white">
        <button
          type="button"
          onClick={goBack}
          disabled={isProcessing}
          className="flex-1 flex items-center justify-center gap-2 min-h-12 px-4 py-3 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          <X className="w-5 h-5" />
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isProcessing || !croppedAreaPixels}
          className="flex-1 flex items-center justify-center gap-2 min-h-12 px-4 py-3 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          <Check className="w-5 h-5" />
          {isProcessing ? 'Processing...' : 'Confirm'}
        </button>
      </div>
    </div>
  )
}
