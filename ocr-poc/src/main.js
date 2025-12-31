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
import { ImageCapture } from './components/ImageCapture.js';

/** @type {ImageCapture | null} */
let imageCapture = null;

/** @type {string | null} */
let currentPreviewUrl = null;

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
        <h2 class="text-center mb-md">Capture Scoresheet</h2>
        <p class="text-muted text-center mb-lg">
          Take a photo or upload an image of the scoresheet to extract player information.
        </p>

        <div id="image-capture-container"></div>

        <div id="preview-container" class="image-capture__preview mt-lg" hidden>
          <img id="preview-image" class="image-capture__thumbnail" alt="Captured scoresheet preview" />
          <span class="image-capture__preview-label">Captured image preview</span>
        </div>

        <div class="mt-lg">
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

  // Initialize ImageCapture component
  const captureContainer = document.getElementById('image-capture-container');
  if (captureContainer) {
    imageCapture = new ImageCapture({
      container: captureContainer,
      onCapture: handleImageCapture,
    });
  }

  // Set up event listeners for future functionality
  const referenceBtn = document.getElementById('btn-reference');
  if (referenceBtn) {
    referenceBtn.addEventListener('click', handleLoadReference);
  }
}

/**
 * Handle captured image
 * @param {Blob} blob - The captured image as a Blob
 */
function handleImageCapture(blob) {
  console.log('Image captured:', blob);
  console.log('  Type:', blob.type);
  console.log('  Size:', (blob.size / 1024).toFixed(2), 'KB');

  // Show thumbnail preview
  const previewContainer = document.getElementById('preview-container');
  const previewImage = document.getElementById('preview-image');

  if (previewContainer && previewImage) {
    // Revoke previous object URL to prevent memory leak
    if (currentPreviewUrl) {
      URL.revokeObjectURL(currentPreviewUrl);
    }

    currentPreviewUrl = URL.createObjectURL(blob);
    previewImage.src = currentPreviewUrl;
    previewContainer.removeAttribute('hidden');
  }
}

function handleLoadReference() {
  console.log('Reference list loading not yet implemented');
}

/** Clean up resources to prevent memory leaks */
function cleanup() {
  if (currentPreviewUrl) {
    URL.revokeObjectURL(currentPreviewUrl);
    currentPreviewUrl = null;
  }
  if (imageCapture) {
    imageCapture.destroy();
    imageCapture = null;
  }
}

// Clean up on page unload
window.addEventListener('pagehide', cleanup);

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
