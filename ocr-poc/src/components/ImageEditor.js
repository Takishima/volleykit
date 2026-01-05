/**
 * ImageEditor Component
 *
 * Provides zoom and pan functionality for uploaded images before OCR processing.
 * Allows users to frame the player/officials table correctly using:
 * - Pinch-to-zoom and drag-to-pan (touch devices)
 * - Scroll-to-zoom and drag-to-pan (desktop)
 *
 * Shows a crop frame overlay matching the 4:5 aspect ratio of the
 * scoresheet player list table.
 */

import { TABLE_ASPECT_RATIO } from './CameraGuide.js';

/** Minimum zoom level */
const MIN_ZOOM = 0.5;

/** Maximum zoom level */
const MAX_ZOOM = 4;

/** Zoom step for scroll wheel */
const ZOOM_STEP = 0.1;

/** JPEG quality for cropped output */
const JPEG_QUALITY = 0.92;

/**
 * @typedef {Object} ImageEditorOptions
 * @property {HTMLElement} container - Container element to render into
 * @property {Blob} imageBlob - The image to edit
 * @property {(croppedBlob: Blob) => void} onConfirm - Callback when crop is confirmed
 * @property {() => void} onCancel - Callback when editing is cancelled
 */

export class ImageEditor {
  /** @type {HTMLElement} */
  #container;

  /** @type {Blob} */
  #imageBlob;

  /** @type {(croppedBlob: Blob) => void} */
  #onConfirm;

  /** @type {() => void} */
  #onCancel;

  /** @type {HTMLImageElement | null} */
  #imageElement = null;

  /** @type {string | null} */
  #imageUrl = null;

  /** @type {number} */
  #zoom = 1;

  /** @type {number} */
  #panX = 0;

  /** @type {number} */
  #panY = 0;

  /** @type {boolean} */
  #isDragging = false;

  /** @type {number} */
  #lastX = 0;

  /** @type {number} */
  #lastY = 0;

  /** @type {number} */
  #lastPinchDistance = 0;

  /** @type {{ width: number, height: number }} */
  #frameSize = { width: 0, height: 0 };

  /** @type {{ width: number, height: number }} */
  #containerSize = { width: 0, height: 0 };

  /** @type {{ width: number, height: number }} */
  #imageNaturalSize = { width: 0, height: 0 };

