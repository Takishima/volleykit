/**
 * TesseractOCR Service
 *
 * Wrapper around Tesseract.js for OCR processing.
 * Configured for Swiss volleyball scoresheets with German + French language support.
 */

import Tesseract from 'tesseract.js';
import {
  preprocessImage,
  ELECTRONIC_PRESET,
  HANDWRITTEN_PRESET,
} from '../imagePreprocessor.js';

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

/**
 * CDN path for language training data
 * Using tessdata_best for higher accuracy (larger download but better results)
 * tessdata_fast is faster but less accurate
 */
const CDN_LANG = 'https://tessdata.projectnaptha.com/4.0.0_best';

/** Language codes for Swiss names (German + French + Italian) */
const LANGUAGES = 'deu+fra+ita';

/**
 * Page Segmentation Modes (PSM) - see Tesseract documentation
 * PSM 3 = Fully automatic page segmentation (best for tables with multiple columns)
 * PSM 4 = Single column of text of variable sizes
 * PSM 6 = Single uniform block of text
 */
const PSM_AUTO = '3';

/**
 * Border padding in pixels to add around the image
 * Tesseract has issues with text at image edges
 */
const BORDER_PADDING_PX = 20;

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
    preprocessing: 'Preprocessing image...',
  };
  return statusMessages[status] || status;
}

/**
 * Add white border padding around an image
 * @param {Blob} imageBlob - Original image
 * @param {number} padding - Padding in pixels
 * @returns {Promise<Blob>} Image with border
 */
async function addBorderPadding(imageBlob, padding) {
  const imageBitmap = await createImageBitmap(imageBlob);

  try {
    const canvas = document.createElement('canvas');
    canvas.width = imageBitmap.width + padding * 2;
    canvas.height = imageBitmap.height + padding * 2;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get canvas context');
    }

    // Fill with white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw image centered with padding
    ctx.drawImage(imageBitmap, padding, padding);

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        'image/png'
      );
    });
  } finally {
    // Release ImageBitmap memory to prevent memory leaks
    imageBitmap.close();
  }
}

export class TesseractOCR {
  /** @type {Tesseract.Worker | null} */
  #worker = null;

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
   * Initialize the Tesseract worker with language data and optimal parameters
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

    // Configure Tesseract parameters for better accuracy on scoresheets
    await this.#worker.setParameters({
      // PSM 3 = Automatic page segmentation (best for tables with multiple columns)
      tessedit_pageseg_mode: PSM_AUTO,
      // Preserve interword spaces (important for table structure)
      preserve_interword_spaces: '1',
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

    // Step 1: Preprocess the image for better OCR results
    this.#reportProgress('preprocessing', 0.1);

    const preprocessOptions =
      this.#sheetType === 'handwritten' ? HANDWRITTEN_PRESET : ELECTRONIC_PRESET;

    let processedImage = await preprocessImage(imageBlob, preprocessOptions);

    // Step 2: Add border padding (Tesseract has issues with text at edges)
    this.#reportProgress('preprocessing', 0.2);
    processedImage = await addBorderPadding(processedImage, BORDER_PADDING_PX);

    // Step 3: Perform OCR
    this.#reportProgress('recognizing', 0.3);

    // Request blocks output to get words and lines (disabled by default in v6+)
    const result = await this.#worker.recognize(processedImage, {}, { blocks: true });

    // Transform Tesseract result into our structured format
    // Extract words and lines from blocks structure
    const words = [];
    const lines = [];

    if (result.data.blocks) {
      for (const block of result.data.blocks) {
        for (const paragraph of block.paragraphs || []) {
          for (const line of paragraph.lines || []) {
            const lineWords = [];
            for (const word of line.words || []) {
              const wordData = {
                text: word.text,
                confidence: word.confidence,
                bbox: {
                  x0: word.bbox.x0,
                  y0: word.bbox.y0,
                  x1: word.bbox.x1,
                  y1: word.bbox.y1,
                },
              };
              words.push(wordData);
              lineWords.push(wordData);
            }
            lines.push({
              text: line.text,
              confidence: line.confidence,
              words: lineWords,
            });
          }
        }
      }
    }

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
