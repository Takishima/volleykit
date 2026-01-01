/**
 * OCR Factory
 *
 * Factory for creating OCR engine instances.
 * Uses PaddleOCR (PP-OCRv3) for high-accuracy text recognition.
 */

import { PaddleOCR } from './PaddleOCR.js';

/**
 * @typedef {'electronic' | 'handwritten'} OCREngineType
 */

/**
 * @typedef {import('./PaddleOCR.js').OnProgressCallback} OnProgressCallback
 */

/**
 * Factory for creating OCR engine instances
 */
export const OCRFactory = {
  /**
   * Create an OCR engine instance based on the sheet type
   * @param {OCREngineType} type - The type of OCR engine to create
   * @param {OnProgressCallback} [onProgress] - Optional progress callback
   * @returns {PaddleOCR} The OCR engine instance
   */
  create(type, onProgress) {
    // Both types use PaddleOCR with Latin recognition model
    // The Latin model supports German, French, Italian and other European languages
    switch (type) {
      case 'electronic':
      case 'handwritten':
      default:
        return new PaddleOCR(onProgress);
    }
  },
};

// Re-export types and classes for convenience
export { PaddleOCR } from './PaddleOCR.js';
