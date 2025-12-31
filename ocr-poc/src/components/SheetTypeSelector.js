/**
 * SheetTypeSelector Component
 *
 * Allows the user to specify the type of scoresheet they captured:
 * - Electronic/Printed: Screenshots or printed forms
 * - Handwritten: Physical forms filled by hand
 *
 * This distinction helps optimize OCR processing for different text styles.
 */

/**
 * @typedef {'electronic' | 'handwritten'} SheetType
 */

/**
 * @typedef {Object} SheetSelection
 * @property {SheetType} type - The selected sheet type
 * @property {Blob} imageBlob - The captured image
 */

/**
 * @typedef {Object} SheetTypeSelectorOptions
 * @property {HTMLElement} container - Container element to render into
 * @property {Blob} imageBlob - The captured image to display
 * @property {(selection: SheetSelection) => void} onSelect - Callback when type is selected
 * @property {() => void} [onBack] - Optional callback to go back to capture
 */

export class SheetTypeSelector {
  /** @type {HTMLElement} */
  #container;

  /** @type {Blob} */
  #imageBlob;

  /** @type {(selection: SheetSelection) => void} */
  #onSelect;

  /** @type {(() => void) | undefined} */
  #onBack;

  /** @type {string | null} */
  #previewUrl = null;

  /**
   * @param {SheetTypeSelectorOptions} options
   */
  constructor({ container, imageBlob, onSelect, onBack }) {
    this.#container = container;
    this.#imageBlob = imageBlob;
    this.#onSelect = onSelect;
    this.#onBack = onBack;
    this.#render();
  }

  #render() {
    // Create object URL for thumbnail preview
    this.#previewUrl = URL.createObjectURL(this.#imageBlob);

    this.#container.innerHTML = `
      <div class="sheet-type-selector">
        <div class="sheet-type-selector__preview">
          <img
            src="${this.#previewUrl}"
            alt="Captured scoresheet"
            class="sheet-type-selector__thumbnail"
          />
        </div>

        <h3 class="sheet-type-selector__title">What type of scoresheet is this?</h3>

        <div class="sheet-type-selector__options">
          <button
            type="button"
            class="sheet-type-selector__option"
            id="btn-electronic"
            aria-describedby="desc-electronic"
          >
            <span class="sheet-type-selector__option-icon" aria-hidden="true">🖥️</span>
            <span class="sheet-type-selector__option-label">Electronic / Printed</span>
            <span class="sheet-type-selector__option-desc" id="desc-electronic">
              Screenshots or printed forms with typed text
            </span>
          </button>

          <button
            type="button"
            class="sheet-type-selector__option"
            id="btn-handwritten"
            aria-describedby="desc-handwritten"
          >
            <span class="sheet-type-selector__option-icon" aria-hidden="true">✍️</span>
            <span class="sheet-type-selector__option-label">Handwritten</span>
            <span class="sheet-type-selector__option-desc" id="desc-handwritten">
              Physical forms filled in by hand
            </span>
          </button>
        </div>

        <button
          type="button"
          class="btn btn-secondary btn-block sheet-type-selector__back"
          id="btn-back"
        >
          ← Capture Different Image
        </button>
      </div>
    `;

    this.#bindEvents();
  }

  #bindEvents() {
    const electronicBtn = this.#container.querySelector('#btn-electronic');
    const handwrittenBtn = this.#container.querySelector('#btn-handwritten');
    const backBtn = this.#container.querySelector('#btn-back');

    electronicBtn?.addEventListener('click', () => this.#handleSelect('electronic'));
    handwrittenBtn?.addEventListener('click', () => this.#handleSelect('handwritten'));
    backBtn?.addEventListener('click', () => this.#handleBack());
  }

  /**
   * @param {SheetType} type
   */
  #handleSelect(type) {
    this.#onSelect({
      type,
      imageBlob: this.#imageBlob,
    });
  }

  #handleBack() {
    if (this.#onBack) {
      this.#onBack();
    }
  }

  destroy() {
    if (this.#previewUrl) {
      URL.revokeObjectURL(this.#previewUrl);
      this.#previewUrl = null;
    }
    this.#container.innerHTML = '';
  }
}
