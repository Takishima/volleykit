/**
 * Manuscript Scoresheet Parser
 *
 * Parses OCR text from handwritten (manuscript) scoresheets.
 * Handles common OCR artifacts and variable formatting typical of handwritten text.
 *
 * Key differences from electronic parser:
 * - No consistent tab separation - uses pattern matching
 * - Handles common OCR character misreads (0/O, 1/I/l, 5/S, etc.)
 * - More flexible spacing and delimiter handling
 * - Fuzzy number recognition
 *
 * Supports two manuscript formats:
 * 1. Simple sequential format: Team A section followed by Team B section
 * 2. Swiss tabular format: Two-column layout with both teams side-by-side,
 *    where OCR reads horizontally concatenating data from both columns
 */

import { parseSequentialSheet } from './sequential'
import { isSwissTabularFormat, parseSwissTabularSheet } from './swiss-tabular'

import type { ParsedGameSheet, ParsedTeam } from '../../types'

// Re-export everything that consumers need
export { correctDigits, correctLetters, extractShirtNumber } from './ocr-corrections'
export { normalizeName, parsePlayerName, parseOfficialName } from './name-parsing'
export {
  splitConcatenatedNames,
  splitConcatenatedDates,
  splitConcatenatedNumbers,
} from './concatenated-data'
export { isSwissTabularFormat, extractSwissTeamNames } from './swiss-tabular'

/**
 * Parse manuscript (handwritten) scoresheet OCR text
 *
 * @param ocrText - Raw OCR text from manuscript scoresheet
 * @returns Parsed game sheet with both teams
 *
 * @example
 * ```typescript
 * const result = parseManuscriptSheet(ocrText);
 * console.log(result.teamA.players); // Parsed players for team A
 * ```
 */
export function parseManuscriptSheet(ocrText: string): ParsedGameSheet {
  const warnings: string[] = []

  const emptyTeam: ParsedTeam = { name: '', players: [], officials: [] }

  if (!ocrText || typeof ocrText !== 'string') {
    warnings.push('No OCR text provided')
    return { teamA: { ...emptyTeam }, teamB: { ...emptyTeam }, warnings }
  }

  // Split into lines and filter empty
  const lines = ocrText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  if (lines.length === 0) {
    warnings.push('OCR text contains no lines')
    return { teamA: { ...emptyTeam }, teamB: { ...emptyTeam }, warnings }
  }

  // Check if this is a Swiss tabular format (two-column layout)
  if (isSwissTabularFormat(ocrText)) {
    return parseSwissTabularSheet(ocrText)
  }

  // Fall back to standard sequential format parsing
  return parseSequentialSheet(lines)
}
