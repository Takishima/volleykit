/**
 * PaddleOCR Service
 *
 * Wrapper around @paddle-js-models/ocr for OCR processing.
 * Uses PP-OCRv3 models optimized for browser execution via WebGL.
 */

import * as paddleOcr from '@paddle-js-models/ocr';

/**
 * @typedef {import('./TesseractOCR.js').OCRWord} OCRWord
 * @typedef {import('./TesseractOCR.js').OCRLine} OCRLine
 * @typedef {import('./TesseractOCR.js').OCRResult} OCRResult
 * @typedef {import('./TesseractOCR.js').OnProgressCallback} OnProgressCallback
 */

/**
 * Map status to user-friendly messages
 * @param {string} status - Status string
 * @returns {string} User-friendly status message
 */
function getStatusMessage(status) {
  const statusMessages = {
    loading: 'Loading PaddleOCR models...',
    detecting: 'Detecting text regions...',
    recognizing: 'Recognizing text...',
    'post-processing': 'Processing results...',
  };
  return statusMessages[status] || status;
}

export class PaddleOCR {
  /** @type {boolean} */
  #initialized = false;

  /** @type {OnProgressCallback | undefined} */
  #onProgress;

  /** @type {'electronic' | 'handwritten'} */
  #sheetType;

  /**
   * @param {'electronic' | 'handwritten'} sheetType - Type of scoresheet
   * @param {OnProgressCallback} [onProgress] - Callback for progress updates
   */
  constructor(sheetType, onProgress) {
    this.#sheetType = sheetType;
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
   * Initialize the PaddleOCR models
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.#initialized) {
      return;
    }

    this.#reportProgress('loading', 0);

    // Initialize PaddleOCR - this loads both detection and recognition models
    await paddleOcr.init();

    this.#reportProgress('loading', 1);
    this.#initialized = true;
  }

  /**
   * Perform OCR on an image
   * @param {Blob} imageBlob - The image to process
   * @returns {Promise<OCRResult>}
   */
  async recognize(imageBlob) {
    if (!this.#initialized) {
      throw new Error('PaddleOCR not initialized. Call initialize() first.');
    }

    this.#reportProgress('detecting', 0.2);

    // Convert blob to image element for PaddleOCR
    const img = await this.#blobToImage(imageBlob);

    this.#reportProgress('recognizing', 0.4);

    // Run OCR recognition
    const result = await paddleOcr.recognize(img);

    this.#reportProgress('post-processing', 0.9);

    // Transform PaddleOCR result to our format
    const words = [];
    const lines = [];

    // PaddleOCR returns { text: string[], points: number[][][] }
    // Each text item corresponds to a detected text region
    if (result && result.text) {
      for (let i = 0; i < result.text.length; i++) {
        const text = result.text[i];
        const points = result.points ? result.points[i] : null;

        // Calculate bounding box from points if available
        let bbox = { x0: 0, y0: 0, x1: 0, y1: 0 };
        if (points && points.length >= 4) {
          const xs = points.map((p) => p[0]);
          const ys = points.map((p) => p[1]);
          bbox = {
            x0: Math.min(...xs),
            y0: Math.min(...ys),
            x1: Math.max(...xs),
            y1: Math.max(...ys),
          };
        }

        // Split text into words
        const textWords = text.split(/\s+/).filter((w) => w.length > 0);
        const lineWords = textWords.map((word) => ({
          text: word,
          confidence: 95, // PaddleOCR doesn't expose confidence per word
          bbox,
        }));

        words.push(...lineWords);
        lines.push({
          text,
          confidence: 95,
          words: lineWords,
        });
      }
    }

    this.#reportProgress('recognizing', 1);

    // Join all text with newlines
    const fullText = result?.text?.join('\n') || '';

    return {
      fullText,
      lines,
      words,
    };
  }

  /**
   * Convert a Blob to an HTMLImageElement
   * @param {Blob} blob - Image blob
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
   * Terminate and release resources
   * @returns {Promise<void>}
   */
  async terminate() {
    // PaddleOCR doesn't have an explicit terminate method
    // The models stay in memory for reuse
    this.#initialized = false;
  }
}
