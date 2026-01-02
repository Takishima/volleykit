/**
 * OCR Factory
 *
 * Factory for creating OCR engine instances.
 * Currently uses a stub implementation while external OCR services
 * (Google Vision, AWS Textract, PaddleOCR) are being integrated.
 */

import { StubOCR } from './StubOCR.js';

/**
 * @typedef {'electronic' | 'handwritten'} OCREngineType
 */

/**
 * @typedef {import('./StubOCR.js').OnProgressCallback} OnProgressCallback
 */

/**
 * Factory for creating OCR engine instances
 */
export const OCRFactory = {
  /**
   * Create an OCR engine instance based on the sheet type
   * @param {OCREngineType} type - The type of OCR engine to create
   * @param {OnProgressCallback} [onProgress] - Optional progress callback
   * @returns {StubOCR} The OCR engine instance
   */
  create(type, onProgress) {
    // TODO: Integrate external OCR services (Google Vision, AWS Textract, PaddleOCR)
    // For now, all types use the stub implementation
    switch (type) {
      case 'electronic':
      case 'handwritten':
      default:
        return new StubOCR(onProgress);
    }
  },
};

// Re-export types and classes for convenience
export { StubOCR } from './StubOCR.js';
