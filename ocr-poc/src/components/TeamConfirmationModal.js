/**
 * Team Confirmation Modal Component
 *
 * A modal dialog that asks the user to confirm which team is on the left
 * and which is on the right when OCR team detection has low confidence.
 *
 * This is particularly useful for manuscript scoresheets where OCR
 * success rates may be lower.
 */

/**
 * @typedef {Object} TeamInfo
 * @property {string} name - Team name from OCR
 * @property {number} playerCount - Number of players detected
 */

/**
 * @typedef {Object} TeamConfirmationModalOptions
 * @property {HTMLElement} container - Container element for the modal
 * @property {TeamInfo} leftTeam - Team detected on the left side
 * @property {TeamInfo} rightTeam - Team detected on the right side
 * @property {number} confidenceScore - Confidence score (0-100) for the auto-mapping
 * @property {(swapped: boolean) => void} onConfirm - Called when user confirms
 * @property {() => void} [onCancel] - Called when user cancels
 */

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

/**
 * TeamConfirmationModal Component
 */
export class TeamConfirmationModal {
  /**
   * @param {TeamConfirmationModalOptions} options
   */
  constructor({ container, leftTeam, rightTeam, confidenceScore, onConfirm, onCancel }) {
    this.container = container;
    this.leftTeam = leftTeam;
    this.rightTeam = rightTeam;
    this.confidenceScore = confidenceScore;
    this.onConfirm = onConfirm;
    this.onCancel = onCancel;

    /** @type {boolean} */
    this.swapped = false;

    /** @type {HTMLElement | null} */
    this.backdropEl = null;

    /** @type {HTMLElement | null} */
    this.dialogEl = null;

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleBackdropClick = this.handleBackdropClick.bind(this);

    this.render();
    this.bindEvents();
  }

  render() {
    const leftName = escapeHtml(this.leftTeam.name || 'Unknown Team');
    const rightName = escapeHtml(this.rightTeam.name || 'Unknown Team');
    const leftCount = this.leftTeam.playerCount;
    const rightCount = this.rightTeam.playerCount;

    // Show warning based on confidence
    const confidenceWarning =
      this.confidenceScore < 50
        ? `<p class="team-confirm__warning">
            <span class="team-confirm__warning-icon">⚠</span>
            Low confidence in automatic team detection (${this.confidenceScore}%)
          </p>`
        : '';

    this.container.innerHTML = `
      <div class="team-confirm__backdrop" role="presentation">
        <div
          class="team-confirm__dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="team-confirm-title"
          aria-describedby="team-confirm-description"
        >
          <h2 id="team-confirm-title" class="team-confirm__title">
            Confirm Team Positions
          </h2>

          <p id="team-confirm-description" class="team-confirm__description">
            Please verify which team is on the left and right sides of the scoresheet.
          </p>

          ${confidenceWarning}

          <div class="team-confirm__teams" id="team-options">
            <div class="team-confirm__team-card team-confirm__team-card--left">
              <span class="team-confirm__team-label">Left Column (Team A)</span>
              <span class="team-confirm__team-name" id="left-team-name">${leftName}</span>
              <span class="team-confirm__team-count" id="left-team-count">${leftCount} players</span>
            </div>

            <button
              type="button"
              class="team-confirm__swap-btn"
              id="btn-swap-teams"
              aria-label="Swap teams"
              title="Swap team positions"
            >
              <svg class="team-confirm__swap-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M7 16V4M7 4L3 8M7 4L11 8"></path>
                <path d="M17 8V20M17 20L21 16M17 20L13 16"></path>
              </svg>
            </button>

            <div class="team-confirm__team-card team-confirm__team-card--right">
              <span class="team-confirm__team-label">Right Column (Team B)</span>
              <span class="team-confirm__team-name" id="right-team-name">${rightName}</span>
              <span class="team-confirm__team-count" id="right-team-count">${rightCount} players</span>
            </div>
          </div>

          <div class="team-confirm__actions">
            <button type="button" class="btn btn-secondary" id="btn-cancel">
              Cancel
            </button>
            <button type="button" class="btn btn-primary" id="btn-confirm">
              Confirm
            </button>
          </div>
        </div>
      </div>
    `;

    this.backdropEl = this.container.querySelector('.team-confirm__backdrop');
    this.dialogEl = this.container.querySelector('.team-confirm__dialog');

    // Focus the confirm button by default
    const confirmBtn = this.container.querySelector('#btn-confirm');
    confirmBtn?.focus();
  }

