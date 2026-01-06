/**
 * Player Comparison Component
 *
 * Displays comparison between OCR-extracted players and reference player lists.
 * Shows matches, mismatches, and missing players for both teams.
 * Also compares officials (coaches and assistant coaches).
 *
 * IMPORTANT: Matching is done by NAME ONLY since VolleyManager API
 * does not provide shirt numbers or player positions.
 */

import { parseGameSheet, getAllPlayers, getAllOfficials } from '../services/PlayerListParser.js';
import { getMockReferenceData } from '../services/MockReferenceData.js';
import { TeamConfirmationModal } from './TeamConfirmationModal.js';

/**
 * @typedef {import('../services/PlayerListParser.js').ParsedPlayer} ParsedPlayer
 * @typedef {import('../services/PlayerListParser.js').ParsedOfficial} ParsedOfficial
 * @typedef {import('../services/PlayerListParser.js').ParsedTeam} ParsedTeam
 * @typedef {import('../services/MockReferenceData.js').ReferencePlayer} ReferencePlayer
 * @typedef {import('../services/MockReferenceData.js').ReferenceOfficial} ReferenceOfficial
 * @typedef {import('../services/MockReferenceData.js').ReferenceTeam} ReferenceTeam
 */

/**
 * @typedef {Object} ComparisonResult
 * @property {'match' | 'ocr-only' | 'ref-only'} status
 * @property {ParsedPlayer | ParsedOfficial | null} ocrEntry
 * @property {ReferencePlayer | ReferenceOfficial | null} refEntry
 * @property {number} confidence - Match confidence 0-100
 * @property {number | null} shirtNumber - Shirt number from OCR (for display only)
 * @property {string | null} role - Official role (C, AC, etc.) if applicable
 */

/**
 * @typedef {Object} TeamComparison
 * @property {string} ocrTeamName - Team name from OCR
 * @property {string} refTeamName - Team name from reference
 * @property {ComparisonResult[]} playerResults - Player comparison results
 * @property {ComparisonResult[]} officialResults - Official comparison results
 * @property {{ players: { match: number, ocrOnly: number, refOnly: number }, officials: { match: number, ocrOnly: number, refOnly: number } }} counts
 */

/**
 * Normalize a string for comparison (lowercase, remove accents, trim)
 * @param {string} str
 * @returns {string}
 */
function normalizeForComparison(str) {
  if (!str) {
    return '';
  }
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s]/g, '') // Remove special chars
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculate similarity between two names (0-100)
 * Uses a combination of exact match, starts-with, and contains checks
 * @param {string} name1
 * @param {string} name2
 * @returns {number}
 */
function calculateNameSimilarity(name1, name2) {
  const n1 = normalizeForComparison(name1);
  const n2 = normalizeForComparison(name2);

  if (!n1 || !n2) {
    return 0;
  }
  if (n1 === n2) {
    return 100;
  }

  // Check if one contains the other
  if (n1.includes(n2) || n2.includes(n1)) {
    const shorter = n1.length < n2.length ? n1 : n2;
    const longer = n1.length >= n2.length ? n1 : n2;
    return Math.round((shorter.length / longer.length) * 90);
  }

  // Check word-by-word overlap
  const words1 = n1.split(' ').filter((w) => w.length > 1);
  const words2 = n2.split(' ').filter((w) => w.length > 1);

  let matchingWords = 0;
  for (const w1 of words1) {
    for (const w2 of words2) {
      if (w1 === w2 || w1.includes(w2) || w2.includes(w1)) {
        matchingWords++;
        break;
      }
    }
  }

  const totalWords = Math.max(words1.length, words2.length);
  if (totalWords === 0) {
    return 0;
  }

  return Math.round((matchingWords / totalWords) * 85);
}

/**
 * Find the best matching reference player for an OCR player (name-based only)
 * @param {ParsedPlayer} ocrPlayer
 * @param {ReferencePlayer[]} refPlayers
 * @param {Set<string>} usedRefIds - Already matched reference player IDs
 * @returns {{ player: ReferencePlayer | null, confidence: number }}
 */
