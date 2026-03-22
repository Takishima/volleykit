/**
 * Electronic Scoresheet Parser
 *
 * Parses OCR text from printed/electronic scoresheets using tab-separated columns.
 * Handles both two-column (both teams side-by-side) and single-column overflow rows.
 */

import { deduplicatePlayers } from '../dedup-players'
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
  MAX_HEADER_ROWS,
  isOfficialsHeader,
  isSignaturesSection,
  isLiberoSection,
  isSectionHeader,
  trySpaceSeparatedTwoColumnSplit,
  trySpaceSeparatedTeamNamesSplit,
  cleanTeamName,
  findPlayerListStart,
  extractTeamNames,
  parsePlayerFromParts,
  parseLiberoFromParts,
  parseOfficialFromParts,
} from './parsing-helpers'

import type { ParsedTeam, ParsedGameSheet } from '../../types'

// =============================================================================
// Parser State Machine
// =============================================================================

type ParserSection = 'header' | 'players' | 'libero' | 'officials' | 'done'

export interface ParserState {
  section: ParserSection
  headerRowsParsed: number
  teamA: ParsedTeam
  teamB: ParsedTeam
  /** Whether we've seen two-column player rows (6+ parts) */
  seenTwoColumnPlayers: boolean
  /** Whether Team A's column has ended (single-column rows go to Team B) */
  teamAColumnEnded: boolean
}

/**
 * Check if single-column rows should be assigned to Team B (overflow mode).
 */
export function isOverflowToTeamB(state: ParserState): boolean {
  return state.teamAColumnEnded || state.seenTwoColumnPlayers
}

export function processHeaderLine(
  parts: string[],
  line: string,
  state: ParserState
): ParserSection {
  if (state.headerRowsParsed === 0 && !isSectionHeader(line)) {
    if (parts.length >= 2) {
      state.teamA.name = cleanTeamName(parts[0]!)
      state.teamB.name = cleanTeamName(parts[1]!)
    } else if (parts.length === 1) {
      const spaceSplit = trySpaceSeparatedTeamNamesSplit(line)
      if (spaceSplit) {
        state.teamA.name = spaceSplit[0]
        state.teamB.name = spaceSplit[1]
      } else {
        state.teamA.name = cleanTeamName(parts[0]!)
      }
    }
    state.headerRowsParsed++
    return 'header'
  }

  if (isSectionHeader(line)) {
    return 'players'
  }

  state.headerRowsParsed++
  return state.headerRowsParsed > MAX_HEADER_ROWS ? 'players' : 'header'
}

function processPlayersLine(parts: string[], line: string, state: ParserState): void {
  if (parts.length < MIN_PARTS_SINGLE_COLUMN) {
    const spaceSplit = trySpaceSeparatedTwoColumnSplit(line)
    if (spaceSplit) {
      state.seenTwoColumnPlayers = true

      const playerA = parsePlayerFromParts(spaceSplit.teamAParts, 0)
      if (playerA) state.teamA.players.push(playerA)

      const playerB = parsePlayerFromParts(spaceSplit.teamBParts, 0)
      if (playerB) state.teamB.players.push(playerB)
    }
    return
  }

  const isTwoColumnRow = parts.length >= MIN_PARTS_TWO_COLUMN

  if (isTwoColumnRow) {
    state.seenTwoColumnPlayers = true

    const playerA = parsePlayerFromParts(parts, 0)
    if (playerA) state.teamA.players.push(playerA)

    const playerB = parsePlayerFromParts(parts, MIN_PARTS_SINGLE_COLUMN)
    if (playerB) state.teamB.players.push(playerB)
  } else {
    const player = parsePlayerFromParts(parts, 0)
    if (player) {
      if (isOverflowToTeamB(state)) {
        state.teamAColumnEnded = true
        state.teamB.players.push(player)
      } else {
        state.teamA.players.push(player)
      }
    }
  }
}

function processLiberoLine(parts: string[], state: ParserState): void {
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
    if (libero) {
      if (isOverflowToTeamB(state)) {
        state.teamB.players.push(libero)
      } else {
        state.teamA.players.push(libero)
      }
    }
  }
}

function processOfficialsLine(parts: string[], state: ParserState): void {
  if (parts.length < MIN_PARTS_OFFICIAL_SINGLE) return

  const isTwoColumnRow = parts.length >= MIN_PARTS_OFFICIAL_TWO_COL

  if (isTwoColumnRow) {
    const officialA = parseOfficialFromParts(parts, 0, 1)
    if (officialA) state.teamA.officials.push(officialA)

    const officialB = parseOfficialFromParts(parts, OFFICIAL_B_ROLE_IDX, OFFICIAL_B_NAME_IDX)
    if (officialB) state.teamB.officials.push(officialB)
  } else {
    const official = parseOfficialFromParts(parts, 0, 1)
    if (official) {
      if (isOverflowToTeamB(state)) {
        state.teamB.officials.push(official)
      } else {
        state.teamA.officials.push(official)
      }
    }
  }
}

function processLine(line: string, state: ParserState): void {
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
      processPlayersLine(parts, line, state)
      break
    case 'libero':
      processLiberoLine(parts, state)
      break
    case 'officials':
      processOfficialsLine(parts, state)
      break
  }
}

// =============================================================================
// Main Electronic Parser
// =============================================================================

/**
 * Parse the OCR text output into structured player lists
 */
export function parseGameSheet(ocrText: string): ParsedGameSheet {
  const warnings: string[] = []
  const state: ParserState = {
    section: 'header',
    headerRowsParsed: 0,
    teamA: { name: '', players: [], officials: [] },
    teamB: { name: '', players: [], officials: [] },
    seenTwoColumnPlayers: false,
    teamAColumnEnded: false,
  }

  if (!ocrText || typeof ocrText !== 'string') {
    warnings.push('No OCR text provided')
    return { teamA: state.teamA, teamB: state.teamB, warnings }
  }

  const allLines = ocrText
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
    processLine(line, state)
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

/**
 * Alias for parseGameSheet (electronic format)
 */
export const parseElectronicSheet = parseGameSheet
