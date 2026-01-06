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

/** Debounce delay for resize handler in milliseconds */
const RESIZE_DEBOUNCE_MS = 100;

/** Keyboard step size for moving crop area in pixels */
const KEYBOARD_MOVE_STEP_PX = 10;

/** Keyboard step size for resizing crop area in pixels */
const KEYBOARD_RESIZE_STEP_PX = 10;

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

  /** @type {{ x: number, y: number }} */
  #imageOffset = { x: 0, y: 0 };

  /** @type {{ width: number, height: number }} */
  #displayedImageSize = { width: 0, height: 0 };

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

  /** @type {boolean} Flag to track if component has been destroyed */
  #isDestroyed = false;

  /** @type {number | null} Resize debounce timer */
  #resizeTimer = null;

  /** @type {Element | null} Element that had focus before modal opened */
  #previouslyFocusedElement = null;

  /**
   * @param {RosterCropEditorOptions} options
   */
  constructor({ container, imageBlob, initialPreset = 'both', onConfirm, onCancel }) {
    this.#container = container;
    this.#imageBlob = imageBlob;
    this.#currentPreset = initialPreset;
    this.#onConfirm = onConfirm;
    this.#onCancel = onCancel;

    // Store previously focused element to restore on close
    this.#previouslyFocusedElement = document.activeElement;

    this.#imageUrl = URL.createObjectURL(imageBlob);
    this.#render();
    this.#loadImage();
    this.#setupFocusTrap();

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
            <div
              class="roster-crop-editor__crop-area"
              id="crop-area"
              tabindex="0"
              role="application"
              aria-label="Crop area. Use arrow keys to move, Shift+arrow keys to resize."
            >
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

    // Keyboard controls for accessibility
    cropArea?.addEventListener('keydown', (e) => this.#handleKeyDown(e));

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
      await new Promise((resolve, reject) => {
        if (this.#isDestroyed) {
          reject(new Error('Component destroyed before image loaded'));
          return;
        }

        const handleLoad = () => {
          if (!this.#isDestroyed) {
            resolve(undefined);
          }
        };

        const handleError = () => {
          reject(new Error('Failed to load image'));
        };

        this.#imageElement?.addEventListener('load', handleLoad, { once: true });
        this.#imageElement?.addEventListener('error', handleError, { once: true });
      }).catch((error) => {
        // Component was destroyed or image failed to load - just log and return
        console.warn('Image load aborted:', error.message);
        return;
      });
    }

    // Check again in case component was destroyed during await
    if (this.#isDestroyed || !this.#imageElement) {
      return;
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

    // Calculate actual displayed image size and offset with object-fit: contain
    if (this.#imageNaturalSize.width > 0 && this.#imageNaturalSize.height > 0) {
      const containerAspect = this.#containerSize.width / this.#containerSize.height;
      const imageAspect = this.#imageNaturalSize.width / this.#imageNaturalSize.height;

      if (imageAspect > containerAspect) {
        // Image is wider than container - fit by width
        this.#displayedImageSize.width = this.#containerSize.width;
        this.#displayedImageSize.height = this.#containerSize.width / imageAspect;
        this.#imageOffset.x = 0;
        this.#imageOffset.y = (this.#containerSize.height - this.#displayedImageSize.height) / 2;
      } else {
        // Image is taller than container - fit by height
        this.#displayedImageSize.height = this.#containerSize.height;
        this.#displayedImageSize.width = this.#containerSize.height * imageAspect;
        this.#imageOffset.x = (this.#containerSize.width - this.#displayedImageSize.width) / 2;
        this.#imageOffset.y = 0;
      }
    }
  }

  /**
   * Get the scale factor from natural image size to displayed size
   * @returns {number}
   */
  #getDisplayScale() {
    if (this.#imageNaturalSize.width === 0) {
      return 1;
    }
    return this.#displayedImageSize.width / this.#imageNaturalSize.width;
  }

  /**
   * Apply a preset crop region
   * @param {RosterPreset} preset
   */
  #applyPreset(preset) {
    const presetConfig = ROSTER_PRESETS[preset];

    // Convert percentage-based preset to pixel coordinates relative to displayed image
    // Then add the image offset to get viewport coordinates
    this.#cropRegion = {
      x: this.#imageOffset.x + presetConfig.x * this.#displayedImageSize.width,
      y: this.#imageOffset.y + presetConfig.y * this.#displayedImageSize.height,
      width: presetConfig.width * this.#displayedImageSize.width,
      height: presetConfig.height * this.#displayedImageSize.height,
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

    // Calculate image bounds in viewport coordinates
    const minX = this.#imageOffset.x;
    const minY = this.#imageOffset.y;
    const maxX = this.#imageOffset.x + this.#displayedImageSize.width;
    const maxY = this.#imageOffset.y + this.#displayedImageSize.height;

    if (this.#dragMode === 'move') {
      // Move the entire crop area
      let newX = this.#cropStartRegion.x + deltaX;
      let newY = this.#cropStartRegion.y + deltaY;

      // Constrain to image bounds (accounting for offset)
      newX = Math.max(minX, Math.min(maxX - this.#cropRegion.width, newX));
      newY = Math.max(minY, Math.min(maxY - this.#cropRegion.height, newY));

      this.#cropRegion.x = newX;
      this.#cropRegion.y = newY;
    } else if (this.#dragMode) {
      // Resize from a corner
      this.#resizeFromCorner(deltaX, deltaY, minX, minY, maxX, maxY);
    }

    this.#updateCropAreaDisplay();
  }

  /**
   * @param {number} deltaX
   * @param {number} deltaY
   * @param {number} minX
   * @param {number} minY
   * @param {number} maxX
   * @param {number} maxY
   */
  #resizeFromCorner(deltaX, deltaY, minX, minY, maxX, maxY) {
    const minSize = RosterCropEditor.MIN_CROP_SIZE;
    let { x, y, width, height } = this.#cropStartRegion;

    switch (this.#dragMode) {
      case 'resize-tl':
        x = Math.max(minX, Math.min(x + width - minSize, x + deltaX));
        y = Math.max(minY, Math.min(y + height - minSize, y + deltaY));
        width = this.#cropStartRegion.x + this.#cropStartRegion.width - x;
        height = this.#cropStartRegion.y + this.#cropStartRegion.height - y;
        break;
      case 'resize-tr':
        y = Math.max(minY, Math.min(y + height - minSize, y + deltaY));
        width = Math.max(minSize, Math.min(maxX - x, this.#cropStartRegion.width + deltaX));
        height = this.#cropStartRegion.y + this.#cropStartRegion.height - y;
        break;
      case 'resize-bl':
        x = Math.max(minX, Math.min(x + width - minSize, x + deltaX));
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
    // Debounce resize to avoid excessive recalculations during orientation changes
    if (this.#resizeTimer !== null) {
      clearTimeout(this.#resizeTimer);
    }
    this.#resizeTimer = window.setTimeout(() => {
      this.#resizeTimer = null;
      if (!this.#isDestroyed) {
        this.#calculateSizes();
        this.#applyPreset(this.#currentPreset);
      }
    }, RESIZE_DEBOUNCE_MS);
  };

  /**
   * Handle keyboard navigation for accessibility
   * Arrow keys move the crop area, Shift+Arrow keys resize it
   * @param {KeyboardEvent} e
   */
  #handleKeyDown(e) {
    // Calculate image bounds in viewport coordinates
    const minX = this.#imageOffset.x;
    const minY = this.#imageOffset.y;
    const maxX = this.#imageOffset.x + this.#displayedImageSize.width;
    const maxY = this.#imageOffset.y + this.#displayedImageSize.height;
    const minSize = RosterCropEditor.MIN_CROP_SIZE;

    let handled = false;

    if (e.shiftKey) {
      // Shift + Arrow: Resize from bottom-right corner
      switch (e.key) {
        case 'ArrowLeft':
          this.#cropRegion.width = Math.max(minSize, this.#cropRegion.width - KEYBOARD_RESIZE_STEP_PX);
          handled = true;
          break;
        case 'ArrowRight':
          this.#cropRegion.width = Math.min(maxX - this.#cropRegion.x, this.#cropRegion.width + KEYBOARD_RESIZE_STEP_PX);
          handled = true;
          break;
        case 'ArrowUp':
          this.#cropRegion.height = Math.max(minSize, this.#cropRegion.height - KEYBOARD_RESIZE_STEP_PX);
          handled = true;
          break;
        case 'ArrowDown':
          this.#cropRegion.height = Math.min(maxY - this.#cropRegion.y, this.#cropRegion.height + KEYBOARD_RESIZE_STEP_PX);
          handled = true;
          break;
      }
    } else {
      // Arrow keys: Move the crop area
      switch (e.key) {
        case 'ArrowLeft':
          this.#cropRegion.x = Math.max(minX, this.#cropRegion.x - KEYBOARD_MOVE_STEP_PX);
          handled = true;
          break;
        case 'ArrowRight':
          this.#cropRegion.x = Math.min(maxX - this.#cropRegion.width, this.#cropRegion.x + KEYBOARD_MOVE_STEP_PX);
          handled = true;
          break;
        case 'ArrowUp':
          this.#cropRegion.y = Math.max(minY, this.#cropRegion.y - KEYBOARD_MOVE_STEP_PX);
          handled = true;
          break;
        case 'ArrowDown':
          this.#cropRegion.y = Math.min(maxY - this.#cropRegion.height, this.#cropRegion.y + KEYBOARD_MOVE_STEP_PX);
          handled = true;
          break;
      }
    }

    if (handled) {
      e.preventDefault();
      this.#updateCropAreaDisplay();
    }
  }

  /**
   * Show an error message to the user
   * @param {string} message
   */
  #showError(message) {
    const hint = this.#container.querySelector('.roster-crop-editor__hint');
    if (hint) {
      hint.textContent = message;
      hint.style.color = 'var(--color-danger-500)';
    }
  }

  /**
   * Get all focusable elements within the modal
   * @returns {HTMLElement[]}
   */
  #getFocusableElements() {
    const modal = this.#container.querySelector('.roster-crop-editor');
    if (!modal) {
      return [];
    }

    const focusableSelectors = [
      'button:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
    ].join(', ');

    return Array.from(modal.querySelectorAll(focusableSelectors));
  }

  /**
   * Set up focus trapping within the modal
   */
  #setupFocusTrap() {
    const modal = this.#container.querySelector('.roster-crop-editor');
    if (!modal) {
      return;
    }

    // Focus the first preset button when modal opens
    const firstFocusable = this.#getFocusableElements()[0];
    if (firstFocusable) {
      // Use setTimeout to ensure the element is rendered
      setTimeout(() => firstFocusable.focus(), 0);
    }

    // Add keydown listener for focus trapping
    modal.addEventListener('keydown', this.#handleFocusTrap);
  }

  /**
   * Handle Tab key to trap focus within the modal
   * @type {(e: KeyboardEvent) => void}
   */
  #handleFocusTrap = (e) => {
    if (e.key !== 'Tab') {
      return;
    }

    const focusableElements = this.#getFocusableElements();
    if (focusableElements.length === 0) {
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey) {
      // Shift+Tab: if on first element, wrap to last
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab: if on last element, wrap to first
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  };

  async #cropAndConfirm() {
    if (!this.#imageElement) {
      this.#showError('Image not loaded. Please try again.');
      return;
    }

    const scale = this.#getDisplayScale();

    // Convert viewport coordinates to natural image coordinates
    // First subtract the image offset to get coordinates relative to the displayed image
    const cropX = (this.#cropRegion.x - this.#imageOffset.x) / scale;
    const cropY = (this.#cropRegion.y - this.#imageOffset.y) / scale;
    const cropWidth = this.#cropRegion.width / scale;
    const cropHeight = this.#cropRegion.height / scale;

    // Create canvas and draw cropped region
    const canvas = document.createElement('canvas');
    canvas.width = cropWidth;
    canvas.height = cropHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Could not get canvas context');
      this.#showError('Failed to create crop canvas. Please try again.');
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
        } else {
          console.error('Failed to create image blob from canvas');
          this.#showError('Failed to crop image. Please try again.');
        }
      },
      'image/jpeg',
      JPEG_QUALITY
    );
  }

  destroy() {
    this.#isDestroyed = true;

    // Clear any pending resize timer
    if (this.#resizeTimer !== null) {
      clearTimeout(this.#resizeTimer);
      this.#resizeTimer = null;
    }

    // Remove focus trap listener
    const modal = this.#container.querySelector('.roster-crop-editor');
    if (modal) {
      modal.removeEventListener('keydown', this.#handleFocusTrap);
    }

    // Restore focus to previously focused element
    if (this.#previouslyFocusedElement instanceof HTMLElement) {
      this.#previouslyFocusedElement.focus();
    }

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
