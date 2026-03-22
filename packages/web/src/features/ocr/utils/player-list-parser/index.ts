/**
 * Player List Parser
 *
 * Parses OCR text output into structured player lists for both teams.
 * Supports both electronic (tab-separated) and manuscript (handwritten) scoresheets.
 *
 * Entry points:
 * - parseGameSheet: Parse electronic scoresheet text
 * - parseGameSheetWithType: Parse with explicit type selection
 * - parseGameSheetWithOCR: Parse with bounding box column detection
 */

import { parseManuscriptSheet } from '../manuscript-parser'
import { parseElectronicSheet } from './electronic-parser'

import type { ParsedGameSheet } from '../../types'
import type { ScoresheetType } from '../scoresheet-detector'

// Re-export everything consumers need
export { normalizeName, parsePlayerName, parseOfficialName } from './parsing-helpers'
export { getAllPlayers, getAllOfficials } from './parsing-helpers'
export { parseGameSheet, parseElectronicSheet } from './electronic-parser'
export { parseGameSheetWithOCR } from './ocr-aware-parser'
export type { ParseGameSheetWithOCROptions } from './ocr-aware-parser'

/**
 * Options for parseGameSheet
 */
export interface ParseGameSheetOptions {
  /**
   * Type of scoresheet to parse
   * - 'electronic': Tab-separated format from printed/electronic scoresheets
   * - 'manuscript': Handwritten format with variable spacing
   * @default 'electronic'
   */
  type?: ScoresheetType
}

/**
 * Parse a game sheet using the appropriate parser based on scoresheet type
 *
 * This is the main entry point for parsing OCR text. The type parameter
 * determines which parsing strategy to use:
 * - 'electronic' (default): Uses tab-separated column parsing
 * - 'manuscript': Uses pattern matching for handwritten text
 *
 * @param ocrText - Raw OCR text from scanning the scoresheet
 * @param options - Parser options including scoresheet type
 * @returns Parsed game sheet with both teams
 */
export function parseGameSheetWithType(
  ocrText: string,
  options?: ParseGameSheetOptions
): ParsedGameSheet {
  const type = options?.type ?? 'electronic'

  if (type === 'manuscript') {
    return parseManuscriptSheet(ocrText)
  }

  return parseElectronicSheet(ocrText)
}
