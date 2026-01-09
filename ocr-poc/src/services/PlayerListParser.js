/**
 * Player List Parser
 *
 * Bridge module that imports parsing logic from the main web-app.
 * This allows the OCR POC to use the same parsing logic as the production app.
 *
 * The main app has comprehensive parsing support for:
 * - Electronic scoresheets (tab-separated format)
 * - Manuscript scoresheets (handwritten with OCR error correction)
 * - Bounding box-aware parsing for better column detection
 * - Swiss-specific formats (tabular layout, multilingual headers)
 *
 * NOTE: We import from specific utility files rather than the barrel file
 * because the barrel file exports React hooks which would require React.
 */

// Import parsing utilities directly (no React dependency)
import {
  parseGameSheet as parseElectronicSheet,
  parseGameSheetWithType,
  parseGameSheetWithOCR,
  parsePlayerName,
  parseOfficialName,
  normalizeName,
  getAllPlayers,
  getAllOfficials,
} from '@volleykit/ocr/utils/player-list-parser';

// Import roster comparison utilities directly (no React dependency)
import {
  compareRosters,
  compareTeamRosters,
  calculateMatchScore,
  calculateNameSimilarity,
  normalizeForComparison,
} from '@volleykit/ocr/utils/roster-comparison';

/**
 * Parse a game sheet from OCR text.
 *
 * This function automatically selects the appropriate parser based on the
 * scoresheet type (electronic vs manuscript).
 *
 * @param {string} ocrText - Raw OCR text from scanning the scoresheet
 * @param {{ type?: 'electronic' | 'manuscript' }} [options] - Parser options
 * @returns {import('@volleykit/ocr/types').ParsedGameSheet} Parsed game sheet with both teams
 *
 * @example
 * // Parse electronic scoresheet (default)
 * const result = parseGameSheet(ocrText);
 *
 * @example
 * // Parse manuscript (handwritten) scoresheet
 * const result = parseGameSheet(ocrText, { type: 'manuscript' });
 */
export function parseGameSheet(ocrText, options) {
  if (options?.type) {
    return parseGameSheetWithType(ocrText, options);
  }
  // Default to electronic parser for backwards compatibility
  return parseElectronicSheet(ocrText);
}

// Re-export all utilities for use in POC components
export {
  parseElectronicSheet,
  parseGameSheetWithType,
  parseGameSheetWithOCR,
  parsePlayerName,
  parseOfficialName,
  normalizeName,
  getAllPlayers,
  getAllOfficials,
  // Roster comparison utilities
  compareRosters,
  compareTeamRosters,
  calculateMatchScore,
  calculateNameSimilarity,
  normalizeForComparison,
};
