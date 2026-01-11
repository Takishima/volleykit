import { useRef, useState, useCallback, useEffect } from 'react'

import { Camera, Image as ImageIcon, AlertCircle } from 'lucide-react'

import { GUIDE_CONFIG } from '@/constants/guide-config'
import { useAppStore } from '@/stores/appStore'

import { ScoresheetGuide } from './ScoresheetGuide'

import type { SheetType, ManuscriptCaptureMode } from '@/stores/appStore'

const MAX_FILE_SIZE_MB = 10
const BYTES_PER_KB = 1024
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * BYTES_PER_KB * BYTES_PER_KB
const ACCEPTED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const ACCEPTED_IMAGE_EXTENSIONS = '.jpg,.jpeg,.png,.webp'

/** Video constraints for camera preview */
const VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  facingMode: 'environment',
  width: { ideal: 1920 },
  height: { ideal: 1080 },
}

/** JPEG quality for captured photos */
const JPEG_QUALITY = 0.92

type CaptureStep = 'select' | 'camera'

/**
 * Calculates the crop area corresponding to the guide overlay.
 */
function calculateGuideCropArea(
  videoWidth: number,
  videoHeight: number,
  containerWidth: number,
  containerHeight: number,
  sheetType: SheetType,
  captureMode: ManuscriptCaptureMode | null
) {
  const mode = captureMode ?? 'default'
  const config = GUIDE_CONFIG[sheetType][mode]

  // Calculate object-cover scaling
  const videoAspect = videoWidth / videoHeight
  const containerAspect = containerWidth / containerHeight

  let visibleWidth: number
  let visibleHeight: number
  let offsetX: number
  let offsetY: number

  if (videoAspect > containerAspect) {
    visibleHeight = videoHeight
    visibleWidth = videoHeight * containerAspect
    offsetX = (videoWidth - visibleWidth) / 2
    offsetY = 0
  } else {
    visibleWidth = videoWidth
    visibleHeight = videoWidth / containerAspect
    offsetX = 0
    offsetY = (videoHeight - visibleHeight) / 2
  }

  // Calculate guide rectangle in visible area coordinates
  const guideWidthInVisible = visibleWidth * config.widthPercent
  const guideHeightInVisible = guideWidthInVisible / config.aspectRatio

  // Guide is centered in the visible area
  const guideXInVisible = (visibleWidth - guideWidthInVisible) / 2
  const guideYInVisible = (visibleHeight - guideHeightInVisible) / 2

  return {
    x: Math.round(offsetX + guideXInVisible),
    y: Math.round(offsetY + guideYInVisible),
    width: Math.round(guideWidthInVisible),
    height: Math.round(guideHeightInVisible),
  }
}

/**
 * Crops a canvas to the specified area.
 */
