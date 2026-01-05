/**
 * Player Comparison Component
 *
 * Displays comparison between OCR-extracted players and reference player lists.
 * Shows matches, mismatches, and missing players for both teams.
 */

import { parseGameSheet, getAllPlayers } from '../services/PlayerListParser.js';
import { getMockReferenceData, findTeamByName } from '../services/MockReferenceData.js';

/**
 * @typedef {import('../services/PlayerListParser.js').ParsedPlayer} ParsedPlayer
 * @typedef {import('../services/PlayerListParser.js').ParsedTeam} ParsedTeam
 * @typedef {import('../services/MockReferenceData.js').ReferencePlayer} ReferencePlayer
 * @typedef {import('../services/MockReferenceData.js').ReferenceTeam} ReferenceTeam
 */

/**
 * @typedef {Object} ComparisonResult
 * @property {'match' | 'ocr-only' | 'ref-only'} status
 * @property {ParsedPlayer | null} ocrPlayer
 * @property {ReferencePlayer | null} refPlayer
 * @property {number} confidence - Match confidence 0-100
 */

/**
 * @typedef {Object} TeamComparison
 * @property {string} ocrTeamName - Team name from OCR
 * @property {string} refTeamName - Team name from reference
 * @property {ComparisonResult[]} results
 * @property {number} matchCount
 * @property {number} ocrOnlyCount
 * @property {number} refOnlyCount
 */

/**
 * Normalize a string for comparison (lowercase, remove accents, trim)
 * @param {string} str
 * @returns {string}
 */
function normalizeForComparison(str) {
  if (!str) return '';
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

  if (!n1 || !n2) return 0;
  if (n1 === n2) return 100;

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
  if (totalWords === 0) return 0;

  return Math.round((matchingWords / totalWords) * 85);
}

/**
 * Find the best matching reference player for an OCR player
 * @param {ParsedPlayer} ocrPlayer
 * @param {ReferencePlayer[]} refPlayers
 * @param {Set<string>} usedRefIds - Already matched reference player IDs
 * @returns {{ player: ReferencePlayer | null, confidence: number }}
 */
