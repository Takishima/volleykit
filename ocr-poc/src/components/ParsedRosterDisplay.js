/**
 * Parsed Roster Display Component
 *
 * Displays the OCR-parsed roster data for both teams in a format similar
 * to the validation modal. This is used for debugging OCR recognition
 * issues - showing exactly what was parsed without comparison to reference data.
 *
 * Shows:
 * - Team name
 * - Players with shirt numbers
 * - Officials with roles (C, AC, etc.)
 * - Liberos (marked with L badge)
 * - Parsing warnings
 */

import {
  parseGameSheet,
  getAllPlayers,
  getAllOfficials,
} from '../services/PlayerListParser.js';

/**
 * @typedef {import('@volleykit/ocr/types').ParsedPlayer} ParsedPlayer
 * @typedef {import('@volleykit/ocr/types').ParsedOfficial} ParsedOfficial
 * @typedef {import('@volleykit/ocr/types').ParsedTeam} ParsedTeam
 * @typedef {import('../services/PlayerListParser.js').ParsedGameSheet} ParsedGameSheet
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
 * Role display names for officials
 */
const OFFICIAL_ROLE_NAMES = {
  C: 'Coach',
  AC: 'Asst. Coach',
  AC2: 'Asst. Coach 2',
  AC3: 'Asst. Coach 3',
  AC4: 'Asst. Coach 4',
  M: 'Manager',
};

/**
 * Render a player row
 * @param {ParsedPlayer} player
 * @param {boolean} isLibero
 * @returns {string}
 */
function renderPlayerRow(player, isLibero = false) {
  const numberDisplay = player.shirtNumber !== null
    ? `<span class="roster-display__number">${escapeHtml(String(player.shirtNumber))}</span>`
    : '<span class="roster-display__number roster-display__number--missing">?</span>';

  const liberoTag = isLibero
    ? '<span class="roster-display__libero-tag">L</span>'
    : '';

  const licenseStatus = player.licenseStatus && player.licenseStatus !== 'OK'
    ? `<span class="roster-display__license roster-display__license--${player.licenseStatus.toLowerCase()}">${escapeHtml(player.licenseStatus)}</span>`
    : '';

  return `
    <div class="roster-display__row">
      ${numberDisplay}
      ${liberoTag}
      <span class="roster-display__name">${escapeHtml(player.displayName)}</span>
      ${licenseStatus}
    </div>
  `;
}

/**
 * Render an official row
 * @param {ParsedOfficial} official
 * @returns {string}
 */
function renderOfficialRow(official) {
  const roleDisplay = official.role
    ? `<span class="roster-display__role-badge">${escapeHtml(official.role)}</span>`
    : '';

  const roleName = official.role && OFFICIAL_ROLE_NAMES[official.role]
    ? `<span class="roster-display__role-name">${escapeHtml(OFFICIAL_ROLE_NAMES[official.role])}</span>`
    : '';

  return `
    <div class="roster-display__row roster-display__row--official">
      ${roleDisplay}
      <span class="roster-display__name">${escapeHtml(official.displayName)}</span>
      ${roleName}
    </div>
  `;
}

/**
 * @typedef {Object} TeamPanelOptions
 * @property {ParsedTeam} team - The parsed team data
 * @property {string} label - Display label for the panel
 * @property {boolean} playersExpanded - Whether players section is expanded
 * @property {boolean} officialsExpanded - Whether officials section is expanded
 * @property {string} panelId - Unique ID for the panel
 */

/**
 * Render a team panel
 * @param {TeamPanelOptions} options
 * @returns {string}
 */
