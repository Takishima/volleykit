/**
 * Mistral OCR Service
 *
 * OCR service using Mistral's OCR API via Cloudflare Worker proxy.
 * Provides high-quality text extraction from images and documents.
 *
 * @see https://docs.mistral.ai/capabilities/document_ai/basic_ocr
 */

// Configuration constants
const DEFAULT_OCR_ENDPOINT = 'https://volleykit-proxy.ngn-damien.workers.dev/ocr';

// Mistral OCR doesn't provide per-word confidence scores, so we use a high default
// since the model is generally very accurate
const DEFAULT_CONFIDENCE_SCORE = 95;

// Approximate bounding box dimensions for word positioning
// Mistral doesn't provide coordinates, so these are estimates for UI compatibility
const ESTIMATED_WORD_SPACING_PX = 50;
const ESTIMATED_CHAR_WIDTH_PX = 8;
const ESTIMATED_LINE_HEIGHT_PX = 20;

/**
 * @typedef {Object} OCRWord
 * @property {string} text - The recognized word
 * @property {number} confidence - Confidence score (0-100)
 * @property {Object} bbox - Bounding box { x0, y0, x1, y1 }
 */

/**
 * @typedef {Object} OCRLine
 * @property {string} text - The full line text
 * @property {number} confidence - Average confidence for the line
 * @property {OCRWord[]} words - Individual words in the line
 */

/**
 * @typedef {Object} OCRResult
 * @property {string} fullText - Complete extracted text
 * @property {OCRLine[]} lines - Lines with words and confidence
 * @property {OCRWord[]} words - All words with confidence scores
 */

/**
 * @typedef {Object} OCRProgress
 * @property {string} status - Human-readable status message
 * @property {number} progress - Progress percentage (0-100)
 */

/**
 * @callback OnProgressCallback
 * @param {OCRProgress} progress
 */

/**
 * @typedef {Object} MistralOCRPage
 * @property {number} index - Page index
 * @property {string} markdown - Extracted text in markdown format
 * @property {Object} dimensions - Page dimensions
 */

/**
 * @typedef {Object} MistralOCRResponse
 * @property {MistralOCRPage[]} pages - Array of processed pages
 * @property {string} model - Model used for OCR
 * @property {Object} usage_info - Usage information
 */

export class MistralOCR {
  /** @type {OnProgressCallback | undefined} */
  #onProgress;

  /** @type {boolean} */
  #initialized = false;

  /** @type {string} */
  #endpoint;

  /** @type {AbortController | null} */
  #abortController = null;

  /**
   * @param {OnProgressCallback} [onProgress] - Callback for progress updates
   * @param {string} [endpoint] - OCR proxy endpoint URL
   */
  constructor(onProgress, endpoint = DEFAULT_OCR_ENDPOINT) {
    this.#onProgress = onProgress;
    this.#endpoint = endpoint;
  }

  /**
   * Report progress to callback
   * @param {string} status
   * @param {number} progress - Progress 0-100
   */
  #reportProgress(status, progress) {
    if (this.#onProgress) {
      this.#onProgress({ status, progress });
    }
  }

  /**
   * Initialize the OCR service
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.#initialized) {
      return;
    }

    this.#reportProgress('Initializing Mistral OCR...', 0);

    // Verify the OCR endpoint is reachable
    try {
      const response = await fetch(this.#endpoint.replace('/ocr', '/health'), {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('OCR service health check failed');
      }

      this.#reportProgress('Mistral OCR ready', 10);
      this.#initialized = true;
    } catch (error) {
      console.warn('OCR service health check failed, will attempt OCR anyway:', error);
      this.#reportProgress('Mistral OCR ready (health check skipped)', 10);
      this.#initialized = true;
    }
  }

  /**
   * Convert Mistral OCR response to our internal format
   * @param {MistralOCRResponse} mistralResponse - Response from Mistral API
   * @returns {OCRResult}
   */
  #convertResponse(mistralResponse) {
    // Combine all pages' markdown into full text
    const fullText = mistralResponse.pages
      .map((page) => page.markdown)
      .join('\n\n--- Page Break ---\n\n')
      .trim();

    // Parse markdown into lines
    // Mistral returns markdown, so we split by newlines
    const rawLines = fullText.split('\n');

    /** @type {OCRLine[]} */
    const lines = rawLines.map((lineText) => {
      // Parse words from the line
      const wordTexts = lineText.split(/\s+/).filter((w) => w.length > 0);

      /** @type {OCRWord[]} */
      const words = wordTexts.map((text, idx) => ({
        text,
        confidence: DEFAULT_CONFIDENCE_SCORE,
        bbox: {
          x0: idx * ESTIMATED_WORD_SPACING_PX,
          y0: 0,
          x1: idx * ESTIMATED_WORD_SPACING_PX + text.length * ESTIMATED_CHAR_WIDTH_PX,
          y1: ESTIMATED_LINE_HEIGHT_PX,
        },
      }));

      return {
        text: lineText,
        confidence: DEFAULT_CONFIDENCE_SCORE,
        words,
      };
    });

    // Flatten all words
    const words = lines.flatMap((line) => line.words);

    return {
      fullText,
      lines,
      words,
    };
  }

  /**
   * Perform OCR on an image
   * @param {Blob} imageBlob - The image to process
   * @returns {Promise<OCRResult>}
   */
  async recognize(imageBlob) {
    if (!this.#initialized) {
      throw new Error('MistralOCR not initialized. Call initialize() first.');
    }

    this.#reportProgress('Uploading image...', 20);

    // Create abort controller for cancellation
    this.#abortController = new AbortController();

    try {
      // Prepare form data
      const formData = new FormData();
      formData.append('image', imageBlob, 'scoresheet.jpg');

      this.#reportProgress('Processing with Mistral OCR...', 40);

      // Send to OCR proxy
      const response = await fetch(this.#endpoint, {
        method: 'POST',
        body: formData,
        signal: this.#abortController.signal,
      });

      this.#reportProgress('Receiving results...', 80);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `OCR request failed: ${response.status}`);
      }

      const mistralResponse = /** @type {MistralOCRResponse} */ (await response.json());

      this.#reportProgress('Processing complete', 100);

      // Convert Mistral response to our format
      return this.#convertResponse(mistralResponse);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('OCR cancelled');
      }
      throw error;
    } finally {
      this.#abortController = null;
    }
  }

  /**
   * Terminate the OCR service and cancel any pending requests
   * @returns {Promise<void>}
   */
  async terminate() {
    // Cancel any pending request
    if (this.#abortController) {
      this.#abortController.abort();
      this.#abortController = null;
    }
    this.#initialized = false;
  }
}
