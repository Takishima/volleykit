/**
 * Swiss Tabular Format Parser
 *
 * Parses OCR text from Swiss tabular manuscript scoresheets where both teams
 * are displayed side-by-side in a two-column layout, and OCR reads horizontally
 * concatenating data from both columns.
 *
 * This module is a public API facade. Parsing logic is split into:
 * - table-detection.ts    — format detection, noise filtering, section markers
 * - team-name-extraction.ts — team name extraction from headers
 * - player-parsing.ts     — player/libero/concatenated data parsing
 * - official-parsing.ts   — official (coach, etc.) parsing
 */

import { deduplicatePlayers } from '../dedup-players'
import { OFFICIAL_LINE_START_PATTERN, parseSwissOfficialsLine } from './official-parsing'
import {
  parseSwissTabularPlayerLine,
  parseSwissLiberoLine,
  extractConcatenatedData,
  addPlayersFromExtractedData,
} from './player-parsing'
import { detectSectionMarker, shouldSkipLine } from './table-detection'
import { extractSwissTeamNames } from './team-name-extraction'

import type { ParsedTeam, ParsedGameSheet } from '../../types'

// =============================================================================
// Re-exports (public API)
// =============================================================================

// Used by sequential.ts
export {
  SWISS_HEADER_PATTERNS,
  isLiberoMarker,
  isOfficialsMarker,
  isEndMarker,
} from './table-detection'

// Used by index.ts
export { isSwissTabularFormat } from './table-detection'
export { extractSwissTeamNames } from './team-name-extraction'

// =============================================================================
// Line Processing Helpers
// =============================================================================

/**
 * Process a tab-separated line for officials or liberos
 */
function processStructuredLine(
  line: string,
  inOfficialsSection: boolean,
  inLiberoSection: boolean,
  teamA: ParsedTeam,
  teamB: ParsedTeam
): boolean {
  if (inOfficialsSection || OFFICIAL_LINE_START_PATTERN.test(line)) {
    const officials = parseSwissOfficialsLine(line)
    if (officials.teamA) teamA.officials.push(officials.teamA)
    if (officials.teamB) teamB.officials.push(officials.teamB)
    return true
  }

  if (inLiberoSection) {
    const liberos = parseSwissLiberoLine(line)
    if (liberos.teamA) teamA.players.push(liberos.teamA)
    if (liberos.teamB) teamB.players.push(liberos.teamB)
    return true
  }

  return false
}

/**
 * Generate warnings for parsed teams
 */
function generateTeamWarnings(teamA: ParsedTeam, teamB: ParsedTeam): string[] {
  const warnings: string[] = []
  if (teamA.players.length === 0) {
    warnings.push('No players found for Team A')
  }
  if (teamB.players.length === 0) {
    warnings.push('No players found for Team B')
  }
  if (teamA.officials.length === 0 && teamB.officials.length === 0) {
    warnings.push(
      'No officials (coaches) found - the OFFICIAL MEMBERS section may not have been recognized'
    )
  }
  return warnings
}

// =============================================================================
// Main Swiss Tabular Parser
// =============================================================================

/**
 * Parse Swiss tabular manuscript format
 * This format has both teams side-by-side with OCR reading horizontally
 */
export function parseSwissTabularSheet(ocrText: string): ParsedGameSheet {
  // Keep raw lines (don't trim) to preserve tab-based column alignment
  // Lines like "\t\t\t29.10.85\t15\tName" need leading tabs for 6-column parsing
  const rawLines = ocrText.split('\n')
  const teamNames = extractSwissTeamNames(ocrText)

  const teamA: ParsedTeam = { name: teamNames.teamA, players: [], officials: [] }
  const teamB: ParsedTeam = { name: teamNames.teamB, players: [], officials: [] }

  let inLiberoSection = false
  let inOfficialsSection = false

  for (const rawLine of rawLines) {
    const line = rawLine.trim()

    // Check section markers first (before skip) so multilingual headers
    // like "Offizielle/Officiels/Ufficiali" are detected as section markers
    // rather than skipped as Swiss header patterns
    const sectionMarker = detectSectionMarker(line)
    if (sectionMarker === 'end') break
    if (sectionMarker === 'libero') {
      inLiberoSection = true
      inOfficialsSection = false
      continue
    }
    if (sectionMarker === 'officials') {
      inOfficialsSection = true
      inLiberoSection = false
      continue
    }

    if (shouldSkipLine(line)) continue

    if (!line.includes('\t')) continue

    // Use rawLine for tab-based parsing to preserve column alignment
    if (processStructuredLine(rawLine, inOfficialsSection, inLiberoSection, teamA, teamB)) {
      continue
    }

    // Try parsing as 6-column tab-separated player row (date\tnum\tname per team)
    if (!inOfficialsSection && !inLiberoSection) {
      if (parseSwissTabularPlayerLine(rawLine, teamA, teamB)) {
        continue
      }
    }

    // Process concatenated player data (fallback for OCR that runs names together)
    const parts = line.split('\t')
    const data = extractConcatenatedData(parts)
    addPlayersFromExtractedData(teamA, data.firstHalfNames, data.firstHalfDates)
    addPlayersFromExtractedData(teamB, data.secondHalfNames, data.secondHalfDates)
  }

  // Deduplicate players (liberos often appear in both the main list and LIBERO section)
  deduplicatePlayers(teamA)
  deduplicatePlayers(teamB)

  const warnings = generateTeamWarnings(teamA, teamB)
  return { teamA, teamB, warnings }
}
