/**
 * CameraGuide Component
 *
 * Provides a visual overlay guide for framing the players and officials
 * table when capturing images. Displays corner markers and alignment
 * guides to help users position the scoresheet correctly.
 *
 * The guide uses a 4:5 portrait aspect ratio which matches the typical
 * player list table format on Swiss volleyball scoresheets (player lists
 * for both teams, libero section, and official members combined).
 */

/**
 * Aspect ratio for the player/officials table (width:height)
 * 4:5 portrait format matches Swiss volleyball scoresheet tables
 * Based on actual scoresheet dimensions showing player lists,
 * liberos, and official members sections combined.
 */
export const TABLE_ASPECT_RATIO = 4 / 5;

/**
 * @typedef {Object} CameraGuideOptions
 * @property {HTMLElement} container - Container element to render into
 */

export class CameraGuide {
  /** @type {HTMLElement} */
  #container;

  /** @type {HTMLElement | null} */
  #guideElement = null;

  /**
   * @param {CameraGuideOptions} options
   */
  constructor({ container }) {
    this.#container = container;
    this.#render();
    this.#updateGuideSize();

    // Update guide size on window resize
    this.#handleResize = this.#handleResize.bind(this);
    window.addEventListener('resize', this.#handleResize);
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
            <span>Align player list here</span>
          </div>
        </div>
      </div>
    `;

    this.#container.appendChild(this.#guideElement);
  }

  #handleResize() {
    this.#updateGuideSize();
  }

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
    const padding = 24; // pixels from edge
    const availableWidth = containerWidth - padding * 2;
    const availableHeight = containerHeight - padding * 2;

    let frameWidth, frameHeight;

    // Determine dimensions based on available space while maintaining aspect ratio
    if (availableWidth / availableHeight > TABLE_ASPECT_RATIO) {
      // Container is wider than needed - constrain by height
      frameHeight = availableHeight * 0.7; // 70% of available height
      frameWidth = frameHeight * TABLE_ASPECT_RATIO;
    } else {
      // Container is taller than needed - constrain by width
      frameWidth = availableWidth * 0.85; // 85% of available width
      frameHeight = frameWidth / TABLE_ASPECT_RATIO;
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
