/**
 * PaddleOCR Service
 *
 * Wrapper around @paddlejs-models/ocr for OCR processing.
 * Uses WebGL-based Paddle.js for lightweight browser inference.
 * Supports Chinese, English, and numbers recognition.
 */

// Note: @paddlejs-models/ocr is dynamically imported in initialize() to avoid
// blocking app startup if the library fails to load

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

  /** @type {typeof import('@paddlejs-models/ocr') | null} */
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
      this.#ocr = await import('@paddlejs-models/ocr');

      console.log('[PaddleOCR] Initializing OCR engine...');
      await this.#ocr.init();
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

    // Load the blob as an HTMLImageElement (required by @paddlejs-models/ocr)
    const imageElement = await this.#blobToImageElement(imageBlob);

    try {
      console.log('[PaddleOCR] Starting recognition on image:', imageElement.width, 'x', imageElement.height);
      const result = await this.#ocr.recognize(imageElement);
      console.log('[PaddleOCR] Recognition result:', result);

      this.#reportProgress('Processing results...', 0.9);

      // Transform result into our structured format
      // @paddlejs-models/ocr returns { text: string[][], points: number[][][] }
      // text is array of text regions, each region is array of lines
      const words = [];
      const lines = [];

      // Flatten the text array structure
      const textLines = Array.isArray(result?.text) ? result.text.flat() : [];
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
          confidence: 95, // @paddlejs-models/ocr doesn't provide confidence scores
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
          confidence: 95,
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
   * Convert a Blob to an HTMLImageElement
   * @param {Blob} blob
   * @returns {Promise<HTMLImageElement>}
   */
  #blobToImageElement(blob) {
    return new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(blob);
      const img = new Image();

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(img);
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to load image'));
      };

      img.src = objectUrl;
    });
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
    // @paddlejs-models/ocr doesn't have an explicit terminate method
    // Just reset state
    this.#initialized = false;
  }
}
