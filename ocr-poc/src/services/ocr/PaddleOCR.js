/**
 * PaddleOCR Service
 *
 * Wrapper around @gutenye/ocr-browser for OCR processing.
 * Uses PP-OCRv3 detection and Latin recognition for Swiss volleyball scoresheets
 * with German, French, and Italian language support.
 */

import Ocr from '@gutenye/ocr-browser';

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

/** Hugging Face CDN base URL for paddleocr-onnx models */
const HF_CDN_BASE = 'https://huggingface.co/monkt/paddleocr-onnx/resolve/main';

/** Model paths - using PP-OCRv3 detection (smaller) and Latin recognition */
const MODEL_PATHS = {
  detectionPath: `${HF_CDN_BASE}/detection/v3/det.onnx`,
  recognitionPath: `${HF_CDN_BASE}/languages/latin/rec.onnx`,
  dictionaryPath: `${HF_CDN_BASE}/languages/latin/dict.txt`,
};

export class PaddleOCR {
  /** @type {Ocr | null} */
  #ocr = null;

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
        status,
        progress: Math.round(progress * 100),
      });
    }
  }

  /**
   * Initialize the PaddleOCR engine with model data
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.#initialized) {
      return;
    }

    this.#reportProgress('Loading OCR models...', 0);

    try {
      this.#ocr = await Ocr.create({
        models: MODEL_PATHS,
      });

      this.#initialized = true;
      this.#reportProgress('OCR engine ready', 0.5);
    } catch (error) {
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
    if (!this.#ocr) {
      throw new Error('PaddleOCR not initialized. Call initialize() first.');
    }

    this.#reportProgress('Recognizing text...', 0.5);

    // Create object URL for the image (as shown in @gutenye/ocr-browser examples)
    const objectUrl = URL.createObjectURL(imageBlob);

    try {
      // Run OCR detection with object URL string
      console.log('[PaddleOCR] Starting detection on image URL:', objectUrl);
      const result = await this.#ocr.detect(objectUrl);
      console.log('[PaddleOCR] Detection result:', result);

      this.#reportProgress('Processing results...', 0.9);

      // Transform PaddleOCR result into our structured format
      // PaddleOCR returns { texts: TextLine[], resizedImageWidth, resizedImageHeight }
      // Each TextLine has { text, score, frame: { top, left, width, height } }
      const words = [];
      const lines = [];

      // Access result.texts (not result directly)
      const textLines = result?.texts || [];

      for (const textLine of textLines) {
        // Split text into words
        const lineWords = textLine.text.split(/\s+/).filter((w) => w.length > 0);
        const wordWidth = textLine.frame.width / Math.max(lineWords.length, 1);

        const ocrWords = lineWords.map((word, idx) => ({
          text: word,
          confidence: textLine.score * 100, // Convert 0-1 to 0-100
          bbox: {
            x0: textLine.frame.left + idx * wordWidth,
            y0: textLine.frame.top,
            x1: textLine.frame.left + (idx + 1) * wordWidth,
            y1: textLine.frame.top + textLine.frame.height,
          },
        }));

        words.push(...ocrWords);

        lines.push({
          text: textLine.text,
          confidence: textLine.score * 100,
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
      console.error('[PaddleOCR] Detection error:', error);
      throw error;
    } finally {
      // Always revoke the object URL to prevent memory leaks
      URL.revokeObjectURL(objectUrl);
    }
  }

  /**
   * Terminate the OCR engine and release resources
   * @returns {Promise<void>}
   */
  async terminate() {
    // @gutenye/ocr-browser doesn't have an explicit terminate method
    // Just clear references for garbage collection
    this.#ocr = null;
    this.#initialized = false;
  }
}
