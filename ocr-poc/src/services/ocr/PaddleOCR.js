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

/** Initialization timeout in milliseconds (2 minutes for slow connections) */
const INIT_TIMEOUT_MS = 120000;

/** PaddleOCR model CDN base URL */
const MODEL_CDN_BASE = 'https://js-models.bj.bcebos.com/PaddleOCR/PP-OCRv3';

/** Progress update interval during model loading (ms) */
const PROGRESS_INTERVAL_MS = 500;

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
 * Check if WebGL is available in the browser
 * @returns {{ available: boolean, version: number }}
 */
function checkWebGL() {
  try {
    const canvas = document.createElement('canvas');
    const gl2 = canvas.getContext('webgl2');
    if (gl2) {
      return { available: true, version: 2 };
    }
    const gl1 = canvas.getContext('webgl');
    if (gl1) {
      return { available: true, version: 1 };
    }
    return { available: false, version: 0 };
  } catch {
    return { available: false, version: 0 };
  }
}

/**
 * Test connectivity to PaddleOCR model server
 * @returns {Promise<boolean>}
 */
async function testModelServerConnectivity() {
  try {
    const modelUrl = `${MODEL_CDN_BASE}/ch_PP-OCRv3_det_infer_js_960/model.json`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(modelUrl, {
      method: 'HEAD',
      mode: 'cors',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.warn('[PaddleOCR] Model server connectivity test failed:', error.message);
    return false;
  }
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

    this.#reportProgress('Checking browser capabilities...', 0);

    try {
      // Check WebGL availability
      const webgl = checkWebGL();
      console.log('[PaddleOCR] WebGL check:', webgl);
      if (!webgl.available) {
        throw new Error('WebGL is not available. PaddleOCR requires WebGL support.');
      }

      this.#reportProgress('Testing model server connectivity...', 0.05);

      // Test connectivity to model server
      const canConnect = await testModelServerConnectivity();
      console.log('[PaddleOCR] Model server connectivity:', canConnect);
      if (!canConnect) {
        console.warn('[PaddleOCR] Cannot connect to model server, will try anyway...');
      }

      this.#reportProgress('Loading PaddleOCR library...', 0.1);
      console.log('[PaddleOCR] Starting dynamic import...');
      console.log('[PaddleOCR] window.Module:', typeof window.Module);

      // Dynamic import to avoid loading unless needed
      let paddleOcr;
      try {
        paddleOcr = await import('@paddle-js-models/ocr');
        console.log('[PaddleOCR] Import successful');
        console.log('[PaddleOCR] Module exports:', Object.keys(paddleOcr));
        console.log('[PaddleOCR] window.cv after import:', typeof window.cv);
      } catch (importError) {
        console.error('[PaddleOCR] Import failed:', importError);
        throw new Error(`Failed to import PaddleOCR: ${importError.message}`);
      }

      this.#reportProgress('Downloading OCR models...', 0.2);
      console.log('[PaddleOCR] Starting init...');

      // Initialize with timeout and progress simulation
      try {
        await this.#initWithProgress(paddleOcr);
      } catch (initError) {
        console.error('[PaddleOCR] Init failed:', initError);
        throw new Error(`PaddleOCR init() failed: ${initError.message}`);
      }

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
   * Initialize PaddleOCR with simulated progress updates
   * Since PaddleOCR doesn't expose download progress, we simulate it
   * @param {any} paddleOcr - The PaddleOCR module
   * @returns {Promise<void>}
   */
  async #initWithProgress(paddleOcr) {
    let currentProgress = 0.2;
    const maxProgress = 0.95;
    const progressIncrement = 0.02;
    let intervalId = null;

    // Start progress ticker
    intervalId = setInterval(() => {
      if (currentProgress < maxProgress) {
        currentProgress += progressIncrement;
        // Slow down as we approach the max
        if (currentProgress > 0.7) {
          currentProgress += progressIncrement * 0.3;
        }
        this.#reportProgress('Downloading OCR models...', Math.min(currentProgress, maxProgress));
      }
    }, PROGRESS_INTERVAL_MS);

    try {
      await Promise.race([
        paddleOcr.init(),
        timeout(INIT_TIMEOUT_MS, `Model download timed out after ${INIT_TIMEOUT_MS / 1000}s. Check your network connection.`),
      ]);
    } finally {
      // Always clear the interval
      if (intervalId) {
        clearInterval(intervalId);
      }
    }
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
