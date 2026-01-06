/**
 * CameraGuide Component
 *
 * Provides a visual overlay guide for framing scoresheets when capturing images.
 * Displays corner markers and alignment guides to help users position correctly.
 *
 * Supports two aspect ratios based on scoresheet type:
 * - Electronic (4:5 portrait): For player list table capture from screenshots
 * - Manuscript (7:5 landscape): For full physical scoresheet capture
 */

/**
 * Aspect ratio for electronic scoresheet player list (width:height)
 * 4:5 portrait format matches Swiss volleyball scoresheet tables
 */
export const TABLE_ASPECT_RATIO = 4 / 5;

/**
 * Aspect ratio for manuscript scoresheet (width:height)
 * 7:5 landscape format matches A4 paper scoresheets
 */
export const MANUSCRIPT_ASPECT_RATIO = 7 / 5;

/** Padding from container edge in pixels */
const FRAME_PADDING_PX = 24;

/** Frame size as ratio of available height when container is wider */
const FRAME_HEIGHT_RATIO = 0.7;

/** Frame size as ratio of available width when container is taller */
const FRAME_WIDTH_RATIO = 0.85;

/**
 * @typedef {'electronic' | 'manuscript'} SheetType
 */

/**
 * @typedef {Object} CameraGuideOptions
 * @property {HTMLElement} container - Container element to render into
 * @property {SheetType} [sheetType='electronic'] - Type of scoresheet (affects aspect ratio)
 */

export class CameraGuide {
  /** @type {HTMLElement} */
  #container;

  /** @type {number} */
  #aspectRatio;

  /** @type {string} */
  #labelText;

  /** @type {HTMLElement | null} */
  #guideElement = null;

  /**
   * @param {CameraGuideOptions} options
   */
  constructor({ container, sheetType = 'electronic' }) {
    this.#container = container;
    this.#aspectRatio = sheetType === 'manuscript' ? MANUSCRIPT_ASPECT_RATIO : TABLE_ASPECT_RATIO;
    this.#labelText = sheetType === 'manuscript' ? 'Align full scoresheet here' : 'Align player list here';
    this.#render();
    this.#updateGuideSize();

    // Update guide size on window resize
    window.addEventListener('resize', this.#handleResize);
  }

  /**
   * Get the current aspect ratio
   * @returns {number}
   */
  getAspectRatio() {
    return this.#aspectRatio;
  }

  #render() {
    this.#guideElement = document.createElement('div');
    this.#guideElement.className = 'camera-guide';
    this.#guideElement.innerHTML = `
      <div class="camera-guide__overlay">
        <div class="camera-guide__frame">
          <div class="camera-guide__corner camera-guide__corner--tl"></div>
          <div class="camera-guide__corner camera-guide__corner--tr"></div>
          <div class="camera-guide__corner camera-guide__corner--bl"></div>
          <div class="camera-guide__corner camera-guide__corner--br"></div>
          <div class="camera-guide__label">
            <span>${this.#labelText}</span>
          </div>
        </div>
      </div>
    `;

    this.#container.appendChild(this.#guideElement);
  }

  /** @type {() => void} */
  #handleResize = () => {
    this.#updateGuideSize();
  };

  /**
   * Update the guide frame size to maintain the correct aspect ratio
   * while fitting within the container
   */
  #updateGuideSize() {
    const frame = this.#guideElement?.querySelector('.camera-guide__frame');
    if (!frame || !(frame instanceof HTMLElement)) {
      return;
    }

    const containerRect = this.#container.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;

    // Calculate frame dimensions to fit within container with padding
    const availableWidth = containerWidth - FRAME_PADDING_PX * 2;
    const availableHeight = containerHeight - FRAME_PADDING_PX * 2;

    let frameWidth, frameHeight;

    // Determine dimensions based on available space while maintaining aspect ratio
    if (availableWidth / availableHeight > this.#aspectRatio) {
      // Container is wider than needed - constrain by height
      frameHeight = availableHeight * FRAME_HEIGHT_RATIO;
      frameWidth = frameHeight * this.#aspectRatio;
    } else {
      // Container is taller than needed - constrain by width
      frameWidth = availableWidth * FRAME_WIDTH_RATIO;
      frameHeight = frameWidth / this.#aspectRatio;
    }

    frame.style.width = `${frameWidth}px`;
    frame.style.height = `${frameHeight}px`;
  }

  /**
   * Show or hide the guide
   * @param {boolean} visible
   */
  setVisible(visible) {
    if (this.#guideElement) {
      this.#guideElement.style.display = visible ? 'block' : 'none';
    }
  }

  destroy() {
    window.removeEventListener('resize', this.#handleResize);
    if (this.#guideElement) {
      this.#guideElement.remove();
      this.#guideElement = null;
    }
  }
}
