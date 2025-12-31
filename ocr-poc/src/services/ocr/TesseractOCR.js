/**
 * TesseractOCR Service
 *
 * Wrapper around Tesseract.js for OCR processing.
 * Configured for Swiss volleyball scoresheets with German + French language support.
 */

import Tesseract from 'tesseract.js';

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

/** CDN base URL for Tesseract.js v7 worker */
const CDN_WORKER = 'https://cdn.jsdelivr.net/npm/tesseract.js@7/dist/worker.min.js';

/** CDN base URL for Tesseract.js-core v7 (auto-selects SIMD/non-SIMD) */
const CDN_CORE = 'https://cdn.jsdelivr.net/npm/tesseract.js-core@7';

/** CDN path for language training data (tessdata_fast for speed) */
const CDN_LANG = 'https://tessdata.projectnaptha.com/4.0.0_fast';

/** Language codes for Swiss names (German + French) */
const LANGUAGES = 'deu+fra';

/**
 * Map Tesseract internal status to user-friendly messages
 * @param {string} status - Tesseract status string
 * @returns {string} User-friendly status message
 */
function getStatusMessage(status) {
  const statusMessages = {
    loading: 'Loading OCR engine...',
    'loading tesseract core': 'Loading OCR engine...',
    'initializing tesseract': 'Initializing OCR...',
    'loading language traineddata': 'Loading language data...',
    'initializing api': 'Preparing OCR...',
    recognizing: 'Recognizing text...',
  };
  return statusMessages[status] || status;
}

export class TesseractOCR {
  /** @type {Tesseract.Worker | null} */
  #worker = null;

  /** @type {boolean} */
  #initialized = false;

  /** @type {OnProgressCallback | undefined} */
  #onProgress;

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
        status: getStatusMessage(status),
        progress: Math.round(progress * 100),
      });
    }
  }

  /**
   * Initialize the Tesseract worker with language data
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.#initialized) {
      return;
    }

    this.#reportProgress('loading', 0);

    this.#worker = await Tesseract.createWorker(LANGUAGES, 1, {
      workerPath: CDN_WORKER,
      corePath: CDN_CORE,
      langPath: CDN_LANG,
      logger: (message) => {
        if (message.status && typeof message.progress === 'number') {
          this.#reportProgress(message.status, message.progress);
        }
      },
    });

    this.#initialized = true;
  }

  /**
   * Perform OCR on an image
   * @param {Blob} imageBlob - The image to process
   * @returns {Promise<OCRResult>}
   */
  async recognize(imageBlob) {
    if (!this.#worker) {
      throw new Error('TesseractOCR not initialized. Call initialize() first.');
    }

    this.#reportProgress('recognizing', 0);

    const result = await this.#worker.recognize(imageBlob);

    // Transform Tesseract result into our structured format
    const words = result.data.words.map((word) => ({
      text: word.text,
      confidence: word.confidence,
      bbox: {
        x0: word.bbox.x0,
        y0: word.bbox.y0,
        x1: word.bbox.x1,
        y1: word.bbox.y1,
      },
    }));

    const lines = result.data.lines.map((line) => ({
      text: line.text,
      confidence: line.confidence,
      words: line.words.map((word) => ({
        text: word.text,
        confidence: word.confidence,
        bbox: {
          x0: word.bbox.x0,
          y0: word.bbox.y0,
          x1: word.bbox.x1,
          y1: word.bbox.y1,
        },
      })),
    }));

    this.#reportProgress('recognizing', 1);

    return {
      fullText: result.data.text,
      lines,
      words,
    };
  }

  /**
   * Terminate the worker and release resources
   * @returns {Promise<void>}
   */
  async terminate() {
    if (this.#worker) {
      await this.#worker.terminate();
      this.#worker = null;
      this.#initialized = false;
    }
  }
}