  bindEvents() {
    // Swap button
    const swapBtn = this.container.querySelector('#btn-swap-teams');
    swapBtn?.addEventListener('click', () => this.handleSwap());

    // Confirm button
    const confirmBtn = this.container.querySelector('#btn-confirm');
    confirmBtn?.addEventListener('click', () => this.handleConfirm());

    // Cancel button
    const cancelBtn = this.container.querySelector('#btn-cancel');
    cancelBtn?.addEventListener('click', () => this.handleCancel());

    // Keyboard events
    document.addEventListener('keydown', this.handleKeyDown);

    // Backdrop click
    this.backdropEl?.addEventListener('click', this.handleBackdropClick);
  }

  /**
   * Handle keyboard events
   * @param {KeyboardEvent} event
   */
  handleKeyDown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.handleCancel();
    }

    // Tab trapping
    if (event.key === 'Tab') {
      const focusableElements = this.dialogEl?.querySelectorAll(
        'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements && focusableElements.length > 0) {
        const firstEl = focusableElements[0];
        const lastEl = focusableElements[focusableElements.length - 1];

        if (event.shiftKey && document.activeElement === firstEl) {
          event.preventDefault();
          lastEl.focus();
        } else if (!event.shiftKey && document.activeElement === lastEl) {
          event.preventDefault();
          firstEl.focus();
        }
      }
    }
  }

  /**
   * Handle backdrop click (close modal)
   * @param {MouseEvent} event
   */
  handleBackdropClick(event) {
    // Only close if clicking directly on backdrop, not dialog
    if (event.target === this.backdropEl) {
      this.handleCancel();
    }
  }

  /**
   * Swap team positions
   */
  handleSwap() {
    this.swapped = !this.swapped;

    // Update the displayed names
    const leftNameEl = this.container.querySelector('#left-team-name');
    const rightNameEl = this.container.querySelector('#right-team-name');
    const leftCountEl = this.container.querySelector('#left-team-count');
    const rightCountEl = this.container.querySelector('#right-team-count');

    if (leftNameEl && rightNameEl && leftCountEl && rightCountEl) {
      const displayLeft = this.swapped ? this.rightTeam : this.leftTeam;
      const displayRight = this.swapped ? this.leftTeam : this.rightTeam;

      leftNameEl.textContent = displayLeft.name || 'Unknown Team';
      rightNameEl.textContent = displayRight.name || 'Unknown Team';
      leftCountEl.textContent = `${displayLeft.playerCount} players`;
      rightCountEl.textContent = `${displayRight.playerCount} players`;
    }

    // Animate the swap button
    const swapBtn = this.container.querySelector('#btn-swap-teams');
    swapBtn?.classList.add('team-confirm__swap-btn--animating');
    setTimeout(() => {
      swapBtn?.classList.remove('team-confirm__swap-btn--animating');
    }, 300);
  }

  /**
   * Handle confirm action
   */
  handleConfirm() {
    this.cleanup();
    this.onConfirm(this.swapped);
  }

  /**
   * Handle cancel action
   */
  handleCancel() {
    this.cleanup();
    this.onCancel?.();
  }

  /**
   * Clean up event listeners
   */
  cleanup() {
    document.removeEventListener('keydown', this.handleKeyDown);
    this.backdropEl?.removeEventListener('click', this.handleBackdropClick);
  }

  /**
   * Destroy the component
   */
  destroy() {
    this.cleanup();
    this.container.innerHTML = '';
  }
}