function findBestPlayerMatch(ocrPlayer, refPlayers, usedRefIds) {
  let bestMatch = null;
  let bestConfidence = 0;

  for (const refPlayer of refPlayers) {
    if (usedRefIds.has(refPlayer.id)) {
      continue;
    }

    // Match by name only - no shirt numbers available in reference
    const lastNameSim = calculateNameSimilarity(ocrPlayer.lastName, refPlayer.lastName);
    const firstNameSim = calculateNameSimilarity(ocrPlayer.firstName, refPlayer.firstName);

    // Weight last name more heavily (60% last name, 40% first name)
    let confidence = lastNameSim * 0.6 + firstNameSim * 0.4;

    if (confidence > bestConfidence) {
      bestConfidence = confidence;
      bestMatch = refPlayer;
    }
  }

  // Require minimum confidence threshold for a match
  const MATCH_THRESHOLD = 50;
  if (bestConfidence < MATCH_THRESHOLD) {
    return { player: null, confidence: 0 };
  }

  return { player: bestMatch, confidence: Math.min(100, Math.round(bestConfidence)) };
}

/**
 * Find the best matching reference official for an OCR official (name-based)
 * @param {ParsedOfficial} ocrOfficial
 * @param {ReferenceOfficial[]} refOfficials
 * @param {Set<string>} usedRefIds - Already matched reference official IDs
 * @returns {{ official: ReferenceOfficial | null, confidence: number }}
 */
function findBestOfficialMatch(ocrOfficial, refOfficials, usedRefIds) {
  let bestMatch = null;
  let bestConfidence = 0;

  for (const refOfficial of refOfficials) {
    if (usedRefIds.has(refOfficial.id)) {
      continue;
    }

    // Match by name
    const lastNameSim = calculateNameSimilarity(ocrOfficial.lastName, refOfficial.lastName);
    const firstNameSim = calculateNameSimilarity(ocrOfficial.firstName, refOfficial.firstName);

    // Weight last name more heavily
    let confidence = lastNameSim * 0.6 + firstNameSim * 0.4;

    if (confidence > bestConfidence) {
      bestConfidence = confidence;
      bestMatch = refOfficial;
    }
  }

  const MATCH_THRESHOLD = 50;
  if (bestConfidence < MATCH_THRESHOLD) {
    return { official: null, confidence: 0 };
  }

  return { official: bestMatch, confidence: Math.min(100, Math.round(bestConfidence)) };
}

/**
 * Compare OCR players with reference players
 * @param {ParsedTeam} ocrTeam
 * @param {ReferenceTeam} refTeam
 * @returns {TeamComparison}
 */
