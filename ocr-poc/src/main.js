/**
 * Scoresheet Scanner - OCR PoC
 *
 * A proof-of-concept app for extracting player names from volleyball scoresheets.
 * This scaffold sets up the basic structure for:
 * - Photo capture of scoresheets
 * - Sheet type selection (electronic vs handwritten)
 * - OCR processing to extract text
 * - Comparison against reference player lists
 *
 * Note: Service worker registration is handled automatically by vite-plugin-pwa
 */

import './style.css';
import { ImageCapture } from './components/ImageCapture.js';
import { SheetTypeSelector } from './components/SheetTypeSelector.js';
import { OCRProgress } from './components/OCRProgress.js';
import { OCRFactory } from './services/ocr/index.js';
import { PlayerComparison } from './components/PlayerComparison.js';

/* ==============================================
 * APPLICATION STATE
 * ============================================== */

/**
 * @typedef {'capture' | 'select-type' | 'processing' | 'results' | 'comparison'} AppState
 */

/**
 * @typedef {import('./services/ocr/StubOCR.js').OCRResult} OCRResult
 */

/**
 * @typedef {Object} AppContext
 * @property {AppState} state - Current application state
 * @property {Blob | null} capturedImage - The captured image blob
 * @property {'electronic' | 'handwritten' | null} sheetType - Selected sheet type
 * @property {OCRResult | null} ocrResult - OCR processing result
 */

/** @type {AppContext} */
const appContext = {
  state: 'capture',
  capturedImage: null,
  sheetType: null,
  ocrResult: null,
};

/* ==============================================
 * COMPONENT INSTANCES
 * ============================================== */

/** @type {ImageCapture | null} */
let imageCapture = null;

/** @type {SheetTypeSelector | null} */
let sheetTypeSelector = null;

/** @type {OCRProgress | null} */
let ocrProgress = null;

/** @type {import('./services/ocr/StubOCR.js').StubOCR | null} */
let ocrEngine = null;

/** @type {string | null} Object URL for results state preview image */
let resultsPreviewUrl = null;

/** @type {boolean} Guard flag to prevent concurrent OCR operations */
let isOCRRunning = false;

/** @type {PlayerComparison | null} */
let playerComparison = null;

/* ==============================================
 * STATE MACHINE
 * ============================================== */

/**
 * Transition to a new state
 * @param {AppState} newState
 * @param {Partial<AppContext>} [contextUpdates]
 */
function transition(newState, contextUpdates = {}) {
  const previousState = appContext.state;

  // Update context
  Object.assign(appContext, contextUpdates, { state: newState });

  console.log(`State transition: ${previousState} → ${newState}`, appContext);

  // Clean up previous state
  cleanupState(previousState);

  // Render new state
  renderState(newState);
}

/**
 * Clean up resources for a state
 * @param {AppState} state
 */
function cleanupState(state) {
  switch (state) {
    case 'capture':
      if (imageCapture) {
        imageCapture.destroy();
        imageCapture = null;
      }
      break;
    case 'select-type':
      if (sheetTypeSelector) {
        sheetTypeSelector.destroy();
        sheetTypeSelector = null;
      }
      break;
    case 'processing':
      if (ocrProgress) {
        ocrProgress.destroy();
        ocrProgress = null;
      }
      // Note: ocrEngine is terminated after OCR completes or on cancel
      break;
    case 'results':
      if (resultsPreviewUrl) {
        URL.revokeObjectURL(resultsPreviewUrl);
        resultsPreviewUrl = null;
      }
      break;
    case 'comparison':
      if (playerComparison) {
        playerComparison.destroy();
        playerComparison = null;
      }
      break;
  }
}

/**
 * Render UI for a state
 * @param {AppState} state
 */
function renderState(state) {
  const contentContainer = document.getElementById('content-container');
  if (!contentContainer) {
    console.error('Content container not found, cannot render state:', state);
    return;
  }

  switch (state) {
    case 'capture':
      renderCaptureState(contentContainer);
      break;
    case 'select-type':
      renderSelectTypeState(contentContainer);
      break;
    case 'processing':
      renderProcessingState(contentContainer);
      break;
    case 'results':
      renderResultsState(contentContainer);
      break;
    case 'comparison':
      renderComparisonState(contentContainer);
      break;
  }
}

/* ==============================================
 * STATE RENDERERS
 * ============================================== */

