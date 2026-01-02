/**
 * Stub OCR Service
 *
 * Placeholder OCR service for development while external OCR services
 * (Google Vision, AWS Textract, PaddleOCR) are being integrated.
 *
 * Returns mock data to allow the UI flow to be tested.
 */

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

/** Simulated processing delay in milliseconds */
const SIMULATED_DELAY_MS = 1500;

/** Mock OCR result for testing UI flow */
const MOCK_RESULT = {
  fullText: '[Stub OCR] External OCR service not configured.\n\nThis is placeholder text returned by the stub OCR service.\nIntegrate Google Vision, AWS Textract, or PaddleOCR to enable real text extraction.',
  lines: [
    {
      text: '[Stub OCR] External OCR service not configured.',
      confidence: 100,
      words: [
        { text: '[Stub', confidence: 100, bbox: { x0: 0, y0: 0, x1: 50, y1: 20 } },
        { text: 'OCR]', confidence: 100, bbox: { x0: 55, y0: 0, x1: 100, y1: 20 } },
        { text: 'External', confidence: 100, bbox: { x0: 105, y0: 0, x1: 170, y1: 20 } },
        { text: 'OCR', confidence: 100, bbox: { x0: 175, y0: 0, x1: 210, y1: 20 } },
        { text: 'service', confidence: 100, bbox: { x0: 215, y0: 0, x1: 270, y1: 20 } },
        { text: 'not', confidence: 100, bbox: { x0: 275, y0: 0, x1: 300, y1: 20 } },
        { text: 'configured.', confidence: 100, bbox: { x0: 305, y0: 0, x1: 380, y1: 20 } },
      ],
    },
    {
      text: '',
      confidence: 100,
      words: [],
    },
    {
      text: 'This is placeholder text returned by the stub OCR service.',
      confidence: 100,
      words: [
        { text: 'This', confidence: 100, bbox: { x0: 0, y0: 40, x1: 40, y1: 60 } },
        { text: 'is', confidence: 100, bbox: { x0: 45, y0: 40, x1: 60, y1: 60 } },
        { text: 'placeholder', confidence: 100, bbox: { x0: 65, y0: 40, x1: 150, y1: 60 } },
        { text: 'text', confidence: 100, bbox: { x0: 155, y0: 40, x1: 185, y1: 60 } },
        { text: 'returned', confidence: 100, bbox: { x0: 190, y0: 40, x1: 255, y1: 60 } },
        { text: 'by', confidence: 100, bbox: { x0: 260, y0: 40, x1: 280, y1: 60 } },
        { text: 'the', confidence: 100, bbox: { x0: 285, y0: 40, x1: 310, y1: 60 } },
        { text: 'stub', confidence: 100, bbox: { x0: 315, y0: 40, x1: 350, y1: 60 } },
        { text: 'OCR', confidence: 100, bbox: { x0: 355, y0: 40, x1: 385, y1: 60 } },
        { text: 'service.', confidence: 100, bbox: { x0: 390, y0: 40, x1: 445, y1: 60 } },
      ],
    },
    {
      text: 'Integrate Google Vision, AWS Textract, or PaddleOCR to enable real text extraction.',
      confidence: 100,
      words: [
        { text: 'Integrate', confidence: 100, bbox: { x0: 0, y0: 60, x1: 70, y1: 80 } },
        { text: 'Google', confidence: 100, bbox: { x0: 75, y0: 60, x1: 125, y1: 80 } },
        { text: 'Vision,', confidence: 100, bbox: { x0: 130, y0: 60, x1: 180, y1: 80 } },
        { text: 'AWS', confidence: 100, bbox: { x0: 185, y0: 60, x1: 220, y1: 80 } },
        { text: 'Textract,', confidence: 100, bbox: { x0: 225, y0: 60, x1: 290, y1: 80 } },
        { text: 'or', confidence: 100, bbox: { x0: 295, y0: 60, x1: 310, y1: 80 } },
        { text: 'PaddleOCR', confidence: 100, bbox: { x0: 315, y0: 60, x1: 395, y1: 80 } },
        { text: 'to', confidence: 100, bbox: { x0: 400, y0: 60, x1: 415, y1: 80 } },
        { text: 'enable', confidence: 100, bbox: { x0: 420, y0: 60, x1: 470, y1: 80 } },
        { text: 'real', confidence: 100, bbox: { x0: 475, y0: 60, x1: 505, y1: 80 } },
        { text: 'text', confidence: 100, bbox: { x0: 510, y0: 60, x1: 540, y1: 80 } },
        { text: 'extraction.', confidence: 100, bbox: { x0: 545, y0: 60, x1: 620, y1: 80 } },
      ],
    },
  ],
  words: [],
};

// Flatten words from lines for convenience
MOCK_RESULT.words = MOCK_RESULT.lines.flatMap((line) => line.words);

export class StubOCR {
  /** @type {OnProgressCallback | undefined} */
  #onProgress;

  /** @type {boolean} */
  #initialized = false;

  /**
   * @param {OnProgressCallback} [onProgress] - Callback for progress updates
   */
  constructor(onProgress) {
    this.#onProgress = onProgress;
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
   * Initialize the OCR service (no-op for stub)
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.#initialized) {
      return;
    }

    this.#reportProgress('Initializing stub OCR...', 0);

    // Simulate initialization delay
    await new Promise((resolve) => setTimeout(resolve, 200));

    this.#reportProgress('Stub OCR ready', 50);
    this.#initialized = true;
  }

  /**
   * Perform OCR on an image (returns mock data)
   * @param {Blob} _imageBlob - The image to process (ignored in stub)
   * @returns {Promise<OCRResult>}
   */
  async recognize(_imageBlob) {
    if (!this.#initialized) {
      throw new Error('StubOCR not initialized. Call initialize() first.');
    }

    this.#reportProgress('Processing image...', 60);

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, SIMULATED_DELAY_MS));

    this.#reportProgress('Extracting text...', 90);

    await new Promise((resolve) => setTimeout(resolve, 300));

    this.#reportProgress('Complete', 100);

    return MOCK_RESULT;
  }

  /**
   * Terminate the OCR service (no-op for stub)
   * @returns {Promise<void>}
   */
  async terminate() {
    this.#initialized = false;
  }
}