function compareTeams(ocrTeam, refTeam) {
  /** @type {ComparisonResult[]} */
  const playerResults = [];
  /** @type {ComparisonResult[]} */
  const officialResults = [];

  const usedRefPlayerIds = new Set();
  const usedRefOfficialIds = new Set();

  const ocrPlayers = getAllPlayers(ocrTeam);
  const ocrOfficials = getAllOfficials(ocrTeam);

  // Compare players
  for (const ocrPlayer of ocrPlayers) {
    const { player: matchedRef, confidence } = findBestPlayerMatch(
      ocrPlayer,
      refTeam.players,
      usedRefPlayerIds,
    );

    if (matchedRef) {
      usedRefPlayerIds.add(matchedRef.id);
      playerResults.push({
        status: 'match',
        ocrEntry: ocrPlayer,
        refEntry: matchedRef,
        confidence,
        shirtNumber: ocrPlayer.shirtNumber,
        role: null,
      });
    } else {
      playerResults.push({
        status: 'ocr-only',
        ocrEntry: ocrPlayer,
        refEntry: null,
        confidence: 0,
        shirtNumber: ocrPlayer.shirtNumber,
        role: null,
      });
    }
  }

  // Find unmatched reference players
  for (const refPlayer of refTeam.players) {
    if (!usedRefPlayerIds.has(refPlayer.id)) {
      playerResults.push({
        status: 'ref-only',
        ocrEntry: null,
        refEntry: refPlayer,
        confidence: 0,
        shirtNumber: null,
        role: null,
      });
    }
  }

  // Compare officials
  for (const ocrOfficial of ocrOfficials) {
    const { official: matchedRef, confidence } = findBestOfficialMatch(
      ocrOfficial,
      refTeam.officials || [],
      usedRefOfficialIds,
    );

    if (matchedRef) {
      usedRefOfficialIds.add(matchedRef.id);
      officialResults.push({
        status: 'match',
        ocrEntry: ocrOfficial,
        refEntry: matchedRef,
        confidence,
        shirtNumber: null,
        role: ocrOfficial.role,
      });
    } else {
      officialResults.push({
        status: 'ocr-only',
        ocrEntry: ocrOfficial,
        refEntry: null,
        confidence: 0,
        shirtNumber: null,
        role: ocrOfficial.role,
      });
    }
  }

  // Find unmatched reference officials
  for (const refOfficial of refTeam.officials || []) {
    if (!usedRefOfficialIds.has(refOfficial.id)) {
      officialResults.push({
        status: 'ref-only',
        ocrEntry: null,
        refEntry: refOfficial,
        confidence: 0,
        shirtNumber: null,
        role: refOfficial.role,
      });
    }
  }

  // Sort: matches first, then ocr-only, then ref-only
  const sortFn = (a, b) => {
    const order = { match: 0, 'ocr-only': 1, 'ref-only': 2 };
    return order[a.status] - order[b.status];
  };
  playerResults.sort(sortFn);
  officialResults.sort(sortFn);

  return {
    ocrTeamName: ocrTeam.name,
    refTeamName: refTeam.name,
    playerResults,
    officialResults,
    counts: {
      players: {
        match: playerResults.filter((r) => r.status === 'match').length,
        ocrOnly: playerResults.filter((r) => r.status === 'ocr-only').length,
        refOnly: playerResults.filter((r) => r.status === 'ref-only').length,
      },
      officials: {
        match: officialResults.filter((r) => r.status === 'match').length,
        ocrOnly: officialResults.filter((r) => r.status === 'ocr-only').length,
        refOnly: officialResults.filter((r) => r.status === 'ref-only').length,
      },
    },
  };
}

/**
 * Minimum score difference needed to consider the mapping "confident"
 * If the difference between the two options is less than this, we ask the user
 */
const CONFIDENCE_THRESHOLD = 2;

/** Weight for match ratio in confidence calculation (0-100 scale contribution) */
const MATCH_RATIO_WEIGHT = 50;

/** Weight for score difference ratio in confidence calculation (0-100 scale contribution) */
const DIFF_RATIO_WEIGHT = 50;

/** Minimum confidence score required to skip user confirmation */
const MINIMUM_CONFIDENCE_SCORE = 50;

/**
 * Try to match OCR teams to reference teams
 * Since we don't know which column is which team, we try both combinations
 * and pick the one with more matches
 * @param {ParsedTeam} ocrTeamA
 * @param {ParsedTeam} ocrTeamB
 * @param {ReferenceTeam} refTeamA
 * @param {ReferenceTeam} refTeamB
 * @returns {{ team1: TeamComparison, team2: TeamComparison, swapped: boolean, isConfident: boolean, confidenceScore: number, option1Score: number, option2Score: number }}
 */
