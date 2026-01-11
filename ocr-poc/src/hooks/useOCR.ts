/**
 * useOCR Hook
 *
 * Provides OCR processing functionality using the shared OCR services from web-app.
 * Handles initialization, processing, and cleanup of OCR engines.
 */

import { useRef, useCallback } from 'react'

import { OCRFactory } from '@/features/ocr/services/ocr-factory'

import type { OCRResult, OCRProgress, OCREngine } from '@/features/ocr/types'

/** Extended OCR result with PoC-specific metadata */
export interface OCRResultWithMetadata extends OCRResult {
  /** Overall confidence score (0-100) */
  confidence: number
  /** Processing time in milliseconds */
  processingTime: number
}

interface UseOCROptions {
  onProgress?: (progress: OCRProgress) => void
  onComplete?: (result: OCRResultWithMetadata) => void
  onError?: (error: Error) => void
}

interface UseOCRReturn {
  processImage: (imageBlob: Blob) => Promise<OCRResultWithMetadata | null>
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
    async (imageBlob: Blob): Promise<OCRResultWithMetadata | null> => {
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
        const engine = await OCRFactory.createWithFallback(progressHandler)
        engineRef.current = engine

        // Initialize engine
        await engine.initialize()

        // Process image
        const result = await engine.recognize(imageBlob)

        // Add processing metadata
        const endTime = performance.now()
        const resultWithMetadata: OCRResultWithMetadata = {
          ...result,
          processingTime: endTime - startTime,
          confidence: calculateOverallConfidence(result),
        }

        onComplete?.(resultWithMetadata)
        return resultWithMetadata
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
  if (result.lines.length === 0) {return 0}

  const totalConfidence = result.lines.reduce((sum, line) => sum + line.confidence, 0)
  return totalConfidence / result.lines.length
}