/**
 * Render the image capture state
 * @param {HTMLElement} container
 */
function renderCaptureState(container) {
  container.innerHTML = `
    <h2 class="text-center mb-md">Capture Scoresheet</h2>
    <p class="text-muted text-center mb-lg">
      Take a photo or select an image from your library to extract player information.
    </p>
    <div id="image-capture-container"></div>
  `;

  const captureContainer = document.getElementById('image-capture-container');
  if (captureContainer) {
    imageCapture = new ImageCapture({
      container: captureContainer,
      onCapture: handleImageCapture,
    });
  }
}

/**
 * Render the sheet type selection state
 * @param {HTMLElement} container
 */
function renderSelectTypeState(container) {
  container.innerHTML = `
    <h2 class="text-center mb-md">Select Sheet Type</h2>
    <div id="sheet-type-container"></div>
  `;

  const typeContainer = document.getElementById('sheet-type-container');
  if (typeContainer && appContext.capturedImage) {
    sheetTypeSelector = new SheetTypeSelector({
      container: typeContainer,
      imageBlob: appContext.capturedImage,
      onSelect: handleSheetTypeSelect,
      onBack: handleBackToCapture,
    });
  }
}

/**
 * Render the processing state with OCR progress
 * @param {HTMLElement} container
 */
function renderProcessingState(container) {
  container.innerHTML = `
    <h2 class="text-center mb-md">Processing Scoresheet</h2>
    <p class="text-muted text-center mb-lg">
      Extracting text using ${appContext.sheetType === 'electronic' ? 'print' : 'handwriting'} recognition...
    </p>
    <div id="ocr-progress-container"></div>
  `;

  const progressContainer = document.getElementById('ocr-progress-container');
  if (progressContainer) {
    ocrProgress = new OCRProgress({
      container: progressContainer,
      onCancel: handleCancelOCR,
    });

    // Start OCR processing
    runOCR();
  }
}

/**
 * Get error message from unknown error type
 * @param {unknown} error
 * @returns {string}
 */
function getErrorMessage(error) {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error occurred';
}

/**
 * Run OCR processing on the captured image
 */
async function runOCR() {
  // Guard against concurrent OCR operations
  if (isOCRRunning) {
    console.warn('OCR already running, ignoring duplicate request');
    return;
  }

  if (!appContext.capturedImage || !appContext.sheetType) {
    console.error('Missing image or sheet type for OCR');
    return;
  }

  isOCRRunning = true;

  try {
    // Create OCR engine with progress callback
    ocrEngine = OCRFactory.create(appContext.sheetType, (progress) => {
      ocrProgress?.updateProgress(progress);
    });

    // Initialize and run OCR
    await ocrEngine.initialize();
    const result = await ocrEngine.recognize(appContext.capturedImage);

    // Log results to console
    console.log('=== OCR Results ===');
    console.log('Full text:', result.fullText);
    console.log('Lines:', result.lines.length);
    console.log('Words:', result.words.length);
    console.log('Detailed results:', result);

    // Clean up engine
    await ocrEngine.terminate();
    ocrEngine = null;

    // Transition to results state
    transition('results', { ocrResult: result });
  } catch (error) {
    console.error('OCR Error:', error);
    ocrProgress?.showError(`OCR failed: ${getErrorMessage(error)}`);

    // Clean up engine on error
    if (ocrEngine) {
      await ocrEngine.terminate();
      ocrEngine = null;
    }
  } finally {
    isOCRRunning = false;
  }
}

/**
 * Render the results state showing OCR output
 * @param {HTMLElement} container
 */