function findBestTeamMapping(ocrTeamA, ocrTeamB, refTeamA, refTeamB) {
  // Try mapping: ocrA -> refA, ocrB -> refB
  const option1Team1 = compareTeams(ocrTeamA, refTeamA);
  const option1Team2 = compareTeams(ocrTeamB, refTeamB);
  const option1Score =
    option1Team1.counts.players.match +
    option1Team2.counts.players.match +
    option1Team1.counts.officials.match +
    option1Team2.counts.officials.match;

  // Try mapping: ocrA -> refB, ocrB -> refA
  const option2Team1 = compareTeams(ocrTeamA, refTeamB);
  const option2Team2 = compareTeams(ocrTeamB, refTeamA);
  const option2Score =
    option2Team1.counts.players.match +
    option2Team2.counts.players.match +
    option2Team1.counts.officials.match +
    option2Team2.counts.officials.match;

  // Calculate confidence based on the difference between scores
  const scoreDiff = Math.abs(option1Score - option2Score);
  const maxScore = Math.max(option1Score, option2Score);
  const totalPossible = ocrTeamA.players.length + ocrTeamB.players.length +
    ocrTeamA.officials.length + ocrTeamB.officials.length;

  // Confidence score: 0-100
  // - Higher when there's a clear winner (big score difference)
  // - Higher when the winning option has many matches
  let confidenceScore = 0;
  if (totalPossible > 0) {
    const matchRatio = maxScore / totalPossible;
    const diffRatio = scoreDiff / Math.max(1, maxScore);
    confidenceScore = Math.round((matchRatio * MATCH_RATIO_WEIGHT) + (diffRatio * DIFF_RATIO_WEIGHT));
  }

  // Determine if we're confident in the mapping
  const isConfident = scoreDiff >= CONFIDENCE_THRESHOLD && confidenceScore >= MINIMUM_CONFIDENCE_SCORE;

  if (option2Score > option1Score) {
    return {
      team1: option2Team1,
      team2: option2Team2,
      swapped: true,
      isConfident,
      confidenceScore,
      option1Score,
      option2Score,
    };
  }

  return {
    team1: option1Team1,
    team2: option1Team2,
    swapped: false,
    isConfident,
    confidenceScore,
    option1Score,
    option2Score,
  };
}

/**
 * Render a single comparison result row
 * @param {ComparisonResult} result
 * @param {boolean} isOfficial - Whether this is an official (not a player)
 * @returns {string}
 */
function renderComparisonRow(result, isOfficial = false) {
  const statusIcons = {
    match: '✓',
    'ocr-only': '⚠',
    'ref-only': '○',
  };

  const statusClasses = {
    match: 'comparison-row--match',
    'ocr-only': 'comparison-row--ocr-only',
    'ref-only': 'comparison-row--ref-only',
  };

  const icon = statusIcons[result.status];
  const rowClass = statusClasses[result.status];

  // Get display name (escaped for XSS protection)
  const rawDisplayName =
    result.status === 'ref-only'
      ? result.refEntry?.displayName || ''
      : result.ocrEntry?.displayName || '';
  const displayName = escapeHtml(rawDisplayName);

  // Get role badge for officials (escaped for defense-in-depth)
  const roleBadge =
    isOfficial && result.role
      ? `<span class="comparison-role-badge">${escapeHtml(result.role)}</span>`
      : '';

  // Get shirt number for players (display only, escaped for defense-in-depth)
  const numberDisplay =
    !isOfficial && result.shirtNumber !== null
      ? `<span class="comparison-number">${escapeHtml(String(result.shirtNumber))}</span>`
      : '';

  if (result.status === 'match') {
    return `
      <div class="comparison-row ${rowClass}">
        <span class="comparison-icon">${icon}</span>
        ${numberDisplay}
        ${roleBadge}
        <span class="comparison-name">${displayName}</span>
        <span class="comparison-confidence">${result.confidence}%</span>
      </div>
    `;
  }

  if (result.status === 'ocr-only') {
    return `
      <div class="comparison-row ${rowClass}">
        <span class="comparison-icon">${icon}</span>
        ${numberDisplay}
        ${roleBadge}
        <span class="comparison-name">${displayName}</span>
        <span class="comparison-badge">Not in reference</span>
      </div>
    `;
  }

  // ref-only
  return `
    <div class="comparison-row ${rowClass}">
      <span class="comparison-icon">${icon}</span>
      ${numberDisplay}
      ${roleBadge}
      <span class="comparison-name">${displayName}</span>
      <span class="comparison-badge comparison-badge--info">Not on sheet</span>
    </div>
  `;
}

/**
 * Render stats bar
 * @param {{ match: number, ocrOnly: number, refOnly: number }} counts
 * @returns {string}
 */
function renderStats(counts) {
  return `
    <div class="comparison-stats">
      <span class="comparison-stat comparison-stat--match">
        <span class="comparison-stat-icon">✓</span>
        <span class="comparison-stat-value">${counts.match}</span>
        <span class="comparison-stat-label">Matched</span>
      </span>
      <span class="comparison-stat comparison-stat--warning">
        <span class="comparison-stat-icon">⚠</span>
        <span class="comparison-stat-value">${counts.ocrOnly}</span>
        <span class="comparison-stat-label">Not in ref</span>
      </span>
      <span class="comparison-stat comparison-stat--info">
        <span class="comparison-stat-icon">○</span>
        <span class="comparison-stat-value">${counts.refOnly}</span>
        <span class="comparison-stat-label">Not on sheet</span>
      </span>
    </div>
  `;
}

