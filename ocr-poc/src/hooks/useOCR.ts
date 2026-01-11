/**
 * useOCR Hook
 *
 * Provides OCR processing functionality using the OCR factory.
 * Handles initialization, processing, and cleanup of OCR engines.
 */

import { useRef, useCallback } from 'react'

// @ts-expect-error - JS module without types
import { OCRFactory } from '@/services/ocr/index.js'

import type { OCRResult, OCRProgress, OCREngine } from '@/services/ocr/types'

interface UseOCROptions {
  onProgress?: (progress: OCRProgress) => void
  onComplete?: (result: OCRResult) => void
  onError?: (error: Error) => void
}

interface UseOCRReturn {
  processImage: (imageBlob: Blob) => Promise<OCRResult | null>
  cancel: () => void
}

/**
 * Hook for OCR processing with progress tracking.
 */
export function useOCR(options: UseOCROptions = {}): UseOCRReturn {
  const { onProgress, onComplete, onError } = options
  const engineRef = useRef<OCREngine | null>(null)
  const processingRef = useRef(false)

  const cancel = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.terminate()
      engineRef.current = null
    }
    processingRef.current = false
  }, [])

  const processImage = useCallback(
    async (imageBlob: Blob): Promise<OCRResult | null> => {
      // Prevent concurrent processing
      if (processingRef.current) {
        console.warn('OCR processing already in progress')
        return null
      }

      processingRef.current = true
      const startTime = performance.now()

      try {
        // Create OCR engine with progress callback
        const progressHandler = (progress: OCRProgress) => {
          onProgress?.(progress)
        }

        // Use createWithFallback to check proxy availability
        onProgress?.({ status: 'Checking OCR service...', progress: 0 })
        const engine: OCREngine = await OCRFactory.createWithFallback('electronic', progressHandler)
        engineRef.current = engine

        // Initialize engine
        await engine.initialize()

        // Process image
        const result = await engine.recognize(imageBlob)

        // Add processing time
        const endTime = performance.now()
        const resultWithTime: OCRResult = {
          ...result,
          processingTime: endTime - startTime,
          confidence: calculateOverallConfidence(result),
        }

        onComplete?.(resultWithTime)
        return resultWithTime
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error))
        onError?.(err)
        return null
      } finally {
        // Cleanup
        if (engineRef.current) {
          await engineRef.current.terminate()
          engineRef.current = null
        }
        processingRef.current = false
      }
    },
    [onProgress, onComplete, onError]
  )

  return { processImage, cancel }
}

/**
 * Calculate overall confidence from OCR result lines.
 */
function calculateOverallConfidence(result: OCRResult): number {
  if (result.lines.length === 0) return 0

  const totalConfidence = result.lines.reduce((sum, line) => sum + line.confidence, 0)
  return totalConfidence / result.lines.length
}