function cropCanvasToArea(
  sourceCanvas: HTMLCanvasElement,
  cropArea: { x: number; y: number; width: number; height: number },
  quality: number
): Promise<Blob> {
  const croppedCanvas = document.createElement('canvas')
  croppedCanvas.width = cropArea.width
  croppedCanvas.height = cropArea.height

  const ctx = croppedCanvas.getContext('2d')
  if (!ctx) {
    return Promise.reject(new Error('Could not get canvas context'))
  }

  ctx.drawImage(
    sourceCanvas,
    cropArea.x,
    cropArea.y,
    cropArea.width,
    cropArea.height,
    0,
    0,
    cropArea.width,
    cropArea.height
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

export function CaptureScreen() {
  const sheetType = useAppStore((s) => s.sheetType)
  const captureMode = useAppStore((s) => s.captureMode)
  const setCapturedImage = useAppStore((s) => s.setCapturedImage)
  const goToCrop = useAppStore((s) => s.goToCrop)
  const goBack = useAppStore((s) => s.goBack)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [step, setStep] = useState<CaptureStep>('select')
  const [error, setError] = useState<string | null>(null)
  const [cameraError, setCameraError] = useState(false)

  // Clean up camera stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [stopCamera])

  // Connect stream to video element when camera step is active
  useEffect(() => {
    if (step === 'camera' && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch(console.error)
    }
  }, [step])

  // Start camera preview
  const startCamera = useCallback(async () => {
    setError(null)
    setCameraError(false)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: VIDEO_CONSTRAINTS,
        audio: false,
      })

      streamRef.current = stream
      setStep('camera')
    } catch (err) {
      console.error('Camera access error:', err)
      setCameraError(true)
      setError('Camera not available. Please select an image instead.')
    }
  }, [])

  // Capture photo from camera
  const capturePhoto = useCallback(async () => {
    const video = videoRef.current
    if (!video || !sheetType) return

    const fullCanvas = document.createElement('canvas')
    fullCanvas.width = video.videoWidth
    fullCanvas.height = video.videoHeight

    const ctx = fullCanvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(video, 0, 0, fullCanvas.width, fullCanvas.height)

    const cropArea = calculateGuideCropArea(
      video.videoWidth,
      video.videoHeight,
      video.clientWidth,
      video.clientHeight,
      sheetType,
      captureMode
    )

    try {
      const croppedBlob = await cropCanvasToArea(fullCanvas, cropArea, JPEG_QUALITY)
      stopCamera()
      setCapturedImage(croppedBlob)
      goToCrop()
    } catch (err) {
      console.error('Failed to crop captured image:', err)
      // Fallback: use full image if cropping fails
      fullCanvas.toBlob(
        (blob) => {
          if (blob) {
            stopCamera()
            setCapturedImage(blob)
            goToCrop()
          }
        },
        'image/jpeg',
        JPEG_QUALITY
      )
    }
  }, [stopCamera, sheetType, captureMode, setCapturedImage, goToCrop])

  // Handle file selection
  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      event.target.value = ''
      setError(null)

      if (!ACCEPTED_IMAGE_MIME_TYPES.includes(file.type)) {
        setError('Invalid file type. Please select a JPG, PNG, or WebP image.')
        return
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        setError(`Image too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.`)
        return
      }

      setCapturedImage(file)
      goToCrop()
    },
    [setCapturedImage, goToCrop]
  )

  const handleSelectImage = useCallback(() => {
    setError(null)
    fileInputRef.current?.click()
  }, [])

  const handleCameraCancel = useCallback(() => {
    stopCamera()
    setStep('select')
  }, [stopCamera])

  // Camera preview mode
  if (step === 'camera' && sheetType) {
    return (
      <div className="flex-1 flex flex-col bg-gray-900">
        {/* Video preview with guide overlay */}
        <div className="relative flex-1 min-h-0 overflow-hidden">
          <video
            ref={videoRef}
            className="w-full h-full object-cover bg-gray-800"
            autoPlay
            playsInline
            muted
          />
          <ScoresheetGuide sheetType={sheetType} captureMode={captureMode} />
        </div>

        {/* Camera controls */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 bg-gray-900">
          <button
            type="button"
            onClick={handleCameraCancel}
            className="px-4 py-2 text-white bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>

          {/* Capture button */}
          <button
            type="button"
            onClick={capturePhoto}
            className="w-16 h-16 rounded-full bg-white hover:bg-gray-100 flex items-center justify-center transition-colors"
            aria-label="Take photo"
          >
            <div className="w-12 h-12 rounded-full bg-red-500" />
          </button>

          {/* Spacer */}
          <div className="w-20" />
        </div>
      </div>
    )
  }

  // Selection mode
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900">Capture Scoresheet</h2>
          <p className="mt-2 text-slate-600">
            Take a photo or select an image of the scoresheet
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="space-y-3">
          {/* Take Photo button */}
          <button
            type="button"
            onClick={cameraError ? handleSelectImage : startCamera}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-medium"
          >
            <Camera className="w-5 h-5" />
            Take Photo
          </button>

          {/* Select Image button */}
          <button
            type="button"
            onClick={handleSelectImage}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors font-medium"
          >
            <ImageIcon className="w-5 h-5" />
            Select Image
          </button>

          {/* Back button */}
          <button
            type="button"
            onClick={goBack}
            className="w-full px-4 py-3 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium"
          >
            Back
          </button>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_IMAGE_EXTENSIONS}
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </div>
  )
}
