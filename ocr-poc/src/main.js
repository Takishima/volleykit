/**
 * Scoresheet Scanner - OCR PoC
 *
 * A proof-of-concept app for extracting player names from volleyball scoresheets.
 * This scaffold sets up the basic structure for:
 * - Photo capture of scoresheets
 * - OCR processing to extract text
 * - Comparison against reference player lists
 *
 * Note: Service worker registration is handled automatically by vite-plugin-pwa
 */

import './style.css';

/**
 * Initialize the application
 */
function init() {
  const app = document.getElementById('app');

  if (!app) {
    console.error('App container not found');
    return;
  }

  // Render initial scaffold UI
  app.innerHTML = `
    <div class="container">
      <div class="card">
        <h2 class="text-center mb-md">Welcome</h2>
        <p class="text-muted text-center mb-lg">
          This app will help you scan volleyball scoresheets and extract player information.
        </p>

        <div class="flex flex-col gap-md">
          <button class="btn btn-primary btn-block btn-lg" id="btn-capture" disabled aria-label="Capture Scoresheet - coming soon">
            Capture Scoresheet
          </button>
          <button class="btn btn-secondary btn-block" id="btn-reference" disabled aria-label="Load Reference List - coming soon">
            Load Reference List
          </button>
        </div>

        <p class="text-muted text-center mt-lg" style="font-size: var(--font-size-sm);">
          OCR functionality coming soon...
        </p>
      </div>
    </div>
  `;

  // Set up event listeners for future functionality
  const captureBtn = document.getElementById('btn-capture');
  const referenceBtn = document.getElementById('btn-reference');

  if (captureBtn) {
    captureBtn.addEventListener('click', handleCapture);
  }

  if (referenceBtn) {
    referenceBtn.addEventListener('click', handleLoadReference);
  }
}

/**
 * Handle scoresheet capture (placeholder)
 */
function handleCapture() {
  console.log('Capture functionality not yet implemented');
}

/**
 * Handle reference list loading (placeholder)
 */
function handleLoadReference() {
  console.log('Reference list loading not yet implemented');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
