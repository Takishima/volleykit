/**
 * OCR Factory
 *
 * Factory for creating OCR engine instances.
 * Currently supports Tesseract.js only.
 */

import { TesseractOCR } from './TesseractOCR.js';

/**
 * @typedef {'electronic' | 'handwritten'} SheetType
 */

/**
 * @typedef {import('./TesseractOCR.js').OnProgressCallback} OnProgressCallback
 */

/**
 * Factory for creating OCR engine instances
 */
export const OCRFactory = {
  /**
   * Create an OCR engine instance
   * @param {SheetType} sheetType - The type of scoresheet (electronic/handwritten)
   * @param {OnProgressCallback} [onProgress] - Optional progress callback
   * @returns {TesseractOCR} The OCR engine instance
   */
  create(sheetType, onProgress) {
    return new TesseractOCR(sheetType, onProgress);
  },
};

// Re-export types and classes for convenience
export { TesseractOCR } from './TesseractOCR.js';
