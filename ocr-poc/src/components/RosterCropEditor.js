/**
 * RosterCropEditor Component
 *
 * Specialized image editor for cropping the roster section from manuscript scoresheets.
 * Provides preset crop regions based on standard FIVB scoresheet layout:
 * - Roster section is in the upper ~35-40% of the sheet
 * - Team A on the left side, Team B on the right side
 *
 * Users can fine-tune the suggested crop region before OCR processing.
 */

/** JPEG quality for cropped output */
const JPEG_QUALITY = 0.92;

/**
 * Preset crop regions as percentages of the full scoresheet image.
 * Based on Swiss volleyball manuscript scoresheet layout.
 *
 * The roster section is located in the BOTTOM RIGHT portion of the sheet,
 * with Team A and Team B rosters stacked or side by side.
 */
const ROSTER_PRESETS = {
  /** Both teams' roster - bottom right area */
  both: {
    x: 0.50,      // 50% from left (right half of sheet)
    y: 0.55,      // 55% from top (bottom portion)
    width: 0.48,  // 48% width
    height: 0.42, // 42% height (both rosters)
    label: 'Both Teams',
    aspectRatio: 1.15, // Slightly wider than tall
  },
  /** Team A (Home) roster - upper part of roster section */
  teamA: {
    x: 0.50,      // 50% from left
    y: 0.55,      // 55% from top
    width: 0.48,  // 48% width
    height: 0.20, // 20% height (single team)
    label: 'Team A (Home)',
    aspectRatio: 2.4,
  },
  /** Team B (Away) roster - lower part of roster section */
  teamB: {
    x: 0.50,      // 50% from left
    y: 0.76,      // 76% from top (below Team A)
    width: 0.48,  // 48% width
    height: 0.20, // 20% height (single team)
    label: 'Team B (Away)',
    aspectRatio: 2.4,
  },
};

/**
 * @typedef {'both' | 'teamA' | 'teamB'} RosterPreset
 */

/**
 * @typedef {Object} RosterCropEditorOptions
 * @property {HTMLElement} container - Container element to render into
 * @property {Blob} imageBlob - The full scoresheet image to crop
 * @property {RosterPreset} [initialPreset='both'] - Which preset to start with
 * @property {(croppedBlob: Blob, preset: RosterPreset) => void} onConfirm - Callback when crop is confirmed
 * @property {() => void} onCancel - Callback when editing is cancelled
 */

export class RosterCropEditor {
  /** @type {HTMLElement} */
  #container;

  /** @type {Blob} */
  #imageBlob;

  /** @type {RosterPreset} */
  #currentPreset;

  /** @type {(croppedBlob: Blob, preset: RosterPreset) => void} */
  #onConfirm;

  /** @type {() => void} */
  #onCancel;

  /** @type {HTMLImageElement | null} */
  #imageElement = null;

  /** @type {string | null} */
  #imageUrl = null;

  /** @type {{ width: number, height: number }} */
  #imageNaturalSize = { width: 0, height: 0 };

  /** @type {{ width: number, height: number }} */
  #containerSize = { width: 0, height: 0 };

  /** @type {{ x: number, y: number, width: number, height: number }} */
  #cropRegion = { x: 0, y: 0, width: 0, height: 0 };

  /** @type {boolean} */
  #isDragging = false;

  /** @type {'move' | 'resize-tl' | 'resize-tr' | 'resize-bl' | 'resize-br' | null} */
  #dragMode = null;

  /** @type {{ x: number, y: number }} */
  #dragStart = { x: 0, y: 0 };

  /** @type {{ x: number, y: number, width: number, height: number }} */
  #cropStartRegion = { x: 0, y: 0, width: 0, height: 0 };

  /** Minimum crop size in pixels */
  static MIN_CROP_SIZE = 50;