  /**
   * @param {ImageEditorOptions} options
   */
  constructor({ container, imageBlob, onConfirm, onCancel }) {
    this.#container = container;
    this.#imageBlob = imageBlob;
    this.#onConfirm = onConfirm;
    this.#onCancel = onCancel;

    this.#imageUrl = URL.createObjectURL(imageBlob);
    this.#render();
    this.#loadImage();

    // Bind event handlers
    this.#handleResize = this.#handleResize.bind(this);
    window.addEventListener('resize', this.#handleResize);
  }

  #render() {
    this.#container.innerHTML = `
      <div class="image-editor">
        <div class="image-editor__viewport" id="editor-viewport">
          <img
            class="image-editor__image"
            id="editor-image"
            src="${this.#imageUrl}"
            alt="Image to crop"
            draggable="false"
          />
          <div class="image-editor__frame-overlay">
            <div class="image-editor__frame" id="editor-frame">
              <div class="image-editor__corner image-editor__corner--tl"></div>
              <div class="image-editor__corner image-editor__corner--tr"></div>
              <div class="image-editor__corner image-editor__corner--bl"></div>
              <div class="image-editor__corner image-editor__corner--br"></div>
            </div>
          </div>
        </div>
        <div class="image-editor__hint">
          <span>Pinch to zoom, drag to position</span>
        </div>
        <div class="image-editor__controls">
          <button
            type="button"
            class="btn btn-secondary image-editor__btn"
            id="btn-editor-cancel"
            aria-label="Cancel editing"
          >
            Cancel
          </button>
          <button
            type="button"
            class="btn btn-primary image-editor__btn"
            id="btn-editor-confirm"
            aria-label="Confirm crop"
          >
            Crop & Continue
          </button>
        </div>
      </div>
    `;

    this.#bindEvents();
  }

  #bindEvents() {
    const viewport = this.#container.querySelector('#editor-viewport');
    const cancelBtn = this.#container.querySelector('#btn-editor-cancel');
    const confirmBtn = this.#container.querySelector('#btn-editor-confirm');

    // Touch events for pinch/zoom and drag
    viewport?.addEventListener('touchstart', (e) => this.#handleTouchStart(e), { passive: false });
    viewport?.addEventListener('touchmove', (e) => this.#handleTouchMove(e), { passive: false });
    viewport?.addEventListener('touchend', (e) => this.#handleTouchEnd(e));

    // Mouse events for desktop
    viewport?.addEventListener('mousedown', (e) => this.#handleMouseDown(e));
    viewport?.addEventListener('mousemove', (e) => this.#handleMouseMove(e));
    viewport?.addEventListener('mouseup', () => this.#handleMouseUp());
    viewport?.addEventListener('mouseleave', () => this.#handleMouseUp());
    viewport?.addEventListener('wheel', (e) => this.#handleWheel(e), { passive: false });

    // Control buttons
    cancelBtn?.addEventListener('click', () => this.#onCancel());
    confirmBtn?.addEventListener('click', () => this.#cropAndConfirm());
  }

  async #loadImage() {
    this.#imageElement = this.#container.querySelector('#editor-image');
    if (!this.#imageElement) {
      return;
    }

    // Wait for image to load
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
    this.#centerImage();
    this.#updateTransform();
  }

  #calculateSizes() {
    const viewport = this.#container.querySelector('#editor-viewport');
    if (!viewport) {
      return;
    }

    const rect = viewport.getBoundingClientRect();
    this.#containerSize = { width: rect.width, height: rect.height };

    // Calculate frame size based on container and aspect ratio
    const padding = 24;
    const availableWidth = this.#containerSize.width - padding * 2;
    const availableHeight = this.#containerSize.height - padding * 2;

    if (availableWidth / availableHeight > TABLE_ASPECT_RATIO) {
      // Container is wider - constrain by height
      this.#frameSize.height = availableHeight * 0.85;
      this.#frameSize.width = this.#frameSize.height * TABLE_ASPECT_RATIO;
    } else {
      // Container is taller - constrain by width
      this.#frameSize.width = availableWidth * 0.85;
      this.#frameSize.height = this.#frameSize.width / TABLE_ASPECT_RATIO;
    }

    // Update frame element size
    const frame = this.#container.querySelector('#editor-frame');
    if (frame instanceof HTMLElement) {
      frame.style.width = `${this.#frameSize.width}px`;
      frame.style.height = `${this.#frameSize.height}px`;
    }
  }

  #centerImage() {
    if (!this.#imageElement) {
      return;
    }

    // Calculate initial zoom to fit image so it covers the frame
    const imageAspect = this.#imageNaturalSize.width / this.#imageNaturalSize.height;
    const frameAspect = this.#frameSize.width / this.#frameSize.height;

    let fitScale;
    if (imageAspect > frameAspect) {
      // Image is wider than frame - fit by height
      fitScale = this.#frameSize.height / this.#imageNaturalSize.height;
    } else {
      // Image is taller than frame - fit by width
      fitScale = this.#frameSize.width / this.#imageNaturalSize.width;
    }

    // Set initial zoom to fit
    this.#zoom = Math.max(fitScale, MIN_ZOOM);

