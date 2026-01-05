/**
 * OCR Factory
 *
 * Factory for creating OCR engine instances.
 * Uses Mistral OCR via Cloudflare Worker proxy for production,
 * with StubOCR available for local development without API access.
 */

import { MistralOCR } from './MistralOCR.js';
import { StubOCR } from './StubOCR.js';

/**
 * @typedef {'electronic' | 'handwritten'} OCREngineType
 */

/**
 * @typedef {import('./StubOCR.js').OnProgressCallback} OnProgressCallback
 */

/**
 * @typedef {import('./MistralOCR.js').MistralOCR | import('./StubOCR.js').StubOCR} OCREngine
 */

/**
 * Check if the OCR proxy is available by testing the health endpoint.
 * This is used to determine whether to use Mistral or fall back to stub.
 *
 * @param {string} endpoint - The OCR proxy base URL
 * @returns {Promise<boolean>} True if the proxy is available
 */
async function isOCRProxyAvailable(endpoint) {
  try {
    const response = await fetch(endpoint.replace('/ocr', '/health'), {
      method: 'GET',
      signal: AbortSignal.timeout(3000), // 3 second timeout
    });
    return response.ok;
  } catch {
    return false;
  }
}

// OCR proxy endpoint - uses environment variable or default
const OCR_ENDPOINT =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_OCR_ENDPOINT
    ? import.meta.env.VITE_OCR_ENDPOINT
    : 'https://volleykit-proxy.takishima.workers.dev/ocr';

/**
 * Factory for creating OCR engine instances
 */
export const OCRFactory = {
  /**
   * Create an OCR engine instance based on the sheet type
   * Uses Mistral OCR for production, falls back to stub if unavailable.
   *
   * @param {OCREngineType} _type - The type of OCR engine to create (currently unused, both types use same engine)
   * @param {OnProgressCallback} [onProgress] - Optional progress callback
   * @returns {OCREngine} The OCR engine instance
   */
  create(_type, onProgress) {
    // Use Mistral OCR - it handles both electronic and handwritten text well
    return new MistralOCR(onProgress, OCR_ENDPOINT);
  },

  /**
   * Create an OCR engine instance, checking availability first.
   * Falls back to StubOCR if the OCR proxy is not available.
   *
   * @param {OCREngineType} _type - The type of OCR engine to create
   * @param {OnProgressCallback} [onProgress] - Optional progress callback
   * @returns {Promise<OCREngine>} The OCR engine instance
   */
  async createWithFallback(_type, onProgress) {
    const isAvailable = await isOCRProxyAvailable(OCR_ENDPOINT);

    if (isAvailable) {
      return new MistralOCR(onProgress, OCR_ENDPOINT);
    }

    console.warn('OCR proxy not available, falling back to stub implementation');
    return new StubOCR(onProgress);
  },
};

// Re-export types and classes for convenience
export { MistralOCR } from './MistralOCR.js';
export { StubOCR } from './StubOCR.js';