function renderResultsState(container) {
  const result = appContext.ocrResult;
  const wordCount = result?.words.length || 0;
  const lineCount = result?.lines.length || 0;
  const avgConfidence =
    wordCount > 0
      ? Math.round(result.words.reduce((sum, w) => sum + w.confidence, 0) / wordCount)
      : 0;

  container.innerHTML = `
    <h2 class="text-center mb-md">OCR Complete</h2>

    <div class="ocr-results__stats mb-lg">
      <div class="ocr-results__stat">
        <span class="ocr-results__stat-value">${lineCount}</span>
        <span class="ocr-results__stat-label">Lines</span>
      </div>
      <div class="ocr-results__stat">
        <span class="ocr-results__stat-value">${wordCount}</span>
        <span class="ocr-results__stat-label">Words</span>
      </div>
      <div class="ocr-results__stat">
        <span class="ocr-results__stat-value">${avgConfidence}%</span>
        <span class="ocr-results__stat-label">Confidence</span>
      </div>
    </div>

    <div class="sheet-type-selector__preview mb-md">
      <img
        id="result-preview"
        class="sheet-type-selector__thumbnail"
        alt="Processed scoresheet"
      />
    </div>

    <details class="ocr-results__details mb-lg">
      <summary class="ocr-results__summary">View Extracted Text</summary>
      <pre class="ocr-results__text">${escapeHtml(result?.fullText || 'No text extracted')}</pre>
    </details>

    <div class="flex flex-col gap-md">
      <button class="btn btn-primary btn-block" id="btn-compare-players">
        Compare with Reference List
      </button>
      <button class="btn btn-secondary btn-block" id="btn-new-scan">
        Scan Another Sheet
      </button>
    </div>
  `;

  // Show the captured image
  const preview = document.getElementById('result-preview');
  if (preview && appContext.capturedImage) {
    resultsPreviewUrl = URL.createObjectURL(appContext.capturedImage);
    preview.src = resultsPreviewUrl;
  }

  // Bind buttons
  const compareBtn = document.getElementById('btn-compare-players');
  compareBtn?.addEventListener('click', handleComparePressed);

  const newScanBtn = document.getElementById('btn-new-scan');
  newScanBtn?.addEventListener('click', handleStartOver);
}

/**
 * Render the player comparison state
 * @param {HTMLElement} container
 */
function renderComparisonState(container) {
  container.innerHTML = `
    <h2 class="text-center mb-md">Player List Comparison</h2>
    <div id="player-comparison-container"></div>
  `;

  const comparisonContainer = document.getElementById('player-comparison-container');
  if (comparisonContainer && appContext.ocrResult) {
    playerComparison = new PlayerComparison({
      container: comparisonContainer,
      ocrText: appContext.ocrResult.fullText,
      onBack: handleBackToResults,
    });
  }
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/* ==============================================
 * EVENT HANDLERS
 * ============================================== */

/**
 * Handle captured image from ImageCapture component
 * @param {Blob} blob - The captured image as a Blob
 */
function handleImageCapture(blob) {
  console.log('Image captured:', blob);
  console.log('  Type:', blob.type);
  console.log('  Size:', (blob.size / 1024).toFixed(2), 'KB');

  transition('select-type', { capturedImage: blob });
}

/**
 * Handle sheet type selection
 * @param {{ type: 'electronic' | 'handwritten', imageBlob: Blob }} selection
 */
function handleSheetTypeSelect(selection) {
  console.log('Sheet type selected:', selection.type);
  console.log('  Image size:', (selection.imageBlob.size / 1024).toFixed(2), 'KB');

  transition('processing', { sheetType: selection.type });
}

/**
 * Handle going back to capture from type selection
 */
function handleBackToCapture() {
  // SheetTypeSelector component handles its own URL cleanup via destroy()
  transition('capture', { capturedImage: null, sheetType: null });
}

/**
 * Handle starting over from any state
 */
function handleStartOver() {
  transition('capture', { capturedImage: null, sheetType: null, ocrResult: null });
}

/**
 * Handle compare players button press
 */
function handleComparePressed() {
  transition('comparison');
}

/**
 * Handle going back to results from comparison
 */
function handleBackToResults() {
  transition('results');
}

/**
 * Handle canceling OCR processing
 */
async function handleCancelOCR() {
  if (ocrEngine) {
    await ocrEngine.terminate();
    ocrEngine = null;
  }
  isOCRRunning = false;
  transition('capture', { capturedImage: null, sheetType: null, ocrResult: null });
}

/* ==============================================
 * INITIALIZATION
 * ============================================== */

/**
 * Initialize the application
 */
function init() {
  const app = document.getElementById('app');

  if (!app) {
    console.error('App container not found');
    return;
  }

  // Render app shell
  app.innerHTML = `
    <div class="container">
      <div class="card">
        <div id="content-container"></div>
      </div>
    </div>
  `;

  // Render initial state
  renderState(appContext.state);
}

/**
 * Clean up resources to prevent memory leaks
 */
function cleanup() {
  cleanupState(appContext.state);
}

// Clean up on page unload
window.addEventListener('pagehide', cleanup);

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