  /**
   * @param {RosterCropEditorOptions} options
   */
  constructor({ container, imageBlob, initialPreset = 'both', onConfirm, onCancel }) {
    this.#container = container;
    this.#imageBlob = imageBlob;
    this.#currentPreset = initialPreset;
    this.#onConfirm = onConfirm;
    this.#onCancel = onCancel;

    this.#imageUrl = URL.createObjectURL(imageBlob);
    this.#render();
    this.#loadImage();

    window.addEventListener('resize', this.#handleResize);
  }

  #render() {
    this.#container.innerHTML = `
      <div class="roster-crop-editor" role="dialog" aria-modal="true" aria-label="Roster crop editor">
        <div class="roster-crop-editor__header">
          <h3 class="roster-crop-editor__title">Select Roster Area</h3>
          <p class="roster-crop-editor__hint">Adjust the selection to include only the player roster</p>
        </div>

        <div class="roster-crop-editor__presets" role="tablist" aria-label="Roster preset selection">
          <button
            type="button"
            class="roster-crop-editor__preset-btn"
            data-preset="both"
            role="tab"
            aria-selected="true"
          >
            Both Teams
          </button>
          <button
            type="button"
            class="roster-crop-editor__preset-btn"
            data-preset="teamA"
            role="tab"
            aria-selected="false"
          >
            Team A
          </button>
          <button
            type="button"
            class="roster-crop-editor__preset-btn"
            data-preset="teamB"
            role="tab"
            aria-selected="false"
          >
            Team B
          </button>
        </div>

        <div class="roster-crop-editor__viewport" id="crop-viewport">
          <img
            class="roster-crop-editor__image"
            id="crop-image"
            alt="Scoresheet to crop"
            draggable="false"
          />
          <div class="roster-crop-editor__overlay">
            <div class="roster-crop-editor__crop-area" id="crop-area">
              <div class="roster-crop-editor__handle roster-crop-editor__handle--tl" data-handle="resize-tl"></div>
              <div class="roster-crop-editor__handle roster-crop-editor__handle--tr" data-handle="resize-tr"></div>
              <div class="roster-crop-editor__handle roster-crop-editor__handle--bl" data-handle="resize-bl"></div>
              <div class="roster-crop-editor__handle roster-crop-editor__handle--br" data-handle="resize-br"></div>
            </div>
          </div>
        </div>

        <div class="roster-crop-editor__controls">
          <button
            type="button"
            class="btn btn-secondary roster-crop-editor__btn"
            id="btn-crop-cancel"
            aria-label="Cancel cropping"
          >
            Cancel
          </button>
          <button
            type="button"
            class="btn btn-primary roster-crop-editor__btn"
            id="btn-crop-confirm"
            aria-label="Confirm crop and continue to OCR"
          >
            Crop & Run OCR
          </button>
        </div>
      </div>
    `;

    this.#bindEvents();
    this.#updatePresetButtons();
  }

  #bindEvents() {
    const cropArea = this.#container.querySelector('#crop-area');
    const cancelBtn = this.#container.querySelector('#btn-crop-cancel');
    const confirmBtn = this.#container.querySelector('#btn-crop-confirm');
    const presetBtns = this.#container.querySelectorAll('.roster-crop-editor__preset-btn');

    // Preset selection
    presetBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const preset = /** @type {RosterPreset} */ (btn.getAttribute('data-preset'));
        if (preset) {
          this.#selectPreset(preset);
        }
      });
    });

    // Drag to move crop area
    cropArea?.addEventListener('mousedown', (e) => this.#handleMouseDown(e, 'move'));
    cropArea?.addEventListener('touchstart', (e) => this.#handleTouchStart(e, 'move'), { passive: false });

    // Handle resize handles
    const handles = this.#container.querySelectorAll('.roster-crop-editor__handle');
    handles.forEach((handle) => {
      const mode = /** @type {'resize-tl' | 'resize-tr' | 'resize-bl' | 'resize-br'} */ (
        handle.getAttribute('data-handle')
      );
      handle.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        this.#handleMouseDown(e, mode);
      });
      handle.addEventListener('touchstart', (e) => {
        e.stopPropagation();
        this.#handleTouchStart(e, mode);
      }, { passive: false });
    });

    // Global mouse/touch move and up
    document.addEventListener('mousemove', this.#handleMouseMove);
    document.addEventListener('mouseup', this.#handleMouseUp);
    document.addEventListener('touchmove', this.#handleTouchMove, { passive: false });
    document.addEventListener('touchend', this.#handleTouchEnd);

    // Control buttons
    cancelBtn?.addEventListener('click', () => this.#onCancel());
    confirmBtn?.addEventListener('click', () => this.#cropAndConfirm());
  }

  async #loadImage() {
    this.#imageElement = this.#container.querySelector('#crop-image');
    if (!this.#imageElement) {
      return;
    }

    this.#imageElement.src = this.#imageUrl || '';

    if (!this.#imageElement.complete) {
      await new Promise((resolve) => {
        this.#imageElement?.addEventListener('load', resolve, { once: true });
      });
    }

    this.#imageNaturalSize = {
      width: this.#imageElement.naturalWidth,
      height: this.#imageElement.naturalHeight,
    };

    this.#calculateSizes();
    this.#applyPreset(this.#currentPreset);
  }

  #calculateSizes() {
    const viewport = this.#container.querySelector('#crop-viewport');
    if (!viewport) {
      return;
    }

    const rect = viewport.getBoundingClientRect();
    this.#containerSize = { width: rect.width, height: rect.height };
  }

  /**
   * Get the scale factor from natural image size to displayed size
   * @returns {number}
   */
  #getDisplayScale() {
    if (!this.#imageElement) {
      return 1;
    }
    return this.#imageElement.clientWidth / this.#imageNaturalSize.width;
  }

  /**
   * Apply a preset crop region
   * @param {RosterPreset} preset
   */
  #applyPreset(preset) {
    const presetConfig = ROSTER_PRESETS[preset];
    const scale = this.#getDisplayScale();

    // Convert percentage-based preset to pixel coordinates
    this.#cropRegion = {
      x: presetConfig.x * this.#imageNaturalSize.width * scale,
      y: presetConfig.y * this.#imageNaturalSize.height * scale,
      width: presetConfig.width * this.#imageNaturalSize.width * scale,
      height: presetConfig.height * this.#imageNaturalSize.height * scale,
    };

    this.#updateCropAreaDisplay();
  }

  /**
   * Select a preset and update UI
   * @param {RosterPreset} preset
   */
  #selectPreset(preset) {
    this.#currentPreset = preset;
    this.#updatePresetButtons();
    this.#applyPreset(preset);
  }

  #updatePresetButtons() {
    const buttons = this.#container.querySelectorAll('.roster-crop-editor__preset-btn');
    buttons.forEach((btn) => {
      const preset = btn.getAttribute('data-preset');
      const isSelected = preset === this.#currentPreset;
      btn.classList.toggle('roster-crop-editor__preset-btn--active', isSelected);
      btn.setAttribute('aria-selected', String(isSelected));
    });
  }

  #updateCropAreaDisplay() {
    const cropArea = this.#container.querySelector('#crop-area');
    if (!(cropArea instanceof HTMLElement)) {
      return;
    }

    cropArea.style.left = `${this.#cropRegion.x}px`;
    cropArea.style.top = `${this.#cropRegion.y}px`;
    cropArea.style.width = `${this.#cropRegion.width}px`;
    cropArea.style.height = `${this.#cropRegion.height}px`;
  }

  /**
   * @param {MouseEvent} e
   * @param {'move' | 'resize-tl' | 'resize-tr' | 'resize-bl' | 'resize-br'} mode
   */
  #handleMouseDown(e, mode) {
    e.preventDefault();
    this.#startDrag(e.clientX, e.clientY, mode);
  }

