/**
 * ProcessingScreen Component
 *
 * Shows OCR processing progress with a spinner and status messages.
 * Integrates with the OCR service to process the captured/cropped image.
 */

import { useEffect, useRef } from 'react'

import { Loader2, AlertCircle } from 'lucide-react'

import { useOCR } from '@/hooks/useOCR'
import { useAppStore } from '@/stores/appStore'

export function ProcessingScreen() {
  const croppedImage = useAppStore((s) => s.croppedImage)
  const capturedImage = useAppStore((s) => s.capturedImage)
  const progress = useAppStore((s) => s.progress)
  const progressStatus = useAppStore((s) => s.progressStatus)
  const error = useAppStore((s) => s.error)
  const setProgress = useAppStore((s) => s.setProgress)
  const setOcrResult = useAppStore((s) => s.setOcrResult)
  const setError = useAppStore((s) => s.setError)
  const goToResults = useAppStore((s) => s.goToResults)
  const goBack = useAppStore((s) => s.goBack)

  // Use cropped image if available, otherwise use captured image
  const imageToProcess = croppedImage ?? capturedImage

  // Track if we've started processing to prevent double execution
  const hasStartedRef = useRef(false)

  const { processImage, cancel } = useOCR({
    onProgress: (ocrProgress) => {
      setProgress(ocrProgress.progress, ocrProgress.status)
    },
    onComplete: (result) => {
      setOcrResult(result)
      goToResults()
    },
    onError: (err) => {
      setError(err.message)
    },
  })

  // Start OCR when component mounts
  useEffect(() => {
    if (hasStartedRef.current) {
      return
    }
    hasStartedRef.current = true

    if (!imageToProcess) {
      setError('No image to process')
      return
    }

    processImage(imageToProcess)

    // Cleanup: cancel OCR if component unmounts
    return () => {
      cancel()
    }
  }, [imageToProcess, processImage, cancel, setError])

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full space-y-6 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900">Processing Failed</h2>
            <p className="mt-2 text-slate-600">{error}</p>
          </div>

          <button
            type="button"
            onClick={goBack}
            className="w-full px-4 py-3 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full space-y-6 text-center">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" />

        <div>
          <h2 className="text-xl font-bold text-slate-900">Processing Scoresheet</h2>
          <p className="mt-2 text-slate-600">{progressStatus || 'Please wait...'}</p>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="text-sm text-slate-500">{progress}% complete</p>
      </div>
    </div>
  )
}