function findBestMatch(ocrPlayer, refPlayers, usedRefIds) {
  let bestMatch = null;
  let bestConfidence = 0;

  for (const refPlayer of refPlayers) {
    if (usedRefIds.has(refPlayer.id)) continue;

    let confidence = 0;

    // Check shirt number match (strong signal if both have numbers)
    const numberMatch =
      ocrPlayer.shirtNumber !== null &&
      refPlayer.shirtNumber !== null &&
      ocrPlayer.shirtNumber === refPlayer.shirtNumber;

    if (numberMatch) {
      confidence += 40;
    }

    // Check last name similarity
    const lastNameSim = calculateNameSimilarity(ocrPlayer.lastName, refPlayer.lastName);
    confidence += lastNameSim * 0.35;

    // Check first name similarity
    const firstNameSim = calculateNameSimilarity(ocrPlayer.firstName, refPlayer.firstName);
    confidence += firstNameSim * 0.25;

    // Bonus for libero match
    if (ocrPlayer.isLibero === refPlayer.isLibero && ocrPlayer.isLibero) {
      confidence += 5;
    }

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
 * Compare OCR players with reference players
 * @param {ParsedTeam} ocrTeam
 * @param {ReferenceTeam} refTeam
 * @returns {TeamComparison}
 */
function compareTeams(ocrTeam, refTeam) {
  /** @type {ComparisonResult[]} */
  const results = [];
  const usedRefIds = new Set();

  const ocrPlayers = getAllPlayers(ocrTeam);

  // First pass: find matches for OCR players
  for (const ocrPlayer of ocrPlayers) {
    const { player: matchedRef, confidence } = findBestMatch(
      ocrPlayer,
      refTeam.players,
      usedRefIds,
    );

    if (matchedRef) {
      usedRefIds.add(matchedRef.id);
      results.push({
        status: 'match',
        ocrPlayer,
        refPlayer: matchedRef,
        confidence,
      });
    } else {
      results.push({
        status: 'ocr-only',
        ocrPlayer,
        refPlayer: null,
        confidence: 0,
      });
    }
  }

  // Second pass: find unmatched reference players
  for (const refPlayer of refTeam.players) {
    if (!usedRefIds.has(refPlayer.id)) {
      results.push({
        status: 'ref-only',
        ocrPlayer: null,
        refPlayer,
        confidence: 0,
      });
    }
  }

  // Sort: matches first, then ocr-only, then ref-only
  results.sort((a, b) => {
    const order = { match: 0, 'ocr-only': 1, 'ref-only': 2 };
    return order[a.status] - order[b.status];
  });

  return {
    ocrTeamName: ocrTeam.name,
    refTeamName: refTeam.name,
    results,
    matchCount: results.filter((r) => r.status === 'match').length,
    ocrOnlyCount: results.filter((r) => r.status === 'ocr-only').length,
    refOnlyCount: results.filter((r) => r.status === 'ref-only').length,
  };
}

/**
 * Try to match OCR teams to reference teams
 * Since we don't know which column is which team, we try both combinations
 * and pick the one with more matches
 * @param {ParsedTeam} ocrTeamA
 * @param {ParsedTeam} ocrTeamB
 * @param {ReferenceTeam} refTeamA
 * @param {ReferenceTeam} refTeamB
 * @returns {{ team1: TeamComparison, team2: TeamComparison, swapped: boolean }}
 */
function findBestTeamMapping(ocrTeamA, ocrTeamB, refTeamA, refTeamB) {
  // Try mapping: ocrA -> refA, ocrB -> refB
  const option1Team1 = compareTeams(ocrTeamA, refTeamA);
  const option1Team2 = compareTeams(ocrTeamB, refTeamB);
  const option1Score = option1Team1.matchCount + option1Team2.matchCount;

  // Try mapping: ocrA -> refB, ocrB -> refA
  const option2Team1 = compareTeams(ocrTeamA, refTeamB);
  const option2Team2 = compareTeams(ocrTeamB, refTeamA);
  const option2Score = option2Team1.matchCount + option2Team2.matchCount;

  if (option2Score > option1Score) {
    return { team1: option2Team1, team2: option2Team2, swapped: true };
  }

  return { team1: option1Team1, team2: option1Team2, swapped: false };
}

/**
 * Render a single comparison result row
 * @param {ComparisonResult} result
 * @returns {string}
 */
function renderComparisonRow(result) {
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

  if (result.status === 'match') {
    return `
      <div class="comparison-row ${rowClass}">
        <span class="comparison-icon">${icon}</span>
        <span class="comparison-number">${result.ocrPlayer?.shirtNumber ?? '-'}</span>
        <span class="comparison-name">${result.ocrPlayer?.displayName || ''}</span>
        <span class="comparison-confidence">${result.confidence}%</span>
      </div>
    `;
  }

  if (result.status === 'ocr-only') {
    return `
      <div class="comparison-row ${rowClass}">
        <span class="comparison-icon">${icon}</span>
        <span class="comparison-number">${result.ocrPlayer?.shirtNumber ?? '-'}</span>
        <span class="comparison-name">${result.ocrPlayer?.displayName || ''}</span>
        <span class="comparison-badge">Not in reference</span>
      </div>
    `;
  }

  // ref-only
  return `
    <div class="comparison-row ${rowClass}">
      <span class="comparison-icon">${icon}</span>
      <span class="comparison-number">${result.refPlayer?.shirtNumber ?? '-'}</span>
      <span class="comparison-name">${result.refPlayer?.displayName || ''}</span>
      <span class="comparison-badge comparison-badge--info">Not on sheet</span>
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
  const rows = comparison.results.map(renderComparisonRow).join('');

  return `
    <div class="comparison-panel">
      <div class="comparison-header">
        <h3 class="comparison-title">${label}</h3>
        <div class="comparison-teams">
          <span class="comparison-team-name" title="From OCR">${comparison.ocrTeamName || 'Unknown Team'}</span>
          <span class="comparison-arrow">→</span>
          <span class="comparison-team-name" title="Reference">${comparison.refTeamName}</span>
        </div>
      </div>
      <div class="comparison-stats">
        <span class="comparison-stat comparison-stat--match">
          <span class="comparison-stat-icon">✓</span>
          <span class="comparison-stat-value">${comparison.matchCount}</span>
          <span class="comparison-stat-label">Matched</span>
        </span>
        <span class="comparison-stat comparison-stat--warning">
          <span class="comparison-stat-icon">⚠</span>
          <span class="comparison-stat-value">${comparison.ocrOnlyCount}</span>
          <span class="comparison-stat-label">Not in ref</span>
        </span>
        <span class="comparison-stat comparison-stat--info">
          <span class="comparison-stat-icon">○</span>
          <span class="comparison-stat-value">${comparison.refOnlyCount}</span>
          <span class="comparison-stat-label">Not on sheet</span>
        </span>
      </div>
      <div class="comparison-list">
        ${rows}
      </div>
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
   * @param {Function} [options.onBack] - Callback when back button is clicked
   */
  constructor({ container, ocrText, onBack }) {
    this.container = container;
    this.ocrText = ocrText;
    this.onBack = onBack;

    this.render();
  }

  render() {
    // Parse OCR text
    const parsed = parseGameSheet(this.ocrText);

    // Get mock reference data
    const { teamA: refTeamA, teamB: refTeamB } = getMockReferenceData();

    // Find best team mapping
    const { team1, team2, swapped } = findBestTeamMapping(
      parsed.teamA,
      parsed.teamB,
      refTeamA,
      refTeamB,
    );

    // Render warnings if any
    const warningsHtml =
      parsed.warnings.length > 0
        ? `
      <div class="comparison-warnings">
        ${parsed.warnings.map((w) => `<p class="comparison-warning">${escapeHtml(w)}</p>`).join('')}
      </div>
    `
        : '';

    // Render mapping info if swapped
    const mappingInfo = swapped
      ? `<p class="comparison-mapping-info">Teams were automatically matched based on player names</p>`
      : '';

    this.container.innerHTML = `
      <div class="player-comparison">
        <div class="comparison-intro">
          <p class="text-muted">
            Comparing extracted players with reference roster data.
            Players are matched by shirt number and name similarity.
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
            <span>Player matched in reference list</span>
          </div>
          <div class="legend-item">
            <span class="legend-icon legend-icon--warning">⚠</span>
            <span>Player on sheet but not in reference (verify)</span>
          </div>
          <div class="legend-item">
            <span class="legend-icon legend-icon--info">○</span>
            <span>Player in reference but not on sheet</span>
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
