/**
 * OCRProgress Component
 *
 * Displays OCR processing status with:
 * - Loading spinner animation
 * - Status message from OCR engine
 * - Progress bar (0-100%)
 */

/**
 * @typedef {Object} OCRProgressOptions
 * @property {HTMLElement} container - Container element to render into
 * @property {() => void} [onCancel] - Optional callback when cancel is clicked
 */

export class OCRProgress {
  /** @type {HTMLElement} */
  #container;

  /** @type {(() => void) | undefined} */
  #onCancel;

  /** @type {string} */
  #currentStatus = 'Initializing...';

  /** @type {number} */
  #currentProgress = 0;

  /**
   * @param {OCRProgressOptions} options
   */
  constructor({ container, onCancel }) {
    this.#container = container;
    this.#onCancel = onCancel;
    this.#render();
  }

  #render() {
    this.#container.innerHTML = `
      <div class="ocr-progress">
        <div class="ocr-progress__spinner" aria-hidden="true">
          <svg class="ocr-progress__spinner-svg" viewBox="0 0 50 50">
            <circle
              class="ocr-progress__spinner-circle"
              cx="25"
              cy="25"
              r="20"
              fill="none"
              stroke-width="4"
            />
          </svg>
        </div>

        <div class="ocr-progress__content">
          <p class="ocr-progress__status" id="ocr-status" role="status" aria-live="polite">
            ${this.#currentStatus}
          </p>

          <div class="ocr-progress__bar-container">
            <div
              class="ocr-progress__bar"
              id="ocr-progress-bar"
              role="progressbar"
              aria-valuenow="${this.#currentProgress}"
              aria-valuemin="0"
              aria-valuemax="100"
              style="width: ${this.#currentProgress}%"
            ></div>
          </div>

          <p class="ocr-progress__percentage" id="ocr-percentage">
            ${this.#currentProgress}%
          </p>
        </div>

        ${
          this.#onCancel
            ? `
          <button
            type="button"
            class="btn btn-secondary ocr-progress__cancel"
            id="btn-cancel-ocr"
            aria-label="Cancel OCR processing"
          >
            Cancel
          </button>
        `
            : ''
        }
      </div>
    `;

    this.#bindEvents();
  }

  #bindEvents() {
    if (this.#onCancel) {
      const cancelBtn = this.#container.querySelector('#btn-cancel-ocr');
      cancelBtn?.addEventListener('click', () => this.#onCancel?.());
    }
  }

  /**
   * Update the progress display
   * @param {Object} progress
   * @param {string} progress.status - Status message
   * @param {number} progress.progress - Progress percentage (0-100)
   */
  updateProgress({ status, progress }) {
    this.#currentStatus = status;
    this.#currentProgress = progress;

    const statusEl = this.#container.querySelector('#ocr-status');
    const progressBar = this.#container.querySelector('#ocr-progress-bar');
    const percentageEl = this.#container.querySelector('#ocr-percentage');

    if (statusEl) {
      statusEl.textContent = status;
    }

    if (progressBar) {
      progressBar.style.width = `${progress}%`;
      progressBar.setAttribute('aria-valuenow', String(progress));
    }

    if (percentageEl) {
      percentageEl.textContent = `${progress}%`;
    }
  }

  /**
   * Show error state
   * @param {string} message - Error message to display
   */
  showError(message) {
    const spinner = this.#container.querySelector('.ocr-progress__spinner');
    if (spinner) {
      spinner.innerHTML = `
        <svg class="ocr-progress__error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
      `;
    }

    const statusEl = this.#container.querySelector('#ocr-status');
    if (statusEl) {
      statusEl.textContent = message;
      statusEl.classList.add('ocr-progress__status--error');
    }
  }

  destroy() {
    this.#container.innerHTML = '';
  }
}