/**
 * Render team comparison panel
 * @param {TeamComparison} comparison
 * @param {string} label
 * @returns {string}
 */
function renderTeamPanel(comparison, label) {
  const playerRows = comparison.playerResults.map((r) => renderComparisonRow(r, false)).join('');
  const officialRows = comparison.officialResults
    .map((r) => renderComparisonRow(r, true))
    .join('');

  const hasOfficials = comparison.officialResults.length > 0;

  // Escape team names for XSS protection
  const escapedOcrTeamName = escapeHtml(comparison.ocrTeamName || 'Unknown Team');
  const escapedRefTeamName = escapeHtml(comparison.refTeamName);

  return `
    <div class="comparison-panel">
      <div class="comparison-header">
        <h3 class="comparison-title">${escapeHtml(label)}</h3>
        <div class="comparison-teams">
          <span class="comparison-team-name" title="From OCR">${escapedOcrTeamName}</span>
          <span class="comparison-arrow">→</span>
          <span class="comparison-team-name" title="Reference">${escapedRefTeamName}</span>
        </div>
      </div>

      <div class="comparison-section">
        <h4 class="comparison-section-title">Players</h4>
        ${renderStats(comparison.counts.players)}
        <div class="comparison-list">
          ${playerRows}
        </div>
      </div>

      ${
        hasOfficials
          ? `
        <div class="comparison-section">
          <h4 class="comparison-section-title">Officials</h4>
          ${renderStats(comparison.counts.officials)}
          <div class="comparison-list">
            ${officialRows}
          </div>
        </div>
      `
          : ''
      }
    </div>
  `;
}

/**
 * PlayerComparison Component
 */
export class PlayerComparison {
  /**
   * @param {Object} options
   * @param {HTMLElement} options.container - Container element
   * @param {string} options.ocrText - Raw OCR text
   * @param {boolean} [options.isManuscript=false] - Whether this is a manuscript scoresheet
   * @param {Function} [options.onBack] - Callback when back button is clicked
   */
  constructor({ container, ocrText, isManuscript = false, onBack }) {
    this.container = container;
    this.ocrText = ocrText;
    this.isManuscript = isManuscript;
    this.onBack = onBack;

    /** @type {TeamConfirmationModal | null} */
    this.confirmationModal = null;

    /** @type {import('../services/PlayerListParser.js').ParsedGameSheet | null} */
    this.parsed = null;

    /** @type {{ teamA: ReferenceTeam, teamB: ReferenceTeam } | null} */
    this.referenceData = null;

    /** @type {boolean} */
    this.userSwapped = false;

    this.initialize();
  }

  /**
   * Initialize the component - parse data and determine if confirmation is needed
   */
  initialize() {
    // Parse OCR text
    this.parsed = parseGameSheet(this.ocrText);

    // Get mock reference data
    this.referenceData = getMockReferenceData();

    // Find best team mapping and check confidence
    const mapping = findBestTeamMapping(
      this.parsed.teamA,
      this.parsed.teamB,
      this.referenceData.teamA,
      this.referenceData.teamB,
    );

    // Show confirmation modal if:
    // 1. Confidence is low (scores are close)
    // 2. OR this is a manuscript scoresheet (lower OCR reliability)
    const needsConfirmation = !mapping.isConfident || this.isManuscript;

    if (needsConfirmation) {
      this.showConfirmationModal(mapping);
    } else {
      // Confident in mapping - render directly
      this.userSwapped = mapping.swapped;
      this.renderComparison();
    }
  }

