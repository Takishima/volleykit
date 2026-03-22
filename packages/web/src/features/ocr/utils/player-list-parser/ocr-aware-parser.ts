/**
 * OCR-Aware Parser (with bounding box column detection)
 *
 * Enhanced parser that uses word bounding boxes from the OCR engine to accurately
 * determine column boundaries and team assignment for single-column overflow rows.
 */

import { deduplicatePlayers } from '../dedup-players'
import { parseManuscriptSheet } from '../manuscript-parser'
import { type ParserState, processHeaderLine, isOverflowToTeamB } from './electronic-parser'
import { parseGameSheet } from './electronic-parser'
import {
  MIN_PARTS_SINGLE_COLUMN,
  MIN_PARTS_TWO_COLUMN,
  MIN_PARTS_OFFICIAL_SINGLE,
  MIN_PARTS_OFFICIAL_TWO_COL,
  LIBERO_TWO_COL_A_MARKER_IDX,
  LIBERO_TWO_COL_A_NAME_IDX,
  LIBERO_TWO_COL_A_LICENSE_IDX,
  LIBERO_TWO_COL_B_MARKER_IDX,
  LIBERO_TWO_COL_B_NAME_IDX,
  LIBERO_TWO_COL_B_LICENSE_IDX,
  OFFICIAL_B_ROLE_IDX,
  OFFICIAL_B_NAME_IDX,
  isOfficialsHeader,
  isSignaturesSection,
  isLiberoSection,
  findPlayerListStart,
  extractTeamNames,
  parsePlayerFromParts,
  parseLiberoFromParts,
  parseOfficialFromParts,
} from './parsing-helpers'

import type { ParsedGameSheet, OCRResult, OCRLine } from '../../types'
import type { ScoresheetType } from '../scoresheet-detector'

// =============================================================================
// Constants
// =============================================================================

/** Minimum words in a line to consider for column boundary detection */
const MIN_WORDS_FOR_COLUMN_DETECTION = 4
/** Minimum gap in pixels between columns to consider as column separator */
const MIN_COLUMN_GAP_PX = 50

// =============================================================================
// Column Boundary Detection
// =============================================================================

/**
 * Column boundary threshold calculated from OCR bounding boxes
 */
interface ColumnBoundary {
  /** X coordinate threshold - content to the left is Team A, right is Team B */
  midpoint: number
  /** Whether we have enough data to determine column boundaries */
  isValid: boolean
}

/**
 * Reconstruct an OCR line with proper tab separation using bounding boxes.
 */
function reconstructLineWithTabs(ocrLine: OCRLine, boundary: ColumnBoundary): string {
  if (ocrLine.text.includes('\t')) {
    return ocrLine.text
  }

  if (!boundary.isValid || !ocrLine.words || ocrLine.words.length === 0) {
    return ocrLine.text
  }

  const sortedWords = [...ocrLine.words].sort((a, b) => a.bbox.x0 - b.bbox.x0)

  const leftWords: string[] = []
  const rightWords: string[] = []

  for (const word of sortedWords) {
    const wordCenterX = (word.bbox.x0 + word.bbox.x1) / 2
    if (wordCenterX < boundary.midpoint) {
      leftWords.push(word.text)
    } else {
      rightWords.push(word.text)
    }
  }

  if (leftWords.length === 0 || rightWords.length === 0) {
    return ocrLine.text
  }

  return `${leftWords.join(' ')}\t${rightWords.join(' ')}`
}

/**
 * Analyze OCR lines to determine column boundaries based on word positions.
 */
function calculateColumnBoundary(lines: OCRLine[]): ColumnBoundary {
  const leftColumnMaxX: number[] = []
  const rightColumnMinX: number[] = []

  for (const line of lines) {
    if (!line.words || line.words.length < MIN_WORDS_FOR_COLUMN_DETECTION) continue

    const text = line.text
    const parts = text.split('\t').filter((p) => p.trim().length > 0)
    if (parts.length < MIN_PARTS_TWO_COLUMN) continue

    const sortedWords = [...line.words].sort((a, b) => a.bbox.x0 - b.bbox.x0)

    let maxGap = 0
    let gapIndex = -1

    for (let i = 0; i < sortedWords.length - 1; i++) {
      const gap = sortedWords[i + 1]!.bbox.x0 - sortedWords[i]!.bbox.x1
      if (gap > maxGap) {
        maxGap = gap
        gapIndex = i
      }
    }

    if (gapIndex >= 0 && maxGap > MIN_COLUMN_GAP_PX) {
      const leftEnd = sortedWords[gapIndex]!.bbox.x1
      const rightStart = sortedWords[gapIndex + 1]!.bbox.x0

      leftColumnMaxX.push(leftEnd)
      rightColumnMinX.push(rightStart)
    }
  }

  if (leftColumnMaxX.length < 2 || rightColumnMinX.length < 2) {
    return { midpoint: 0, isValid: false }
  }

  const avgLeftEnd = leftColumnMaxX.reduce((a, b) => a + b, 0) / leftColumnMaxX.length
  const avgRightStart = rightColumnMinX.reduce((a, b) => a + b, 0) / rightColumnMinX.length

  const midpoint = (avgLeftEnd + avgRightStart) / 2

  return { midpoint, isValid: true }
}

