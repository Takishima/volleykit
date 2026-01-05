/**
 * ImageCapture Component
 *
 * Provides two methods for capturing images:
 * 1. Camera capture - Opens rear camera with live preview and alignment guide
 * 2. File upload - Accepts image files from device with zoom/pan editor
 *
 * Designed for mobile-first with large touch targets and
 * graceful degradation when camera is unavailable.
 */

import { CameraGuide } from './CameraGuide.js';
import { ImageEditor } from './ImageEditor.js';

/**
 * @typedef {Object} ImageCaptureOptions
 * @property {HTMLElement} container - Container element to render into
 * @property {(blob: Blob) => void} onCapture - Callback when image is captured
 */

/** How long to display the permission denied message */
const PERMISSION_MESSAGE_DISPLAY_MS = 5000;

/** JPEG quality for captured photos (0-1 scale) */
const JPEG_QUALITY = 0.92;

export class ImageCapture {
  /** @type {HTMLElement} */
  #container;

  /** @type {(blob: Blob) => void} */
  #onCapture;

  /** @type {MediaStream | null} */
  #stream = null;

  /** @type {HTMLVideoElement | null} */
  #videoElement = null;

  /** @type {boolean} */
  #isCameraActive = false;

  /** @type {boolean} */
  #cameraPermissionDenied = false;

  /** @type {CameraGuide | null} */
  #cameraGuide = null;

  /** @type {ImageEditor | null} */
  #imageEditor = null;

  /** @type {boolean} */
  #isEditorActive = false;

  /** 1920x1080 provides good OCR quality while being widely supported */
  static VIDEO_CONSTRAINTS = {
    facingMode: 'environment',
    width: { ideal: 1920 },
    height: { ideal: 1080 },
  };

  /**
   * @param {ImageCaptureOptions} options
   */
  constructor({ container, onCapture }) {
    this.#container = container;
    this.#onCapture = onCapture;
    this.#render();
  }

  #render() {
    this.#container.innerHTML = `
      <div class="image-capture">
        <div class="image-capture__buttons">
          <button
            type="button"
            class="btn btn-primary btn-lg image-capture__btn"
            id="btn-camera"
            aria-label="Open camera to capture image"
          >
            <svg class="image-capture__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
            <span>Use Camera</span>
          </button>
          <button
            type="button"
            class="btn btn-secondary btn-lg image-capture__btn"
            id="btn-upload"
            aria-label="Upload image from device"
          >
            <svg class="image-capture__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <span>Upload Image</span>
          </button>
        </div>

        <input
          type="file"
          id="file-input"
          class="image-capture__file-input"
          accept="image/*"
          aria-hidden="true"
        />

        <div id="camera-container" class="image-capture__camera" hidden>
          <div class="image-capture__video-wrapper">
            <video
              id="camera-preview"
              class="image-capture__video"
              autoplay
              playsinline
              muted
            ></video>
            <div id="camera-guide-container"></div>
          </div>
          <div class="image-capture__camera-controls">
            <button
              type="button"
              class="btn btn-secondary image-capture__btn"
              id="btn-cancel-camera"
              aria-label="Cancel camera capture"
            >
              Cancel
            </button>
            <button
              type="button"
              class="btn btn-primary image-capture__capture-btn"
              id="btn-take-photo"
              aria-label="Take photo"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/>
              </svg>
            </button>
            <div class="image-capture__spacer"></div>
          </div>
        </div>

        <div id="permission-message" class="image-capture__message" hidden>
          <svg class="image-capture__message-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p>Camera access was denied. Please use the upload button to select an image instead.</p>
        </div>