    // Center the image
    this.#panX = 0;
    this.#panY = 0;
  }

  #updateTransform() {
    if (!this.#imageElement) {
      return;
    }

    // Constrain pan to keep frame filled
    this.#constrainPan();

    this.#imageElement.style.transform = `translate(${this.#panX}px, ${this.#panY}px) scale(${this.#zoom})`;
  }

  #constrainPan() {
    const scaledWidth = this.#imageNaturalSize.width * this.#zoom;
    const scaledHeight = this.#imageNaturalSize.height * this.#zoom;

    // Calculate how far the image can move while still covering the frame
    const maxPanX = Math.max(0, (scaledWidth - this.#frameSize.width) / 2);
    const maxPanY = Math.max(0, (scaledHeight - this.#frameSize.height) / 2);

    this.#panX = Math.max(-maxPanX, Math.min(maxPanX, this.#panX));
    this.#panY = Math.max(-maxPanY, Math.min(maxPanY, this.#panY));
  }

  #handleResize() {
    this.#calculateSizes();
    this.#centerImage();
    this.#updateTransform();
  }

  /** @param {TouchEvent} e */
  #handleTouchStart(e) {
    e.preventDefault();

    if (e.touches.length === 1) {
      // Single touch - start drag
      this.#isDragging = true;
      this.#lastX = e.touches[0].clientX;
      this.#lastY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
      // Two touches - start pinch
      this.#lastPinchDistance = this.#getPinchDistance(e.touches);
    }
  }

  /** @param {TouchEvent} e */
  #handleTouchMove(e) {
    e.preventDefault();

    if (e.touches.length === 1 && this.#isDragging) {
      // Single touch - drag
      const deltaX = e.touches[0].clientX - this.#lastX;
      const deltaY = e.touches[0].clientY - this.#lastY;

      this.#panX += deltaX;
      this.#panY += deltaY;

      this.#lastX = e.touches[0].clientX;
      this.#lastY = e.touches[0].clientY;

      this.#updateTransform();
    } else if (e.touches.length === 2) {
      // Two touches - pinch to zoom
      const distance = this.#getPinchDistance(e.touches);
      const scale = distance / this.#lastPinchDistance;

      const newZoom = this.#zoom * scale;
      this.#zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));

      this.#lastPinchDistance = distance;
      this.#updateTransform();
    }
  }

  /** @param {TouchEvent} _e */
  #handleTouchEnd(_e) {
    this.#isDragging = false;
    this.#lastPinchDistance = 0;
  }

  /**
   * @param {TouchList} touches
   * @returns {number}
   */
  #getPinchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /** @param {MouseEvent} e */
  #handleMouseDown(e) {
    this.#isDragging = true;
    this.#lastX = e.clientX;
    this.#lastY = e.clientY;
  }

  /** @param {MouseEvent} e */
  #handleMouseMove(e) {
    if (!this.#isDragging) {
      return;
    }

    const deltaX = e.clientX - this.#lastX;
    const deltaY = e.clientY - this.#lastY;

    this.#panX += deltaX;
    this.#panY += deltaY;

    this.#lastX = e.clientX;
    this.#lastY = e.clientY;

    this.#updateTransform();
  }

  #handleMouseUp() {
    this.#isDragging = false;
  }

  /** @param {WheelEvent} e */
  #handleWheel(e) {
    e.preventDefault();

    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    const newZoom = this.#zoom + delta;
    this.#zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));

    this.#updateTransform();
  }

  async #cropAndConfirm() {
    if (!this.#imageElement) {
      return;
    }

    // Calculate the crop region in image coordinates
    const scaledWidth = this.#imageNaturalSize.width * this.#zoom;
    const scaledHeight = this.#imageNaturalSize.height * this.#zoom;

    // The frame is centered, so calculate the offset
    const frameLeft = (scaledWidth - this.#frameSize.width) / 2 - this.#panX;
    const frameTop = (scaledHeight - this.#frameSize.height) / 2 - this.#panY;

    // Convert to natural image coordinates
    const cropX = frameLeft / this.#zoom;
    const cropY = frameTop / this.#zoom;
    const cropWidth = this.#frameSize.width / this.#zoom;
    const cropHeight = this.#frameSize.height / this.#zoom;

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
          this.#onConfirm(blob);
        }
      },
      'image/jpeg',
      JPEG_QUALITY
    );
  }

  destroy() {
    window.removeEventListener('resize', this.#handleResize);
    if (this.#imageUrl) {
      URL.revokeObjectURL(this.#imageUrl);
      this.#imageUrl = null;
    }
    this.#container.innerHTML = '';
  }
}