/**
 * Determine which team a single-column line belongs to based on word positions.
 */
function determineTeamFromPosition(line: OCRLine, boundary: ColumnBoundary): 'A' | 'B' {
  if (!boundary.isValid || !line.words || line.words.length === 0) {
    return 'B'
  }

  const avgX = line.words.reduce((sum, word) => sum + word.bbox.x0, 0) / line.words.length

  return avgX < boundary.midpoint ? 'A' : 'B'
}

// =============================================================================
// Extended Parser State
// =============================================================================

interface ParserStateWithOCR extends ParserState {
  columnBoundary: ColumnBoundary
  currentLine?: OCRLine
}

// =============================================================================
// OCR-Aware Line Processors
// =============================================================================

function processPlayersLineWithOCR(parts: string[], state: ParserStateWithOCR): void {
  if (parts.length < MIN_PARTS_SINGLE_COLUMN) return

  const isTwoColumnRow = parts.length >= MIN_PARTS_TWO_COLUMN

  if (isTwoColumnRow) {
    state.seenTwoColumnPlayers = true

    const playerA = parsePlayerFromParts(parts, 0)
    if (playerA) state.teamA.players.push(playerA)

    const playerB = parsePlayerFromParts(parts, MIN_PARTS_SINGLE_COLUMN)
    if (playerB) state.teamB.players.push(playerB)
  } else {
    const player = parsePlayerFromParts(parts, 0)
    if (player && state.currentLine) {
      const team = determineTeamFromPosition(state.currentLine, state.columnBoundary)
      if (team === 'A') {
        state.teamA.players.push(player)
      } else {
        state.teamAColumnEnded = true
        state.teamB.players.push(player)
      }
    } else if (player) {
      if (state.seenTwoColumnPlayers) {
        state.teamAColumnEnded = true
        state.teamB.players.push(player)
      } else {
        state.teamA.players.push(player)
      }
    }
  }
}

function processLiberoLineWithOCR(parts: string[], state: ParserStateWithOCR): void {
  if (parts.length < MIN_PARTS_SINGLE_COLUMN) return

  const isTwoColumnRow = parts.length >= MIN_PARTS_TWO_COLUMN

  if (isTwoColumnRow) {
    const liberoA = parseLiberoFromParts(
      parts,
      LIBERO_TWO_COL_A_MARKER_IDX,
      LIBERO_TWO_COL_A_NAME_IDX,
      LIBERO_TWO_COL_A_LICENSE_IDX
    )
    if (liberoA) state.teamA.players.push(liberoA)

    const liberoB = parseLiberoFromParts(
      parts,
      LIBERO_TWO_COL_B_MARKER_IDX,
      LIBERO_TWO_COL_B_NAME_IDX,
      LIBERO_TWO_COL_B_LICENSE_IDX
    )
    if (liberoB) state.teamB.players.push(liberoB)
  } else {
    const libero = parseLiberoFromParts(parts, 0, 1, 2)
    if (libero && state.currentLine) {
      const team = determineTeamFromPosition(state.currentLine, state.columnBoundary)
      if (team === 'A') {
        state.teamA.players.push(libero)
      } else {
        state.teamB.players.push(libero)
      }
    } else if (libero) {
      if (isOverflowToTeamB(state)) {
        state.teamB.players.push(libero)
      } else {
        state.teamA.players.push(libero)
      }
    }
  }
}

function processOfficialsLineWithOCR(parts: string[], state: ParserStateWithOCR): void {
  if (parts.length < MIN_PARTS_OFFICIAL_SINGLE) return

  const isTwoColumnRow = parts.length >= MIN_PARTS_OFFICIAL_TWO_COL

  if (isTwoColumnRow) {
    const officialA = parseOfficialFromParts(parts, 0, 1)
    if (officialA) state.teamA.officials.push(officialA)

    const officialB = parseOfficialFromParts(parts, OFFICIAL_B_ROLE_IDX, OFFICIAL_B_NAME_IDX)
    if (officialB) state.teamB.officials.push(officialB)
  } else {
    const official = parseOfficialFromParts(parts, 0, 1)
    if (official && state.currentLine) {
      const team = determineTeamFromPosition(state.currentLine, state.columnBoundary)
      if (team === 'A') {
        state.teamA.officials.push(official)
      } else {
        state.teamB.officials.push(official)
      }
    } else if (official) {
      if (isOverflowToTeamB(state)) {
        state.teamB.officials.push(official)
      } else {
        state.teamA.officials.push(official)
      }
    }
  }
}

