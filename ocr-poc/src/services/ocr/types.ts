/**
 * OCR service types
 */

/** Bounding box for a word */
export interface BoundingBox {
  x0: number
  y0: number
  x1: number
  y1: number
}

/** Individual word detected by OCR */
export interface OCRWord {
  text: string
  confidence: number
  bbox: BoundingBox
}

/** Line of text detected by OCR */
export interface OCRLine {
  text: string
  confidence: number
  words: OCRWord[]
}

/** Full OCR result */
export interface OCRResult {
  /** Full text content */
  fullText: string
  /** Lines of text */
  lines: OCRLine[]
  /** Individual words */
  words: OCRWord[]
  /** Overall confidence (0-100) */
  confidence?: number
  /** Processing time in ms */
  processingTime?: number
}

/** Progress update from OCR engine */
export interface OCRProgress {
  status: string
  progress: number
}

/** Progress callback type */
export type OnProgressCallback = (progress: OCRProgress) => void

/** OCR engine interface */
export interface OCREngine {
  /** Initialize the engine */
  initialize(): Promise<void>
  /** Process an image and return OCR results */
  recognize(imageBlob: Blob): Promise<OCRResult>
  /** Cleanup resources */
  terminate(): Promise<void>
}

/** OCR engine type */
export type OCREngineType = 'electronic' | 'handwritten'
