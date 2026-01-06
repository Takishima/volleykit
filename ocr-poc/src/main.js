/**
 * Scoresheet Scanner - OCR PoC
 *
 * A proof-of-concept app for extracting player names from volleyball scoresheets.
 * This scaffold sets up the basic structure for:
 * - Sheet type selection (electronic vs manuscript)
 * - Photo capture of scoresheets with type-specific guides
 * - OCR processing to extract text (electronic only)
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
 * @typedef {'select-type' | 'capture' | 'processing' | 'results' | 'comparison' | 'manuscript-complete'} AppState
 */

/**
 * @typedef {import('./services/ocr/StubOCR.js').OCRResult} OCRResult
 */

/**
 * @typedef {Object} AppContext
 * @property {AppState} state - Current application state
 * @property {Blob | null} capturedImage - The captured image blob
 * @property {'electronic' | 'manuscript' | null} sheetType - Selected sheet type
 * @property {OCRResult | null} ocrResult - OCR processing result
 */

/** @type {AppContext} */
const appContext = {
  state: 'select-type',
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
    case 'select-type':
      if (sheetTypeSelector) {
        sheetTypeSelector.destroy();
        sheetTypeSelector = null;
      }
      break;
    case 'capture':
      if (imageCapture) {
        imageCapture.destroy();
        imageCapture = null;
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
    case 'manuscript-complete':
      if (resultsPreviewUrl) {
        URL.revokeObjectURL(resultsPreviewUrl);
        resultsPreviewUrl = null;
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
    case 'select-type':
      renderSelectTypeState(contentContainer);
      break;
    case 'capture':
      renderCaptureState(contentContainer);
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
    case 'manuscript-complete':
      renderManuscriptCompleteState(contentContainer);
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
    <div id="image-capture-container"></div>
  `;

  const captureContainer = document.getElementById('image-capture-container');
  if (captureContainer && appContext.sheetType) {
    imageCapture = new ImageCapture({
      container: captureContainer,
      sheetType: appContext.sheetType,
      onCapture: handleImageCapture,
      onBack: handleBackToTypeSelection,
    });
  }
}

/**
 * Render the sheet type selection state (first step)
 * @param {HTMLElement} container
 */
function renderSelectTypeState(container) {
  container.innerHTML = `
    <div class="main-content">
      <div class="container">
        <div class="card">
          <h2 class="text-center mb-md">What type of scoresheet?</h2>
          <div id="sheet-type-container"></div>
        </div>
      </div>
    </div>
  `;

  const typeContainer = document.getElementById('sheet-type-container');
  if (typeContainer) {
    sheetTypeSelector = new SheetTypeSelector({
      container: typeContainer,
      onSelect: handleSheetTypeSelect,
    });
  }
}

/**
 * Render the processing state with OCR progress (electronic sheets only)
 * @param {HTMLElement} container
 */
function renderProcessingState(container) {
  container.innerHTML = `
    <div class="main-content">
      <div class="container">
        <div class="card">
          <h2 class="text-center mb-md">Processing Scoresheet</h2>
          <p class="text-muted text-center mb-lg">
            Extracting text using print recognition...
          </p>
          <div id="ocr-progress-container"></div>
        </div>
      </div>
    </div>
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
    <div class="main-content">
      <div class="container">
        <div class="card">
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
        </div>
      </div>
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
    <div class="main-content">
      <div class="container">
        <div class="card">
          <h2 class="text-center mb-md">Player List Comparison</h2>
          <div id="player-comparison-container"></div>
        </div>
      </div>
    </div>
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
 * Render the manuscript capture complete state (no OCR)
 * @param {HTMLElement} container
 */
function renderManuscriptCompleteState(container) {
  container.innerHTML = `
    <div class="main-content">
      <div class="container">
        <div class="card">
          <h2 class="text-center mb-md">Image Captured</h2>
          <p class="text-muted text-center mb-lg">
            Manuscript scoresheet captured successfully. OCR for manuscript scoresheets is not yet available.
          </p>

          <div class="sheet-type-selector__preview mb-lg">
            <img
              id="manuscript-preview"
              class="sheet-type-selector__thumbnail"
              alt="Captured manuscript scoresheet"
            />
          </div>

          <div class="flex flex-col gap-md">
            <button class="btn btn-primary btn-block" id="btn-new-scan">
              Scan Another Sheet
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Show the captured image
  const preview = document.getElementById('manuscript-preview');
  if (preview && appContext.capturedImage) {
    resultsPreviewUrl = URL.createObjectURL(appContext.capturedImage);
    preview.src = resultsPreviewUrl;
  }

  // Bind button
  const newScanBtn = document.getElementById('btn-new-scan');
  newScanBtn?.addEventListener('click', handleStartOver);
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

  // Route based on sheet type
  if (appContext.sheetType === 'manuscript') {
    transition('manuscript-complete', { capturedImage: blob });
  } else {
    transition('processing', { capturedImage: blob });
  }
}

/**
 * Handle sheet type selection (now first step, routes to capture)
 * @param {'electronic' | 'manuscript'} type
 */
function handleSheetTypeSelect(type) {
  console.log('Sheet type selected:', type);

  transition('capture', { sheetType: type });
}

/**
 * Handle going back to type selection from capture
 */
function handleBackToTypeSelection() {
  transition('select-type', { sheetType: null, capturedImage: null });
}

/**
 * Handle starting over from any state
 */
function handleStartOver() {
  transition('select-type', { capturedImage: null, sheetType: null, ocrResult: null });
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
    <div id="content-container"></div>
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