        <div id="editor-container" class="image-capture__editor" hidden></div>
      </div>
    `;

    this.#bindEvents();
  }

  #bindEvents() {
    const cameraBtn = this.#container.querySelector('#btn-camera');
    const uploadBtn = this.#container.querySelector('#btn-upload');
    const fileInput = this.#container.querySelector('#file-input');
    const cancelBtn = this.#container.querySelector('#btn-cancel-camera');
    const takePhotoBtn = this.#container.querySelector('#btn-take-photo');

    cameraBtn?.addEventListener('click', () => this.#openCamera());
    uploadBtn?.addEventListener('click', () => fileInput?.click());
    fileInput?.addEventListener('change', (e) => this.#handleFileSelect(e));
    cancelBtn?.addEventListener('click', () => this.#closeCamera());
    takePhotoBtn?.addEventListener('click', () => this.#capturePhoto());
  }

  async #openCamera() {
    if (this.#cameraPermissionDenied) {
      this.#showPermissionMessage();
      return;
    }

    try {
      this.#stream = await navigator.mediaDevices.getUserMedia({
        video: ImageCapture.VIDEO_CONSTRAINTS,
        audio: false,
      });

      const cameraContainer = this.#container.querySelector('#camera-container');
      const buttonsContainer = this.#container.querySelector('.image-capture__buttons');
      const guideContainer = this.#container.querySelector('#camera-guide-container');
      this.#videoElement = this.#container.querySelector('#camera-preview');

      if (this.#videoElement && this.#stream) {
        this.#videoElement.srcObject = this.#stream;
        await this.#videoElement.play();
      }

      // Initialize camera guide overlay
      if (guideContainer) {
        this.#cameraGuide = new CameraGuide({ container: guideContainer });
      }

      buttonsContainer?.setAttribute('hidden', '');
      cameraContainer?.removeAttribute('hidden');
      this.#isCameraActive = true;
    } catch (error) {
      console.error('Camera access error:', error);
      this.#handleCameraError(error);
    }
  }

  /** @param {Error} error */
  #handleCameraError(error) {
    if (
      error.name === 'NotAllowedError' ||
      error.name === 'PermissionDeniedError'
    ) {
      this.#cameraPermissionDenied = true;
      this.#showPermissionMessage();
    } else if (error.name === 'NotFoundError') {
      // No camera available
      this.#showPermissionMessage();
    } else {
      // Other errors - show message and fall back to upload
      this.#showPermissionMessage();
    }
  }

  #showPermissionMessage() {
    const message = this.#container.querySelector('#permission-message');
    message?.removeAttribute('hidden');

    setTimeout(() => {
      message?.setAttribute('hidden', '');
    }, PERMISSION_MESSAGE_DISPLAY_MS);
  }

  #closeCamera() {
    if (this.#stream) {
      this.#stream.getTracks().forEach((track) => track.stop());
      this.#stream = null;
    }

    if (this.#videoElement) {
      this.#videoElement.srcObject = null;
    }

    // Clean up camera guide
    if (this.#cameraGuide) {
      this.#cameraGuide.destroy();
      this.#cameraGuide = null;
    }

    const cameraContainer = this.#container.querySelector('#camera-container');
    const buttonsContainer = this.#container.querySelector('.image-capture__buttons');

    cameraContainer?.setAttribute('hidden', '');
    buttonsContainer?.removeAttribute('hidden');
    this.#isCameraActive = false;
  }

  async #capturePhoto() {
    if (!this.#videoElement || !this.#isCameraActive) {
      return;
    }

    const video = this.#videoElement;
    const canvas = document.createElement('canvas');

    // Use actual video dimensions for best quality
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Could not get canvas context');
      return;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          this.#closeCamera();
          this.#onCapture(blob);
        }
      },
      'image/jpeg',
      JPEG_QUALITY
    );
  }

  /** @param {Event} event */
  #handleFileSelect(event) {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || !input.files?.length) {
      return;
    }

    const file = input.files[0];

    // Validate it's an image
    if (!file.type.startsWith('image/')) {
      console.error('Selected file is not an image');
      return;
    }

    // Reset input so the same file can be selected again
    input.value = '';

    // Show the image editor for cropping
    this.#openEditor(file);
  }

  /** @param {Blob} imageBlob */
  #openEditor(imageBlob) {
    const editorContainer = this.#container.querySelector('#editor-container');
    const buttonsContainer = this.#container.querySelector('.image-capture__buttons');

    if (!editorContainer) {
      return;
    }

    this.#imageEditor = new ImageEditor({
      container: editorContainer,
      imageBlob,
      onConfirm: (croppedBlob) => this.#handleEditorConfirm(croppedBlob),
      onCancel: () => this.#closeEditor(),
    });

    buttonsContainer?.setAttribute('hidden', '');
    editorContainer.removeAttribute('hidden');
    this.#isEditorActive = true;
  }

  /** @param {Blob} croppedBlob */
  #handleEditorConfirm(croppedBlob) {
    this.#closeEditor();
    this.#onCapture(croppedBlob);
  }

  #closeEditor() {
    if (this.#imageEditor) {
      this.#imageEditor.destroy();
      this.#imageEditor = null;
    }

    const editorContainer = this.#container.querySelector('#editor-container');
    const buttonsContainer = this.#container.querySelector('.image-capture__buttons');

    editorContainer?.setAttribute('hidden', '');
    buttonsContainer?.removeAttribute('hidden');
    this.#isEditorActive = false;
  }

  destroy() {
    this.#closeCamera();
    this.#closeEditor();
    if (this.#cameraGuide) {
      this.#cameraGuide.destroy();
      this.#cameraGuide = null;
    }
    this.#container.innerHTML = '';
  }
}
