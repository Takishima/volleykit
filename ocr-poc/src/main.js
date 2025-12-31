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

/* ==============================================
 * APPLICATION STATE
 * ============================================== */

/**
 * @typedef {'capture' | 'select-type' | 'processing'} AppState
 */

/**
 * @typedef {Object} AppContext
 * @property {AppState} state - Current application state
 * @property {Blob | null} capturedImage - The captured image blob
 * @property {'electronic' | 'handwritten' | null} sheetType - Selected sheet type
 */

/** @type {AppContext} */
const appContext = {
  state: 'capture',
  capturedImage: null,
  sheetType: null,
};

/* ==============================================
 * COMPONENT INSTANCES
 * ============================================== */

/** @type {ImageCapture | null} */
let imageCapture = null;

/** @type {SheetTypeSelector | null} */
let sheetTypeSelector = null;

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
      // Future: Clean up OCR processing
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
 * Render the processing state (placeholder for future OCR)
 * @param {HTMLElement} container
 */
function renderProcessingState(container) {
  container.innerHTML = `
    <h2 class="text-center mb-md">Processing...</h2>
    <p class="text-muted text-center mb-lg">
      OCR functionality coming soon. Selected type: <strong>${appContext.sheetType}</strong>
    </p>
    <div class="sheet-type-selector__preview">
      <img
        id="result-preview"
        class="sheet-type-selector__thumbnail"
        alt="Captured scoresheet"
      />
    </div>
    <div class="mt-lg">
      <button class="btn btn-secondary btn-block" id="btn-start-over">
        ← Start Over
      </button>
    </div>
  `;

  // Show the captured image
  const preview = document.getElementById('result-preview');
  if (preview && appContext.capturedImage) {
    preview.src = URL.createObjectURL(appContext.capturedImage);
  }

  // Bind start over button
  const startOverBtn = document.getElementById('btn-start-over');
  startOverBtn?.addEventListener('click', handleStartOver);
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
  // Revoke the captured image URL to prevent memory leak
  if (appContext.capturedImage) {
    // Note: The SheetTypeSelector component handles its own URL cleanup
  }

  transition('capture', { capturedImage: null, sheetType: null });
}

/**
 * Handle starting over from processing state
 */
function handleStartOver() {
  transition('capture', { capturedImage: null, sheetType: null });
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