function processLineWithOCR(line: string, state: ParserStateWithOCR, ocrLine?: OCRLine): void {
  state.currentLine = ocrLine

  if (isSignaturesSection(line)) {
    state.section = 'done'
    return
  }
  if (state.section === 'done') return

  if (isOfficialsHeader(line)) {
    state.section = 'officials'
    return
  }

  const parts = line.split('\t').map((p) => p.trim())

  if (isLiberoSection(line, parts)) {
    state.section = 'libero'
    return
  }

  switch (state.section) {
    case 'header':
      state.section = processHeaderLine(parts, line, state)
      break
    case 'players':
      processPlayersLineWithOCR(parts, state)
      break
    case 'libero':
      processLiberoLineWithOCR(parts, state)
      break
    case 'officials':
      processOfficialsLineWithOCR(parts, state)
      break
  }
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Options for parseGameSheetWithOCR
 */
export interface ParseGameSheetWithOCROptions {
  /** Type of scoresheet (affects parsing strategy). Defaults to 'electronic'. */
  type?: ScoresheetType
}

/**
 * Parse a game sheet using full OCR result with bounding box data.
 */
export function parseGameSheetWithOCR(
  ocrResult: OCRResult,
  options?: ParseGameSheetWithOCROptions
): ParsedGameSheet {
  const type = options?.type ?? 'electronic'

  if (type === 'manuscript') {
    return parseManuscriptSheet(ocrResult.fullText)
  }

  const warnings: string[] = []

  if (!ocrResult.lines || ocrResult.lines.length === 0) {
    const fallbackResult = parseGameSheet(ocrResult.fullText)
    return {
      ...fallbackResult,
      warnings: ['No OCR line data available, using text-only parsing', ...fallbackResult.warnings],
    }
  }

  const columnBoundary = calculateColumnBoundary(ocrResult.lines)

  if (!columnBoundary.isValid) {
    warnings.push(
      'Could not determine column boundaries from bounding boxes, using heuristic fallback'
    )
  }

  const state: ParserStateWithOCR = {
    section: 'header',
    headerRowsParsed: 0,
    teamA: { name: '', players: [], officials: [] },
    teamB: { name: '', players: [], officials: [] },
    seenTwoColumnPlayers: false,
    teamAColumnEnded: false,
    columnBoundary,
  }

  const reconstructedLines: string[] = []
  const lineToOCRLine = new Map<string, OCRLine>()

  for (const ocrLine of ocrResult.lines) {
    const normalizedText = ocrLine.text.trim()
    if (!normalizedText) continue

    const reconstructed = reconstructLineWithTabs(ocrLine, columnBoundary)
    reconstructedLines.push(reconstructed)

    lineToOCRLine.set(normalizedText, ocrLine)
    if (reconstructed !== normalizedText) {
      lineToOCRLine.set(reconstructed, ocrLine)
    }
  }

  const allLines =
    reconstructedLines.length > 0
      ? reconstructedLines
      : ocrResult.fullText
          .split('\n')
          .map((l) => l.trim())
          .filter((l) => l.length > 0)

  const { startIndex, teamNamesIndex } = findPlayerListStart(allLines)

  if (startIndex > 0) {
    warnings.push(`Skipped ${startIndex} lines of non-player data (score/set information)`)
  }

  const { teamAName, teamBName } = extractTeamNames(allLines, teamNamesIndex)
  state.teamA.name = teamAName
  state.teamB.name = teamBName

  const teamNamesFound = teamAName.length > 0 || teamBName.length > 0
  state.section = teamNamesFound ? 'players' : 'header'

  const lines = allLines.slice(startIndex)

  if (lines.length === 0) {
    warnings.push('OCR text contains no lines')
    return { teamA: state.teamA, teamB: state.teamB, warnings }
  }

  for (const line of lines) {
    const ocrLine = lineToOCRLine.get(line)
    processLineWithOCR(line, state, ocrLine)
  }

  deduplicatePlayers(state.teamA)
  deduplicatePlayers(state.teamB)

  if (state.teamA.players.length === 0) {
    warnings.push('No players found for Team A')
  }
  if (state.teamB.players.length === 0) {
    warnings.push('No players found for Team B')
  }
  if (state.teamA.officials.length === 0 && state.teamB.officials.length === 0) {
    warnings.push(
      'No officials (coaches) found - the OFFICIAL MEMBERS section may not have been recognized'
    )
  }

  return { teamA: state.teamA, teamB: state.teamB, warnings }
}
