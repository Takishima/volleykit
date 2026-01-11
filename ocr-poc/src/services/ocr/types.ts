/**
 * OCR service types
 */

/** Individual word detected by OCR */
export interface OCRWord {
  text: string
  confidence: number
  boundingBox?: {
    x: number
    y: number
    width: number
    height: number
  }
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
  /** Overall confidence (0-1) */
  confidence: number
  /** Processing time in ms */
  processingTime?: number
}

/** OCR engine interface */
export interface OCREngine {
  /** Process an image and return OCR results */
  recognize(imageBlob: Blob, signal?: AbortSignal): Promise<OCRResult>
  /** Engine name for display */
  readonly name: string
}
