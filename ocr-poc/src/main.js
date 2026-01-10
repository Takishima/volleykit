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
import { ParsedRosterDisplay } from './components/ParsedRosterDisplay.js';
import { RosterCropEditor } from './components/RosterCropEditor.js';

/* ==============================================
 * CONSTANTS
 * ============================================== */

/* ==============================================
 * APPLICATION STATE
 * ============================================== */

/**
 * @typedef {'select-type' | 'manuscript-options' | 'capture' | 'roster-crop' | 'processing' | 'results' | 'roster-display' | 'manuscript-complete'} AppState
 */

/**
 * @typedef {'full' | 'roster-only'} ManuscriptCaptureMode
 */

/**
 * @typedef {import('./services/ocr/StubOCR.js').OCRResult} OCRResult
 */

/**
 * @typedef {Object} AppContext
 * @property {AppState} state - Current application state
 * @property {Blob | null} capturedImage - The captured image blob
 * @property {'electronic' | 'manuscript' | null} sheetType - Selected sheet type
 * @property {ManuscriptCaptureMode | null} captureMode - How to capture manuscript (full or roster-only)
 * @property {OCRResult | null} ocrResult - OCR processing result
 */

/** @type {AppContext} */
const appContext = {
  state: 'select-type',
  capturedImage: null,
  sheetType: null,
  captureMode: null,
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

/** @type {ParsedRosterDisplay | null} */
let parsedRosterDisplay = null;

/** @type {RosterCropEditor | null} */
let rosterCropEditor = null;

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
    case 'roster-display':
      if (parsedRosterDisplay) {
        parsedRosterDisplay.destroy();
        parsedRosterDisplay = null;
      }
      break;
    case 'roster-crop':
      if (rosterCropEditor) {
        rosterCropEditor.destroy();
        rosterCropEditor = null;
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
    case 'manuscript-options':
      renderManuscriptOptionsState(contentContainer);
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
    case 'roster-display':
      renderRosterDisplayState(contentContainer);
      break;
    case 'roster-crop':
      renderRosterCropState(contentContainer);
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
    // Manuscript sheets go back to options, electronic sheets go back to type selection
    const backHandler = appContext.sheetType === 'manuscript'
      ? handleBackToManuscriptOptions
      : handleBackToTypeSelection;

    imageCapture = new ImageCapture({
      container: captureContainer,
      sheetType: appContext.sheetType,
      captureMode: appContext.captureMode,
      onCapture: handleImageCapture,
      onBack: backHandler,
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
 * Render the manuscript capture options state
 * User chooses between capturing full scoresheet or roster area only
 * @param {HTMLElement} container
 */
function renderManuscriptOptionsState(container) {
  container.innerHTML = `
    <div class="main-content">
      <div class="container">
        <div class="card">
          <h2 class="text-center mb-md">How would you like to capture?</h2>
          <p class="text-muted text-center mb-lg">
            Choose how to capture the handwritten roster
          </p>

          <div class="sheet-type-selector__options">
            <button
              type="button"
              class="sheet-type-selector__option"
              id="btn-capture-roster"
              aria-label="Capture roster area only"
            >
              <span class="sheet-type-selector__option-icon">📋</span>
              <span class="sheet-type-selector__option-label">Roster Only</span>
              <span class="sheet-type-selector__option-desc">
                Take a photo of just the player list area
              </span>
            </button>

            <button
              type="button"
              class="sheet-type-selector__option"
              id="btn-capture-full"
              aria-label="Capture full scoresheet"
            >
              <span class="sheet-type-selector__option-icon">📄</span>
              <span class="sheet-type-selector__option-label">Full Scoresheet</span>
              <span class="sheet-type-selector__option-desc">
                Take a photo of the entire sheet, then crop to roster
              </span>
            </button>
          </div>

          <button
            type="button"
            class="btn btn-secondary btn-block mt-lg"
            id="btn-back-to-type"
            aria-label="Go back to type selection"
          >
            ← Back
          </button>
        </div>
      </div>
    </div>
  `;

  // Bind buttons
  const rosterOnlyBtn = document.getElementById('btn-capture-roster');
  const fullSheetBtn = document.getElementById('btn-capture-full');
  const backBtn = document.getElementById('btn-back-to-type');

  rosterOnlyBtn?.addEventListener('click', () => handleManuscriptModeSelect('roster-only'));
  fullSheetBtn?.addEventListener('click', () => handleManuscriptModeSelect('full'));
  backBtn?.addEventListener('click', handleBackToTypeSelection);
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
            <button class="btn btn-primary btn-block" id="btn-view-roster">
              View Parsed Roster
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
  const viewRosterBtn = document.getElementById('btn-view-roster');
  viewRosterBtn?.addEventListener('click', handleViewRosterPressed);

  const newScanBtn = document.getElementById('btn-new-scan');
  newScanBtn?.addEventListener('click', handleStartOver);
}

/**
 * Render the parsed roster display state
 * @param {HTMLElement} container
 */
function renderRosterDisplayState(container) {
  container.innerHTML = `
    <div class="main-content">
      <div class="container">
        <div class="card">
          <h2 class="text-center mb-md">Parsed Roster</h2>
          <div id="roster-display-container"></div>
        </div>
      </div>
    </div>
  `;

  const rosterContainer = document.getElementById('roster-display-container');
  if (rosterContainer && appContext.ocrResult) {
    parsedRosterDisplay = new ParsedRosterDisplay({
      container: rosterContainer,
      ocrText: appContext.ocrResult.fullText,
      ocrResult: appContext.ocrResult,
      sheetType: appContext.sheetType || 'electronic',
      isManuscript: appContext.sheetType === 'manuscript',
      onBack: handleBackToResults,
    });
  }
}

/**
 * Render the roster crop state for manuscript scoresheets
 * @param {HTMLElement} container
 */
function renderRosterCropState(container) {
  container.innerHTML = `
    <div id="roster-crop-container"></div>
  `;

  const cropContainer = document.getElementById('roster-crop-container');
  if (cropContainer && appContext.capturedImage) {
    rosterCropEditor = new RosterCropEditor({
      container: cropContainer,
      imageBlob: appContext.capturedImage,
      initialPreset: 'both',
      onConfirm: handleRosterCropConfirm,
      onCancel: handleRosterCropCancel,
    });
  }
}

/**
 * Render the manuscript capture complete state (no OCR - fallback)
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

  // Route based on sheet type and capture mode
  if (appContext.sheetType === 'manuscript') {
    if (appContext.captureMode === 'roster-only') {
      // Roster-only mode: go directly to OCR processing
      transition('processing', { capturedImage: blob });
    } else {
      // Full sheet mode: go to roster crop step first
      transition('roster-crop', { capturedImage: blob });
    }
  } else {
    // Electronic sheets go directly to OCR processing
    transition('processing', { capturedImage: blob });
  }
}

/**
 * Handle sheet type selection (first step)
 * @param {'electronic' | 'manuscript'} type
 */
function handleSheetTypeSelect(type) {
  console.log('Sheet type selected:', type);

  if (type === 'manuscript') {
    // Manuscript sheets go to options screen first (roster-only vs full sheet)
    transition('manuscript-options', { sheetType: type });
  } else {
    // Electronic sheets go directly to capture
    transition('capture', { sheetType: type });
  }
}

/**
 * Handle manuscript capture mode selection
 * @param {ManuscriptCaptureMode} mode - 'full' or 'roster-only'
 */
function handleManuscriptModeSelect(mode) {
  console.log('Manuscript capture mode selected:', mode);
  transition('capture', { captureMode: mode });
}

/**
 * Handle going back to type selection from capture
 */
function handleBackToTypeSelection() {
  transition('select-type', { sheetType: null, capturedImage: null, captureMode: null });
}

/**
 * Handle going back to manuscript options from capture
 */
function handleBackToManuscriptOptions() {
  transition('manuscript-options', { capturedImage: null, captureMode: null });
}

/**
 * Handle starting over from any state
 */
function handleStartOver() {
  transition('select-type', { capturedImage: null, sheetType: null, captureMode: null, ocrResult: null });
}

/**
 * Handle view roster button press
 */
function handleViewRosterPressed() {
  transition('roster-display');
}

/**
 * Handle going back to results from roster display
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

/**
 * Handle roster crop confirmation - proceed to OCR processing
 * @param {Blob} croppedBlob - The cropped roster image
 * @param {string} preset - Which preset was used (both, teamA, teamB)
 */
function handleRosterCropConfirm(croppedBlob, preset) {
  console.log('Roster cropped:', preset);
  console.log('  Size:', (croppedBlob.size / 1024).toFixed(2), 'KB');

  // Use the cropped image for OCR processing
  transition('processing', { capturedImage: croppedBlob });
}

/**
 * Handle roster crop cancellation - go back to capture
 */
function handleRosterCropCancel() {
  transition('capture', { capturedImage: null });
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
