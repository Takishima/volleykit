/**
 * OCR Factory
 *
 * Factory for creating OCR engine instances.
 * Currently supports Tesseract.js, with TrOCR support planned for handwritten text.
 */

import { TesseractOCR } from './TesseractOCR.js';

/**
 * @typedef {'electronic' | 'handwritten'} OCREngineType
 */

/**
 * @typedef {import('./TesseractOCR.js').OnProgressCallback} OnProgressCallback
 */

/**
 * Factory for creating OCR engine instances
 */
export const OCRFactory = {
  /**
   * Create an OCR engine instance based on the sheet type
   * @param {OCREngineType} type - The type of OCR engine to create
   * @param {OnProgressCallback} [onProgress] - Optional progress callback
   * @returns {TesseractOCR} The OCR engine instance
   */
  create(type, onProgress) {
    // For now, both types use TesseractOCR
    // In the future, 'handwritten' could use TrOCR for better handwriting recognition
    switch (type) {
      case 'electronic':
      case 'handwritten':
      default:
        return new TesseractOCR(onProgress);
    }
  },
};

// Re-export types and classes for convenience
export { TesseractOCR } from './TesseractOCR.js';
