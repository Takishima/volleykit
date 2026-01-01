/**
 * OCR Factory
 *
 * Factory for creating OCR engine instances.
 * Supports Tesseract.js and PaddleOCR engines.
 */

import { TesseractOCR } from './TesseractOCR.js';
import { PaddleOCR } from './PaddleOCR.js';

/**
 * @typedef {'electronic' | 'handwritten'} SheetType
 */

/**
 * @typedef {'tesseract' | 'paddle'} OCREngine
 */

/**
 * @typedef {import('./TesseractOCR.js').OnProgressCallback} OnProgressCallback
 */

/**
 * Available OCR engines
 */
export const OCR_ENGINES = {
  TESSERACT: 'tesseract',
  PADDLE: 'paddle',
};

/**
 * Factory for creating OCR engine instances
 */
export const OCRFactory = {
  /**
   * Create an OCR engine instance
   * @param {SheetType} sheetType - The type of scoresheet (electronic/handwritten)
   * @param {OnProgressCallback} [onProgress] - Optional progress callback
   * @param {OCREngine} [engine='tesseract'] - OCR engine to use
   * @returns {TesseractOCR | PaddleOCR} The OCR engine instance
   */
  create(sheetType, onProgress, engine = 'tesseract') {
    switch (engine) {
      case 'paddle':
        return new PaddleOCR(sheetType, onProgress);
      case 'tesseract':
      default:
        return new TesseractOCR(sheetType, onProgress);
    }
  },
};

// Re-export types and classes for convenience
export { TesseractOCR } from './TesseractOCR.js';
export { PaddleOCR } from './PaddleOCR.js';
