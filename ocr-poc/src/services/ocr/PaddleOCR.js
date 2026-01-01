/**
 * PaddleOCR Service
 *
 * OCR engine using PaddlePaddle's PP-OCRv3 models via @paddle-js-models/ocr.
 * Provides browser-based OCR using WebGL acceleration.
 */

/**
 * @typedef {'electronic' | 'handwritten'} SheetType
 * @typedef {(progress: {status: string, progress: number}) => void} OnProgressCallback
 */

/** Initialization timeout in milliseconds */
const INIT_TIMEOUT_MS = 60000;

/**
 * Create a promise that rejects after a timeout
 * @param {number} ms - Timeout in milliseconds
 * @param {string} message - Error message
 * @returns {Promise<never>}
 */
function timeout(ms, message) {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), ms);
  });
}

/**
 * PaddleOCR engine wrapper
 */
export class PaddleOCR {
  /** @type {SheetType} */
  #sheetType;

  /** @type {OnProgressCallback | undefined} */
  #onProgress;

  /** @type {boolean} */
  #initialized = false;

  /** @type {any} */
  #ocr = null;

  /**
   * Create a PaddleOCR instance
   * @param {SheetType} sheetType - Type of scoresheet (electronic/handwritten)
   * @param {OnProgressCallback} [onProgress] - Progress callback
   */
  constructor(sheetType, onProgress) {
    this.#sheetType = sheetType;
    this.#onProgress = onProgress;
  }

  /**
   * Initialize the PaddleOCR engine
   */
  async initialize() {
    if (this.#initialized) {
      return;
    }

    this.#reportProgress('Initializing PaddleOCR...', 0);

    try {
      console.log('[PaddleOCR] Starting dynamic import...');

      // Dynamic import to avoid loading unless needed
      const paddleOcr = await import('@paddle-js-models/ocr');

      console.log('[PaddleOCR] Import successful, starting init...');
      this.#reportProgress('Loading OCR models (this may take a minute)...', 0.2);

      // Initialize with timeout
      await Promise.race([
        paddleOcr.init(),
        timeout(INIT_TIMEOUT_MS, `PaddleOCR initialization timed out after ${INIT_TIMEOUT_MS / 1000}s`),
      ]);

      console.log('[PaddleOCR] Init complete');
      this.#ocr = paddleOcr;
      this.#initialized = true;

      this.#reportProgress('PaddleOCR ready', 1);
    } catch (error) {
      console.error('[PaddleOCR] Failed to initialize:', error);
      throw new Error(`PaddleOCR initialization failed: ${error.message}`);
    }
  }

  /**
   * Recognize text in an image
   * @param {Blob} imageBlob - Image to process
   * @returns {Promise<{fullText: string, lines: string[], words: Array<{text: string, confidence: number}>}>}
   */
  async recognize(imageBlob) {
    if (!this.#initialized || !this.#ocr) {
      throw new Error('PaddleOCR not initialized. Call initialize() first.');
    }

    this.#reportProgress('Processing image...', 0.1);

    // Convert blob to HTMLImageElement
    const img = await this.#blobToImage(imageBlob);

    this.#reportProgress('Running OCR...', 0.3);

    // Run OCR recognition
    const result = await this.#ocr.recognize(img);

    console.log('[PaddleOCR] Raw result:', result);
    this.#reportProgress('Processing results...', 0.9);

    // Transform result to match our expected format
    const transformedResult = this.#transformResult(result);

    this.#reportProgress('Done', 1);

    return transformedResult;
  }

  /**
   * Convert a Blob to an HTMLImageElement
   * @param {Blob} blob
   * @returns {Promise<HTMLImageElement>}
   */
  async #blobToImage(blob) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(blob);

      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };

      img.src = url;
    });
  }

  /**
   * Transform PaddleOCR result to our expected format
   * @param {any} result - Raw PaddleOCR result
   * @returns {{fullText: string, lines: string[], words: Array<{text: string, confidence: number}>}}
   */
  #transformResult(result) {
    // PaddleOCR returns { text: string[], points: number[][][] }
    const words = [];
    const lines = [];
    let fullText = '';

    if (result && result.text && Array.isArray(result.text)) {
      for (const text of result.text) {
        if (text) {
          words.push({
            text: text,
            confidence: 0.9,
          });
          lines.push(text);
          fullText += text + '\n';
        }
      }
    } else if (Array.isArray(result)) {
      for (const item of result) {
        const text = typeof item === 'string' ? item : item?.text;
        if (text) {
          words.push({
            text: text,
            confidence: item?.confidence || 0.9,
          });
          lines.push(text);
          fullText += text + '\n';
        }
      }
    }

    return {
      fullText: fullText.trim(),
      lines,
      words,
    };
  }

  /**
   * Report progress to callback
   * @param {string} status
   * @param {number} progress
   */
  #reportProgress(status, progress) {
    this.#onProgress?.({ status, progress });
  }

  /**
   * Terminate the OCR engine and clean up resources
   */
  async terminate() {
    // PaddleOCR doesn't have an explicit cleanup method
    this.#ocr = null;
    this.#initialized = false;
  }
}
