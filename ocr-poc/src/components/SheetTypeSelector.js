/**
 * SheetTypeSelector Component
 *
 * First step in the workflow - allows the user to specify the type of scoresheet:
 * - Electronic: Screenshots or printed forms with typed text
 * - Manuscript: Physical paper forms filled by hand (large landscape format)
 *
 * This selection determines the capture guide aspect ratio and whether OCR is available.
 */

/**
 * @typedef {'electronic' | 'manuscript'} SheetType
 */

/**
 * @typedef {Object} SheetTypeSelectorOptions
 * @property {HTMLElement} container - Container element to render into
 * @property {(type: SheetType) => void} onSelect - Callback when type is selected
 */

export class SheetTypeSelector {
  /** @type {HTMLElement} */
  #container;

  /** @type {(type: SheetType) => void} */
  #onSelect;

  /**
   * @param {SheetTypeSelectorOptions} options
   */
  constructor({ container, onSelect }) {
    this.#container = container;
    this.#onSelect = onSelect;
    this.#render();
  }

  #render() {
    this.#container.innerHTML = `
      <div class="sheet-type-selector">
        <div class="sheet-type-selector__options">
          <button
            type="button"
            class="sheet-type-selector__option"
            id="btn-electronic"
            aria-describedby="desc-electronic"
          >
            <span class="sheet-type-selector__option-icon" aria-hidden="true">📱</span>
            <span class="sheet-type-selector__option-label">Electronic</span>
            <span class="sheet-type-selector__option-desc" id="desc-electronic">
              Screenshots or printed forms with typed text
            </span>
          </button>

          <button
            type="button"
            class="sheet-type-selector__option"
            id="btn-manuscript"
            aria-describedby="desc-manuscript"
          >
            <span class="sheet-type-selector__option-icon" aria-hidden="true">📝</span>
            <span class="sheet-type-selector__option-label">Manuscript</span>
            <span class="sheet-type-selector__option-desc" id="desc-manuscript">
              Physical paper forms filled in by hand
            </span>
          </button>
        </div>
      </div>
    `;

    this.#bindEvents();
  }

  #bindEvents() {
    const electronicBtn = this.#container.querySelector('#btn-electronic');
    const manuscriptBtn = this.#container.querySelector('#btn-manuscript');

    electronicBtn?.addEventListener('click', () => this.#handleSelect('electronic'));
    manuscriptBtn?.addEventListener('click', () => this.#handleSelect('manuscript'));
  }

  /**
   * @param {SheetType} type
   */
  #handleSelect(type) {
    this.#onSelect(type);
  }

  destroy() {
    this.#container.innerHTML = '';
  }
}