function renderTeamPanel({ team, label, playersExpanded, officialsExpanded, panelId }) {
  const players = getAllPlayers(team);
  const officials = getAllOfficials(team);

  // Separate regular players and liberos
  const regularPlayers = team.players || [];
  const liberos = team.liberos || [];

  const playerRows = regularPlayers.map((p) => renderPlayerRow(p, false)).join('');
  const liberoRows = liberos.map((p) => renderPlayerRow(p, true)).join('');
  const officialRows = officials.map((o) => renderOfficialRow(o)).join('');

  const hasOfficials = officials.length > 0;
  const teamName = team.name || 'Unknown Team';

  return `
    <div class="roster-display__panel" data-panel-id="${panelId}">
      <div class="roster-display__panel-header">
        <h3 class="roster-display__panel-title">${escapeHtml(label)}</h3>
        <div class="roster-display__team-name">${escapeHtml(teamName)}</div>
      </div>

      <!-- Players Section -->
      <div class="roster-display__section">
        <button
          type="button"
          class="roster-display__section-header"
          aria-expanded="${playersExpanded}"
          aria-controls="${panelId}-players"
          data-section="players"
        >
          <span class="roster-display__section-toggle">${playersExpanded ? '▼' : '▶'}</span>
          <span class="roster-display__section-title">Players</span>
          <span class="roster-display__section-count">${players.length} players</span>
        </button>
        <div
          id="${panelId}-players"
          class="roster-display__section-content"
          ${playersExpanded ? '' : 'hidden'}
        >
          ${players.length > 0 ? `
            <div class="roster-display__list">
              ${playerRows}
              ${liberoRows}
            </div>
          ` : `
            <div class="roster-display__empty">No players detected</div>
          `}
        </div>
      </div>

      <!-- Officials Section -->
      ${hasOfficials ? `
        <div class="roster-display__section">
          <button
            type="button"
            class="roster-display__section-header"
            aria-expanded="${officialsExpanded}"
            aria-controls="${panelId}-officials"
            data-section="officials"
          >
            <span class="roster-display__section-toggle">${officialsExpanded ? '▼' : '▶'}</span>
            <span class="roster-display__section-title">Officials</span>
            <span class="roster-display__section-count">${officials.length} officials</span>
          </button>
          <div
            id="${panelId}-officials"
            class="roster-display__section-content"
            ${officialsExpanded ? '' : 'hidden'}
          >
            <div class="roster-display__list">
              ${officialRows}
            </div>
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

/** Duration in ms to show copy success feedback before resetting button text */
const COPY_FEEDBACK_DURATION_MS = 2000;

/**
 * Copy text to clipboard
 * @param {string} text
 * @returns {Promise<boolean>}
 */
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Copy text to clipboard and show feedback on a button
 * @param {HTMLButtonElement} button - The button to update with feedback
 * @param {string} text - The text to copy
 * @param {string} originalLabel - The button's original text to restore
 */
async function copyWithFeedback(button, text, originalLabel) {
  const success = await copyToClipboard(text);
  if (success) {
    button.textContent = '✓ Copied!';
    setTimeout(() => {
      button.textContent = originalLabel;
    }, COPY_FEEDBACK_DURATION_MS);
  }
}

/**
 * ParsedRosterDisplay Component
 */
export class ParsedRosterDisplay {
  /**
   * @param {Object} options
   * @param {HTMLElement} options.container - Container element
   * @param {string} options.ocrText - Raw OCR text
   * @param {import('../services/ocr/StubOCR.js').OCRResult} [options.ocrResult] - Full OCR result with metadata
   * @param {'electronic' | 'manuscript'} [options.sheetType='electronic'] - Sheet type for export
   * @param {boolean} [options.isManuscript=false] - Whether this is a manuscript scoresheet
   * @param {Function} [options.onBack] - Callback when back button is clicked
   */
  constructor({ container, ocrText, ocrResult = null, sheetType = 'electronic', isManuscript = false, onBack }) {
    this.container = container;
    this.ocrText = ocrText;
    this.ocrResult = ocrResult;
    this.sheetType = sheetType;
    this.isManuscript = isManuscript;
    this.onBack = onBack;

    /** @type {ParsedGameSheet | null} */
    this.parsed = null;

    /** @type {{ playersA: boolean, officialsA: boolean, playersB: boolean, officialsB: boolean }} */
    this.expandedState = {
      playersA: true,
      officialsA: false,
      playersB: true,
      officialsB: false,
    };

    this.initialize();
  }

  /**
   * Initialize the component
   */
  initialize() {
    // Parse OCR text using appropriate parser based on scoresheet type
    const parserType = this.isManuscript ? 'manuscript' : 'electronic';
    this.parsed = parseGameSheet(this.ocrText, { type: parserType });

    this.render();
    this.bindEvents();
  }

  /**
   * Render the component
   */
  render() {
    if (!this.parsed) {
      this.container.innerHTML = `
        <div class="roster-display__error">
          <p>Failed to parse scoresheet</p>
        </div>
      `;
      return;
    }

    // Render warnings if any
    const warningsHtml = this.parsed.warnings.length > 0
      ? `
        <div class="roster-display__warnings">
          ${this.parsed.warnings.map((w) => `<p class="roster-display__warning">⚠ ${escapeHtml(w)}</p>`).join('')}
        </div>
      `
      : '';

    // Get player counts for summary
    const teamAPlayers = getAllPlayers(this.parsed.teamA);
    const teamBPlayers = getAllPlayers(this.parsed.teamB);
    const teamAOfficials = getAllOfficials(this.parsed.teamA);
    const teamBOfficials = getAllOfficials(this.parsed.teamB);
    const totalPlayers = teamAPlayers.length + teamBPlayers.length;
    const totalOfficials = teamAOfficials.length + teamBOfficials.length;

    this.container.innerHTML = `
      <div class="roster-display">
        <div class="roster-display__intro">
          <p class="text-muted">
            OCR parsed roster data. Use this to debug recognition issues.
            ${this.isManuscript ? '<br><em>Manuscript parser with OCR error correction enabled.</em>' : ''}
          </p>
        </div>

        <!-- Summary stats -->
        <div class="roster-display__summary">
          <div class="roster-display__stat">
            <span class="roster-display__stat-value">${totalPlayers}</span>
            <span class="roster-display__stat-label">Players</span>
          </div>
          <div class="roster-display__stat">
            <span class="roster-display__stat-value">${totalOfficials}</span>
            <span class="roster-display__stat-label">Officials</span>
          </div>
        </div>

        ${warningsHtml}

        <div class="roster-display__panels">
          ${renderTeamPanel({
            team: this.parsed.teamA,
            label: 'Team A (Left Column)',
            playersExpanded: this.expandedState.playersA,
            officialsExpanded: this.expandedState.officialsA,
            panelId: 'team-a',
          })}
          ${renderTeamPanel({
            team: this.parsed.teamB,
            label: 'Team B (Right Column)',
            playersExpanded: this.expandedState.playersB,
            officialsExpanded: this.expandedState.officialsB,
            panelId: 'team-b',
          })}
        </div>

        <!-- Debug Data Export Panel -->
        <details class="roster-display__debug-panel">
          <summary class="roster-display__debug-summary">📊 Debug Data Export</summary>
          <div class="roster-display__debug-content">
            <div class="flex flex-col gap-sm">
              <button class="btn btn-outline btn-block" id="btn-copy-parsed-json" aria-label="Copy parsed roster JSON to clipboard">
                Copy Parsed Roster (JSON)
              </button>
              <button class="btn btn-outline btn-block" id="btn-copy-ocr-text" aria-label="Copy raw OCR text to clipboard">
                Copy Raw OCR Text
              </button>
              ${this.ocrResult ? `
                <button class="btn btn-outline btn-block" id="btn-copy-full-json" aria-label="Copy full OCR result JSON to clipboard">
                  Copy Full OCR Result (JSON)
                </button>
              ` : ''}
              <button class="btn btn-outline btn-block" id="btn-log-to-console" aria-label="Log all data to browser console">
                Log to Console
              </button>
            </div>
            <details class="roster-display__raw-text-panel mt-md">
              <summary class="roster-display__debug-summary">View Raw OCR Text</summary>
              <pre class="roster-display__raw-text">${escapeHtml(this.ocrText)}</pre>
            </details>
          </div>
        </details>

        ${this.onBack ? `
          <button class="btn btn-secondary btn-block mt-lg" id="btn-back-to-results">
            Back to OCR Results
          </button>
        ` : ''}
      </div>
    `;
  }

  /**
   * Bind event listeners
   */
  bindEvents() {
    // Back button
    if (this.onBack) {
      const backBtn = this.container.querySelector('#btn-back-to-results');
      backBtn?.addEventListener('click', () => this.onBack?.());
    }

    // Debug export buttons
    const copyParsedBtn = this.container.querySelector('#btn-copy-parsed-json');
    copyParsedBtn?.addEventListener('click', async () => {
      const json = JSON.stringify(this.parsed, null, 2);
      await copyWithFeedback(copyParsedBtn, json, 'Copy Parsed Roster (JSON)');
    });

    const copyOcrTextBtn = this.container.querySelector('#btn-copy-ocr-text');
    copyOcrTextBtn?.addEventListener('click', async () => {
      await copyWithFeedback(copyOcrTextBtn, this.ocrText, 'Copy Raw OCR Text');
    });

    const copyFullJsonBtn = this.container.querySelector('#btn-copy-full-json');
    copyFullJsonBtn?.addEventListener('click', async () => {
      if (this.ocrResult) {
        const json = JSON.stringify(this.ocrResult, null, 2);
        await copyWithFeedback(copyFullJsonBtn, json, 'Copy Full OCR Result (JSON)');
      }
    });

    const logToConsoleBtn = this.container.querySelector('#btn-log-to-console');
    logToConsoleBtn?.addEventListener('click', () => {
      console.log('=== OCR Debug Data ===');
      console.log('Sheet Type:', this.sheetType);
      console.log('Is Manuscript:', this.isManuscript);
      console.log('');
      console.log('--- Raw OCR Text ---');
      console.log(this.ocrText);
      console.log('');
      console.log('--- Parsed Roster ---');
      console.log(this.parsed);
      if (this.ocrResult) {
        console.log('');
        console.log('--- Full OCR Result ---');
        console.log(this.ocrResult);
      }
      console.log('=== End OCR Debug Data ===');

      // Show feedback
      logToConsoleBtn.textContent = '✓ Logged!';
      setTimeout(() => {
        logToConsoleBtn.textContent = 'Log to Console';
      }, COPY_FEEDBACK_DURATION_MS);
    });

    // Section toggles
    this.container.querySelectorAll('.roster-display__section-header').forEach((header) => {
      header.addEventListener('click', (e) => {
        const button = e.currentTarget;
        const section = button.dataset.section;
        const panel = button.closest('.roster-display__panel');
        const panelId = panel?.dataset.panelId;
        const contentId = button.getAttribute('aria-controls');
        const content = this.container.querySelector(`#${contentId}`);
        const toggle = button.querySelector('.roster-display__section-toggle');

        if (!content || !toggle) {
          return;
        }

        const isExpanded = button.getAttribute('aria-expanded') === 'true';
        const newExpanded = !isExpanded;

        // Update state
        if (panelId === 'team-a' && section === 'players') {
          this.expandedState.playersA = newExpanded;
        } else if (panelId === 'team-a' && section === 'officials') {
          this.expandedState.officialsA = newExpanded;
        } else if (panelId === 'team-b' && section === 'players') {
          this.expandedState.playersB = newExpanded;
        } else if (panelId === 'team-b' && section === 'officials') {
          this.expandedState.officialsB = newExpanded;
        }

        // Update UI
        button.setAttribute('aria-expanded', String(newExpanded));
        toggle.textContent = newExpanded ? '▼' : '▶';
        if (newExpanded) {
          content.removeAttribute('hidden');
        } else {
          content.setAttribute('hidden', '');
        }
      });
    });
  }

  /**
   * Destroy the component
   */
  destroy() {
    this.container.innerHTML = '';
  }
}
