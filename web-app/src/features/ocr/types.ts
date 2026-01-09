/**
 * OCR Feature Types
 *
 * TypeScript interfaces for OCR services and parsed scoresheet data.
 */

// =============================================================================
// OCR Engine Types
// =============================================================================

/**
 * Bounding box coordinates for a recognized word
 */
export interface OCRBoundingBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/**
 * A single word recognized by OCR
 */
export interface OCRWord {
  /** The recognized text */
  text: string;
  /** Confidence score (0-100) */
  confidence: number;
  /** Bounding box coordinates */
  bbox: OCRBoundingBox;
}

/**
 * A line of text recognized by OCR
 */
export interface OCRLine {
  /** The full line text */
  text: string;
  /** Average confidence for the line (0-100) */
  confidence: number;
  /** Individual words in the line */
  words: OCRWord[];
}

/**
 * Complete OCR result from processing an image
 */
export interface OCRResult {
  /** Complete extracted text */
  fullText: string;
  /** Lines with words and confidence */
  lines: OCRLine[];
  /** All words with confidence scores */
  words: OCRWord[];
  /** Whether bounding boxes are precise pixel coordinates (false = estimated) */
  hasPreciseBoundingBoxes: boolean;
}

/**
 * Progress update during OCR processing
 */
export interface OCRProgress {
  /** Human-readable status message */
  status: string;
  /** Progress percentage (0-100) */
  progress: number;
}

/**
 * Callback for OCR progress updates
 */
export type OnProgressCallback = (progress: OCRProgress) => void;

/**
 * Interface for OCR engine implementations
 */
export interface OCREngine {
  /** Initialize the OCR engine */
  initialize(): Promise<void>;
  /** Process an image and extract text */
  recognize(imageBlob: Blob): Promise<OCRResult>;
  /** Clean up resources and cancel pending operations */
  terminate(): Promise<void>;
}

// =============================================================================
// Parsed Scoresheet Types
// =============================================================================

/**
 * Official role on a volleyball team
 */
export type OfficialRole = 'C' | 'AC' | 'AC2' | 'AC3' | 'AC4';

/**
 * A player parsed from OCR text
 */
export interface ParsedPlayer {
  /** Shirt number from OCR (for display only, not used for matching) */
  shirtNumber: number | null;
  /** Player's last name (normalized to title case) */
  lastName: string;
  /** Player's first name (normalized to title case) */
  firstName: string;
  /** Full display name (firstName lastName) */
  displayName: string;
  /** Original name from OCR before normalization */
  rawName: string;
  /** License status (e.g., "NOT", "LFP") */
  licenseStatus: string;
  /** Birth date in DD.MM.YY format (from Swiss manuscript scoresheets) */
  birthDate?: string;
}

/**
 * A team official (coach, assistant coach) parsed from OCR text
 */
export interface ParsedOfficial {
  /** Role on the team */
  role: OfficialRole;
  /** Last name (normalized) */
  lastName: string;
  /** First name (normalized) */
  firstName: string;
  /** Full display name */
  displayName: string;
  /** Original name from OCR */
  rawName: string;
}

/**
 * A team's roster parsed from OCR text
 */
export interface ParsedTeam {
  /** Team name from scoresheet */
  name: string;
  /** All players (including liberos) */
  players: ParsedPlayer[];
  /** Coaches and assistant coaches */
  officials: ParsedOfficial[];
}

/**
 * Complete parsed game sheet with both teams
 */
export interface ParsedGameSheet {
  /** First team (left column on scoresheet) */
  teamA: ParsedTeam;
  /** Second team (right column on scoresheet) */
  teamB: ParsedTeam;
  /** Parsing warnings (e.g., missing players, unrecognized sections) */
  warnings: string[];
}

// =============================================================================
// Comparison Types
// =============================================================================

/**
 * Result of comparing an OCR player against a roster player
 */
export type ComparisonStatus = 'match' | 'ocr-only' | 'roster-only';

/**
 * Result of comparing a single player
 */
export interface PlayerComparisonResult {
  /** Match status */
  status: ComparisonStatus;
  /** Player from OCR (null if roster-only) */
  ocrPlayer: ParsedPlayer | null;
  /** Player from roster (null if ocr-only) */
  rosterPlayerId: string | null;
  rosterPlayerName: string | null;
  /** Match confidence (0-100, 0 if no match) */
  confidence: number;
}

/**
 * Result of comparing OCR results against a full team roster
 */
export interface TeamComparisonResult {
  /** OCR team name */
  ocrTeamName: string;
  /** Reference team name */
  rosterTeamName: string;
  /** Individual player comparison results */
  playerResults: PlayerComparisonResult[];
  /** Summary counts */
  counts: {
    matched: number;
    ocrOnly: number;
    rosterOnly: number;
  };
}

// =============================================================================
// Hook Types
// =============================================================================

/**
 * State returned by useOCRScoresheet hook
 */
export interface OCRScoresheetState {
  /** Whether OCR is currently processing */
  isProcessing: boolean;
  /** Current progress (null if not processing) */
  progress: OCRProgress | null;
  /** Parsed result (null if not yet processed) */
  result: ParsedGameSheet | null;
  /** Raw OCR result with bounding boxes (null if not yet processed) */
  ocrResult: OCRResult | null;
  /** Error if processing failed */
  error: Error | null;
}

/**
 * Actions returned by useOCRScoresheet hook
 */
export interface OCRScoresheetActions {
  /** Process an image and extract player data */
  processImage: (
    imageBlob: Blob,
    scoresheetType?: 'electronic' | 'manuscript',
  ) => Promise<ParsedGameSheet | null>;
  /** Reset state to initial values */
  reset: () => void;
  /** Cancel ongoing processing */
  cancel: () => void;
}

/**
 * Complete return type for useOCRScoresheet hook
 */
export type UseOCRScoresheetReturn = OCRScoresheetState & OCRScoresheetActions;
