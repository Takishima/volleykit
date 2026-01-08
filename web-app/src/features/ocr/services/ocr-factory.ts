/**
 * OCR Factory
 *
 * Factory for creating OCR engine instances.
 * Uses Mistral OCR via Cloudflare Worker proxy for production,
 * with StubOCR available as fallback for local development.
 */

import type { OCREngine, OnProgressCallback } from '../types';
import { MistralOCR } from './mistral-ocr';
import { StubOCR } from './stub-ocr';

// =============================================================================
// Configuration
// =============================================================================

/** Timeout for health check when determining OCR proxy availability */
const HEALTH_CHECK_TIMEOUT_MS = 3000;

/** OCR proxy endpoint - uses environment variable or default */
const OCR_ENDPOINT =
  (import.meta.env.VITE_OCR_ENDPOINT as string | undefined) ??
  'https://volleykit-proxy.takishima.workers.dev/ocr';

// =============================================================================
// Health Check
// =============================================================================

/**
 * Check if the OCR proxy is available by testing the health endpoint
 */
async function isOCRProxyAvailable(): Promise<boolean> {
  try {
    const healthUrl = OCR_ENDPOINT.replace('/ocr', '/health');
    const response = await fetch(healthUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS),
    });
    return response.ok;
  } catch {
    return false;
  }
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Factory for creating OCR engine instances
 */
export const OCRFactory = {
  /**
   * Create an OCR engine instance.
   * Uses Mistral OCR by default.
   *
   * @param onProgress - Optional progress callback
   * @returns OCR engine instance
   */
  create(onProgress?: OnProgressCallback): OCREngine {
    return new MistralOCR(onProgress, OCR_ENDPOINT);
  },

  /**
   * Create an OCR engine instance, checking availability first.
   * Falls back to StubOCR if the OCR proxy is not available.
   *
   * @param onProgress - Optional progress callback
   * @returns OCR engine instance
   */
  async createWithFallback(onProgress?: OnProgressCallback): Promise<OCREngine> {
    const isAvailable = await isOCRProxyAvailable();

    if (isAvailable) {
      return new MistralOCR(onProgress, OCR_ENDPOINT);
    }

    console.warn('OCR proxy not available, falling back to stub implementation');
    return new StubOCR(onProgress);
  },

  /**
   * Create a stub OCR engine for testing.
   *
   * @param onProgress - Optional progress callback
   * @returns Stub OCR engine instance
   */
  createStub(onProgress?: OnProgressCallback): OCREngine {
    return new StubOCR(onProgress);
  },
};