  /**
   * Show the team confirmation modal
   * @param {{ swapped: boolean, confidenceScore: number }} mapping
   */
  showConfirmationModal(mapping) {
    // Create a container for the modal
    const modalContainer = document.createElement('div');
    modalContainer.id = 'team-confirmation-modal';
    this.container.appendChild(modalContainer);

    // Show loading message while modal is displayed
    this.container.insertAdjacentHTML(
      'afterbegin',
      `<div class="comparison-loading">
        <p class="text-muted text-center">Please confirm team positions...</p>
      </div>`,
    );

    // Determine which teams to show based on auto-mapping
    const leftTeam = mapping.swapped ? this.parsed.teamB : this.parsed.teamA;
    const rightTeam = mapping.swapped ? this.parsed.teamA : this.parsed.teamB;

    this.confirmationModal = new TeamConfirmationModal({
      container: modalContainer,
      leftTeam: {
        name: leftTeam.name,
        playerCount: leftTeam.players.length,
      },
      rightTeam: {
        name: rightTeam.name,
        playerCount: rightTeam.players.length,
      },
      confidenceScore: mapping.confidenceScore,
      onConfirm: (userSwappedFromModal) => {
        // User's swap is relative to the auto-mapping
        // If auto-mapping swapped AND user swapped, they cancel out
        this.userSwapped = mapping.swapped !== userSwappedFromModal;
        this.confirmationModal?.destroy();
        this.confirmationModal = null;
        modalContainer.remove();
        this.container.querySelector('.comparison-loading')?.remove();
        this.renderComparison();
      },
      onCancel: () => {
        // User cancelled - use auto-mapping
        this.userSwapped = mapping.swapped;
        this.confirmationModal?.destroy();
        this.confirmationModal = null;
        modalContainer.remove();
        this.container.querySelector('.comparison-loading')?.remove();
        this.renderComparison();
      },
    });
  }

  /**
   * Render the comparison results
   */
  renderComparison() {
    if (!this.parsed || !this.referenceData) {
      return;
    }

    // Determine final team mapping based on user choice
    let team1, team2;
    if (this.userSwapped) {
      team1 = compareTeams(this.parsed.teamA, this.referenceData.teamB);
      team2 = compareTeams(this.parsed.teamB, this.referenceData.teamA);
    } else {
      team1 = compareTeams(this.parsed.teamA, this.referenceData.teamA);
      team2 = compareTeams(this.parsed.teamB, this.referenceData.teamB);
    }

    // Render warnings if any
    const warningsHtml =
      this.parsed.warnings.length > 0
        ? `
      <div class="comparison-warnings">
        ${this.parsed.warnings.map((w) => `<p class="comparison-warning">⚠ ${escapeHtml(w)}</p>`).join('')}
      </div>
    `
        : '';

    // Render mapping info if swapped
    const mappingInfo = this.userSwapped
      ? `<p class="comparison-mapping-info">Teams were matched based on your confirmation</p>`
      : '';

    this.container.innerHTML = `
      <div class="player-comparison">
        <div class="comparison-intro">
          <p class="text-muted">
            Comparing extracted players with reference roster data.
            Matching is based on <strong>name similarity only</strong> (no shirt numbers in reference).
          </p>
          ${mappingInfo}
        </div>

        ${warningsHtml}

        <div class="comparison-panels">
          ${renderTeamPanel(team1, 'Team A (Left Column)')}
          ${renderTeamPanel(team2, 'Team B (Right Column)')}
        </div>

        <div class="comparison-legend">
          <div class="legend-item">
            <span class="legend-icon legend-icon--match">✓</span>
            <span>Player/Official matched in reference list</span>
          </div>
          <div class="legend-item">
            <span class="legend-icon legend-icon--warning">⚠</span>
            <span>On sheet but not in reference (verify)</span>
          </div>
          <div class="legend-item">
            <span class="legend-icon legend-icon--info">○</span>
            <span>In reference but not on sheet</span>
          </div>
        </div>

        ${
          this.onBack
            ? `
          <button class="btn btn-secondary btn-block mt-lg" id="btn-back-to-results">
            Back to OCR Results
          </button>
        `
            : ''
        }
      </div>
    `;

    // Bind back button
    if (this.onBack) {
      const backBtn = this.container.querySelector('#btn-back-to-results');
      backBtn?.addEventListener('click', () => this.onBack?.());
    }
  }

  destroy() {
    this.confirmationModal?.destroy();
    this.container.innerHTML = '';
  }
}

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
