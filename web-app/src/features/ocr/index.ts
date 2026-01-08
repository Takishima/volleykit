/**
 * OCR Feature
 *
 * Provides OCR (Optical Character Recognition) capabilities for
 * extracting player data from volleyball scoresheets.
 *
 * Supports both manuscript (handwritten) and electronic (printed) scoresheets.
 *
 * @example
 * ```tsx
 * import { useOCRScoresheet, compareRosters } from '@/features/ocr';
 *
 * function ScoresheetScanner({ rosterPlayers }) {
 *   const { processImage, result, isProcessing } = useOCRScoresheet();
 *
 *   const handleScan = async (file: File) => {
 *     const parsed = await processImage(file);
 *     if (parsed) {
 *       const comparison = compareRosters(parsed.teamA.players, rosterPlayers);
 *       // Show comparison results...
 *     }
 *   };
 * }
 * ```
 */

// =============================================================================
// Types
// =============================================================================

export type {
  // OCR Engine Types
  OCRBoundingBox,
  OCRWord,
  OCRLine,
  OCRResult,
  OCRProgress,
  OnProgressCallback,
  OCREngine,
  // Parsed Scoresheet Types
  OfficialRole,
  ParsedPlayer,
  ParsedOfficial,
  ParsedTeam,
  ParsedGameSheet,
  // Comparison Types
  ComparisonStatus,
  PlayerComparisonResult,
  TeamComparisonResult,
  // Hook Types
  OCRScoresheetState,
  OCRScoresheetActions,
  UseOCRScoresheetReturn,
} from './types';

// =============================================================================
// Hooks
// =============================================================================

export { useOCRScoresheet } from './hooks/useOCRScoresheet';

// =============================================================================
// Services
// =============================================================================

export { OCRFactory } from './services/ocr-factory';
export { MistralOCR } from './services/mistral-ocr';
export { StubOCR } from './services/stub-ocr';

// =============================================================================
// Utilities
// =============================================================================

// Player list parsing
export {
  parseGameSheet,
  parseGameSheetWithType,
  parseElectronicSheet,
  parsePlayerName,
  parseOfficialName,
  normalizeName,
  getAllPlayers,
  getAllOfficials,
} from './utils/player-list-parser';
export type { ParseGameSheetOptions } from './utils/player-list-parser';

// Manuscript parsing
export { parseManuscriptSheet } from './utils/manuscript-parser';

// Scoresheet type
export type { ScoresheetType } from './utils/scoresheet-detector';

// Roster comparison
export {
  compareRosters,
  compareTeamRosters,
  calculateNameSimilarity,
  normalizeForComparison,
  calculateMatchScore,
} from './utils/roster-comparison';

export type { RosterPlayerForComparison } from './utils/roster-comparison';