  /**
   * @param {TouchEvent} e
   * @param {'move' | 'resize-tl' | 'resize-tr' | 'resize-bl' | 'resize-br'} mode
   */
  #handleTouchStart(e, mode) {
    e.preventDefault();
    if (e.touches.length === 1) {
      this.#startDrag(e.touches[0].clientX, e.touches[0].clientY, mode);
    }
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {'move' | 'resize-tl' | 'resize-tr' | 'resize-bl' | 'resize-br'} mode
   */
  #startDrag(x, y, mode) {
    this.#isDragging = true;
    this.#dragMode = mode;
    this.#dragStart = { x, y };
    this.#cropStartRegion = { ...this.#cropRegion };
  }

  /** @type {(e: MouseEvent) => void} */
  #handleMouseMove = (e) => {
    if (this.#isDragging) {
      this.#updateDrag(e.clientX, e.clientY);
    }
  };

  /** @type {(e: TouchEvent) => void} */
  #handleTouchMove = (e) => {
    if (this.#isDragging && e.touches.length === 1) {
      e.preventDefault();
      this.#updateDrag(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  /**
   * @param {number} x
   * @param {number} y
   */
  #updateDrag(x, y) {
    const deltaX = x - this.#dragStart.x;
    const deltaY = y - this.#dragStart.y;
    const scale = this.#getDisplayScale();
    const maxX = this.#imageNaturalSize.width * scale;
    const maxY = this.#imageNaturalSize.height * scale;

    if (this.#dragMode === 'move') {
      // Move the entire crop area
      let newX = this.#cropStartRegion.x + deltaX;
      let newY = this.#cropStartRegion.y + deltaY;

      // Constrain to image bounds
      newX = Math.max(0, Math.min(maxX - this.#cropRegion.width, newX));
      newY = Math.max(0, Math.min(maxY - this.#cropRegion.height, newY));

      this.#cropRegion.x = newX;
      this.#cropRegion.y = newY;
    } else if (this.#dragMode) {
      // Resize from a corner
      this.#resizeFromCorner(deltaX, deltaY, maxX, maxY);
    }

    this.#updateCropAreaDisplay();
  }

  /**
   * @param {number} deltaX
   * @param {number} deltaY
   * @param {number} maxX
   * @param {number} maxY
   */
  #resizeFromCorner(deltaX, deltaY, maxX, maxY) {
    const minSize = RosterCropEditor.MIN_CROP_SIZE;
    let { x, y, width, height } = this.#cropStartRegion;

    switch (this.#dragMode) {
      case 'resize-tl':
        x = Math.max(0, Math.min(x + width - minSize, x + deltaX));
        y = Math.max(0, Math.min(y + height - minSize, y + deltaY));
        width = this.#cropStartRegion.x + this.#cropStartRegion.width - x;
        height = this.#cropStartRegion.y + this.#cropStartRegion.height - y;
        break;
      case 'resize-tr':
        y = Math.max(0, Math.min(y + height - minSize, y + deltaY));
        width = Math.max(minSize, Math.min(maxX - x, this.#cropStartRegion.width + deltaX));
        height = this.#cropStartRegion.y + this.#cropStartRegion.height - y;
        break;
      case 'resize-bl':
        x = Math.max(0, Math.min(x + width - minSize, x + deltaX));
        width = this.#cropStartRegion.x + this.#cropStartRegion.width - x;
        height = Math.max(minSize, Math.min(maxY - y, this.#cropStartRegion.height + deltaY));
        break;
      case 'resize-br':
        width = Math.max(minSize, Math.min(maxX - x, this.#cropStartRegion.width + deltaX));
        height = Math.max(minSize, Math.min(maxY - y, this.#cropStartRegion.height + deltaY));
        break;
    }

    this.#cropRegion = { x, y, width, height };
  }

  /** @type {() => void} */
  #handleMouseUp = () => {
    this.#isDragging = false;
    this.#dragMode = null;
  };

  /** @type {() => void} */
  #handleTouchEnd = () => {
    this.#isDragging = false;
    this.#dragMode = null;
  };

  /** @type {() => void} */
  #handleResize = () => {
    this.#calculateSizes();
    this.#applyPreset(this.#currentPreset);
  };

  async #cropAndConfirm() {
    if (!this.#imageElement) {
      return;
    }

    const scale = this.#getDisplayScale();

    // Convert display coordinates to natural image coordinates
    const cropX = this.#cropRegion.x / scale;
    const cropY = this.#cropRegion.y / scale;
    const cropWidth = this.#cropRegion.width / scale;
    const cropHeight = this.#cropRegion.height / scale;

    // Create canvas and draw cropped region
    const canvas = document.createElement('canvas');
    canvas.width = cropWidth;
    canvas.height = cropHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Could not get canvas context');
      return;
    }

    ctx.drawImage(
      this.#imageElement,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      cropWidth,
      cropHeight
    );

    // Convert to blob
    canvas.toBlob(
      (blob) => {
        if (blob) {
          this.#onConfirm(blob, this.#currentPreset);
        }
      },
      'image/jpeg',
      JPEG_QUALITY
    );
  }

  destroy() {
    window.removeEventListener('resize', this.#handleResize);
    document.removeEventListener('mousemove', this.#handleMouseMove);
    document.removeEventListener('mouseup', this.#handleMouseUp);
    document.removeEventListener('touchmove', this.#handleTouchMove);
    document.removeEventListener('touchend', this.#handleTouchEnd);

    if (this.#imageUrl) {
      URL.revokeObjectURL(this.#imageUrl);
      this.#imageUrl = null;
    }
    this.#container.innerHTML = '';
  }
}
