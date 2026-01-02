/**
 * PaddleOCR Service
 *
 * Wrapper around @arkntools/paddlejs-ocr for OCR processing.
 * Uses WebGL-based Paddle.js for lightweight browser inference.
 * Supports Chinese, English, and numbers recognition.
 */

// Note: @arkntools/paddlejs-ocr is dynamically imported in initialize() to avoid
// blocking app startup if the library fails to load

/** Default confidence score (library doesn't provide confidence scores) */
const DEFAULT_CONFIDENCE = 95;

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

export class PaddleOCR {
  /** @type {boolean} */
  #initialized = false;

  /** @type {OnProgressCallback | undefined} */
  #onProgress;

  /** @type {{ init: Function, recognize: Function } | null} */
  #ocr = null;

  /**
   * @param {OnProgressCallback} [onProgress] - Callback for progress updates
   */
  constructor(onProgress) {
    this.#onProgress = onProgress;
  }

  /**
   * Report progress to callback
   * @param {string} status
   * @param {number} progress
   */
  #reportProgress(status, progress) {
    if (this.#onProgress) {
      this.#onProgress({
        status,
        progress: Math.round(progress * 100),
      });
    }
  }

  /**
   * Initialize the PaddleOCR engine
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.#initialized) {
      return;
    }

    this.#reportProgress('Loading OCR models...', 0);

    try {
      console.log('[PaddleOCR] Loading OCR library...');
      // Dynamic import to avoid blocking app startup
      const ocrModule = await import('@arkntools/paddlejs-ocr');
      const defaultConfig = await import('@arkntools/paddlejs-ocr/dist/defaultInitConfig');

      this.#ocr = ocrModule;

      console.log('[PaddleOCR] Initializing OCR engine with default config...');
      await this.#ocr.init(defaultConfig.default || defaultConfig);
      console.log('[PaddleOCR] OCR engine initialized');

      this.#initialized = true;
      this.#reportProgress('OCR engine ready', 0.5);
    } catch (error) {
      console.error('[PaddleOCR] Initialization error:', error);
      this.#reportProgress('Failed to load OCR models', 0);
      throw error;
    }
  }

  /**
   * Perform OCR on an image
   * @param {Blob} imageBlob - The image to process
   * @returns {Promise<OCRResult>}
   */
  async recognize(imageBlob) {
    if (!this.#initialized || !this.#ocr) {
      throw new Error('PaddleOCR not initialized. Call initialize() first.');
    }

    this.#reportProgress('Recognizing text...', 0.5);

    try {
      console.log('[PaddleOCR] Starting recognition on blob:', imageBlob.size, 'bytes');
      // @arkntools/paddlejs-ocr accepts Blob directly
      const result = await this.#ocr.recognize(imageBlob);
      console.log('[PaddleOCR] Recognition result:', result);

      this.#reportProgress('Processing results...', 0.9);

      // Transform result into our structured format
      // @arkntools/paddlejs-ocr returns { text: string[], points: number[][][] }
      const words = [];
      const lines = [];

      const textLines = Array.isArray(result?.text) ? result.text : [];
      const pointsData = result?.points || [];

      for (let i = 0; i < textLines.length; i++) {
        const lineText = textLines[i];
        if (!lineText) {
          continue;
        }

        // Get bounding box from points if available
        const linePoints = pointsData[i] || [];
        const bbox = this.#pointsToBbox(linePoints);

        // Split text into words
        const lineWords = lineText.split(/\s+/).filter((w) => w.length > 0);
        const wordWidth = bbox.width / Math.max(lineWords.length, 1);

        const ocrWords = lineWords.map((word, idx) => ({
          text: word,
          confidence: DEFAULT_CONFIDENCE,
          bbox: {
            x0: bbox.x0 + idx * wordWidth,
            y0: bbox.y0,
            x1: bbox.x0 + (idx + 1) * wordWidth,
            y1: bbox.y1,
          },
        }));

        words.push(...ocrWords);

        lines.push({
          text: lineText,
          confidence: DEFAULT_CONFIDENCE,
          words: ocrWords,
        });
      }

      // Combine all text
      const fullText = lines.map((l) => l.text).join('\n');

      this.#reportProgress('Recognition complete', 1);

      return {
        fullText,
        lines,
        words,
      };
    } catch (error) {
      console.error('[PaddleOCR] Recognition error:', error);
      throw error;
    }
  }

  /**
   * Convert polygon points to bounding box
   * @param {number[][]} points - Array of [x, y] points
   * @returns {{ x0: number, y0: number, x1: number, y1: number, width: number, height: number }}
   */
  #pointsToBbox(points) {
    if (!points || points.length === 0) {
      return { x0: 0, y0: 0, x1: 0, y1: 0, width: 0, height: 0 };
    }

    const xs = points.map((p) => p[0]);
    const ys = points.map((p) => p[1]);

    const x0 = Math.min(...xs);
    const y0 = Math.min(...ys);
    const x1 = Math.max(...xs);
    const y1 = Math.max(...ys);

    return { x0, y0, x1, y1, width: x1 - x0, height: y1 - y0 };
  }

  /**
   * Terminate the OCR engine and release resources
   * @returns {Promise<void>}
   */
  async terminate() {
    // @arkntools/paddlejs-ocr doesn't have an explicit terminate method
    // Just reset state
    this.#initialized = false;
  }
}
