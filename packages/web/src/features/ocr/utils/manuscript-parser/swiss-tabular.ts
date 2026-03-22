/**
 * Swiss Tabular Format Parser
 *
 * Parses OCR text from Swiss tabular manuscript scoresheets where both teams
 * are displayed side-by-side in a two-column layout, and OCR reads horizontally
 * concatenating data from both columns.
 */

import { deduplicatePlayers } from '../dedup-players'
import { splitConcatenatedNames, splitConcatenatedDates } from './concatenated-data'
import { parsePlayerName, parseOfficialName } from './name-parsing'
import { MAX_SHIRT_NUMBER, MIN_NAME_LENGTH } from './ocr-corrections'

import type {
  ParsedPlayer,
  ParsedOfficial,
  ParsedTeam,
  ParsedGameSheet,
  OfficialRole,
} from '../../types'

// =============================================================================
// Constants
// =============================================================================

/** Maximum tab-separated parts per line in sequential format (date, number, name) */
const MAX_SEQUENTIAL_PARTS_PER_LINE = 3

/** Total columns in 6-column Swiss tabular format (3 per team × 2 teams) */
const TABULAR_TOTAL_COLUMNS = 6

/** Columns per team in 6-column Swiss tabular format (date, number, name) */
const TABULAR_COLUMNS_PER_TEAM = 3

/** Valid official roles (C=Coach, AC=Assistant Coach, M=Medical, P=Physiotherapist) */
const VALID_ROLES = new Set(['C', 'AC', 'AC2', 'AC3', 'AC4', 'M', 'P'])

/** Maximum players per team in a volleyball roster */
const MAX_PLAYERS_PER_TEAM = 14

/** Maximum row number in scoresheet (used to detect row numbers vs jersey numbers) */
const MAX_ROW_NUMBER = 14

/** Minimum parts needed to parse a libero line */
const MIN_LIBERO_LINE_PARTS = 3

/** Date pattern - DD.MM.YY(YY) or incomplete OCR dates like DD.MM. (trailing dot, no year) */
const DATE_PATTERN = /^\d{1,2}\.\d{1,2}\.\d{0,4}$/

/** Name pattern - starts with a letter */
const NAME_START_PATTERN = /^[A-Za-zÀ-ÿ]/

/** Jersey number pattern (1-2 digits) */
const JERSEY_NUMBER_PATTERN = /^\d{1,2}$/

/** Concatenated names pattern (e.g., "S. AngeliL. Collier") */
const CONCATENATED_NAMES_PATTERN = /[A-Z]\.\s*[A-Za-zÀ-ÿ]+[A-Z]\.\s*[A-Za-zÀ-ÿ]+/

/** Concatenated dates pattern (multiple dates concatenated) */
const CONCATENATED_DATES_PATTERN = /\d{1,2}\.\d{1,2}\.\d{2,4}.*\d{1,2}\.\d{1,2}\.\d{2,4}/

/** Official line pattern (starts with C/AC followed by tab) */
const OFFICIAL_LINE_START_PATTERN = /^[CA]C?\d?\t/i

// =============================================================================
// Swiss Header & Noise Detection
// =============================================================================

/**
 * Multilingual header labels found in Swiss manuscript scoresheets
 * These indicate a tabular format where OCR reads horizontally
 */
export const SWISS_HEADER_PATTERNS = [
  /punkte.*points.*punti/i, // Score header (DE/FR/IT)
  /lizenz.*licence.*licenza/i, // License header (DE/FR/IT)
  /spieler.*joueur.*giocatore/i, // Player header (DE/FR/IT)
  /name.*nom.*nome/i, // Name header (DE/FR/IT)
  /mannschaft.*equipe.*squadra/i, // Team header (DE/FR/IT)
  /offizielle.*officiels.*ufficiali/i, // Officials header (DE/FR/IT)
  /kapitän.*capitaine.*capitano/i, // Captain header (DE/FR/IT)
  /trainer.*entraîneur.*allenatore/i, // Trainer header (DE/FR/IT)
  /oder\/ou\/o/i, // Common marker for "and/or" in Swiss forms (A oder/ou/o B)
]

/** Minimum length for noise line pattern match */
const NOISE_LINE_MIN_LENGTH = 10

const NOISE_PATTERNS = [
  /^[\d\s.]+$/, // Lines with only numbers, spaces, dots (e.g., "4 8 4 8 . 4 8...")
  /^["T:\s]+$/i, // Quote marks, T, and colons
  /^\d+$/, // Single numbers
]

/**
 * Check if a line is noise that should be filtered
 */
function isNoiseLine(line: string): boolean {
  const trimmed = line.trim()
  if (trimmed.length < 2) return true

  // Check for long sequences of digits and spaces
  if (trimmed.length >= NOISE_LINE_MIN_LENGTH && /^[\d\s]+$/.test(trimmed)) {
    return true
  }

  return NOISE_PATTERNS.some((pattern) => pattern.test(trimmed))
}

/** Minimum number of tab-separated lines required to detect Swiss tabular format */
const MIN_TAB_LINES_FOR_SWISS_FORMAT = 3

// =============================================================================
// Swiss Tabular Format Detection
// =============================================================================

/**
 * Detect if the OCR text appears to be from a Swiss tabular manuscript format
 * (two-column layout with both teams side-by-side).
 *
 * Distinguishes from sequential format (Team A section followed by Team B section)
 * which may also have Swiss headers and tabs but with fewer parts per line.
 */
export function isSwissTabularFormat(ocrText: string): boolean {
  const lines = ocrText.split('\n')

  // Check for Swiss multilingual headers
  const hasSwissHeaders = lines.some((line) =>
    SWISS_HEADER_PATTERNS.some((pattern) => pattern.test(line))
  )

  // Check for tab-separated content with multiple columns
  const tabSeparatedLines = lines.filter((line) => line.includes('\t'))
  const hasTabularStructure = tabSeparatedLines.length >= MIN_TAB_LINES_FOR_SWISS_FORMAT

  // Check for concatenated names pattern (e.g., "S. AngeliL. Collier")
  const hasConcatenatedNames = /[A-Z]\.\s*[A-Za-zÀ-ÿ]+[A-Z]\.\s*[A-Za-zÀ-ÿ]+/.test(ocrText)

  if (!hasSwissHeaders) return false
  if (!hasTabularStructure && !hasConcatenatedNames) return false

  // Distinguish from sequential tab-separated format:
  // Swiss tabular lines contain data for BOTH teams (4+ parts per line),
  // while sequential format has data for ONE team per line (2-3 parts).
  // Only apply this check when there are enough non-header data lines to be conclusive.
  if (hasTabularStructure && !hasConcatenatedNames) {
    const minDataLinesForCheck = 3
    const dataLineParts = tabSeparatedLines
      .filter((line) => !SWISS_HEADER_PATTERNS.some((p) => p.test(line)))
      .map((line) => line.split('\t').filter((p) => p.trim().length > 0).length)
      .filter((count) => count > 0)

    if (dataLineParts.length >= minDataLinesForCheck) {
      // Sort and find median
      const sorted = [...dataLineParts].sort((a, b) => a - b)
      const median = sorted[Math.floor(sorted.length / 2)]!
      // Sequential format typically has ≤3 parts per line (date, number, name)
      // Swiss tabular has 4+ parts (data for both teams)
      if (median <= MAX_SEQUENTIAL_PARTS_PER_LINE) return false
    }
  }

  return true
}

// =============================================================================
// Swiss Tabular Team Name Extraction
// =============================================================================

/** Club prefixes used in Swiss volleyball team names */
const CLUB_PREFIXES = ['VTV', 'TV', 'VBC', 'BC', 'VC', 'SC', 'FC', 'STV', 'TSV', 'USC', 'US']

/** Minimum length for a valid team name */
const MIN_VALID_TEAM_NAME_LENGTH = 3

/**
 * Clean Swiss form markers from a text string
 */
function cleanSwissMarkers(text: string): string {
  return text
    .replace(/A? ?oder\/ou\/o ?B? ?/gi, ' ')
    .replace(/punkte[\s\S]*?punti\s*/i, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Remove trailing numbers from team name (like "1" in "VTV Horw 1")
 */
function removeTrailingNumbers(name: string): string {
  const trimmed = name.trim()
  const words = trimmed.split(/\s+/)
  while (words.length > 1 && /^\d+$/.test(words[words.length - 1]!)) {
    words.pop()
  }
  return words.join(' ')
}

/**
 * Extract team name starting from a club prefix position
 */
function extractTeamNameFromPosition(text: string, startIndex: number, prefix: string): string {
  const afterPrefix = text.substring(startIndex + prefix.length).trim()

  let endIndex = afterPrefix.length
  for (const otherPrefix of CLUB_PREFIXES) {
    const idx = afterPrefix.toUpperCase().indexOf(` ${otherPrefix} `)
    if (idx >= 0 && idx < endIndex) {
      endIndex = idx
    }
  }

  const teamName = afterPrefix.substring(0, endIndex).trim()
  return removeTrailingNumbers(`${prefix} ${teamName}`)
}

/**
 * Check if a prefix appears at a word boundary in the text
 */
function isWordBoundary(text: string, prefixIdx: number, prefixLength: number): boolean {
  const beforeOk = prefixIdx === 0 || /\s/.test(text[prefixIdx - 1]!)
  const afterIdx = prefixIdx + prefixLength
  const afterOk = afterIdx >= text.length || /\s/.test(text[afterIdx]!)
  return beforeOk && afterOk
}

/**
 * Find team name in a single part by looking for club prefixes
 */
function findTeamNameInPart(part: string): string | null {
  const cleanedPart = cleanSwissMarkers(part)
  const upperPart = cleanedPart.toUpperCase()

  for (const prefix of CLUB_PREFIXES) {
    const prefixIdx = upperPart.indexOf(prefix)
    if (prefixIdx < 0) continue

    if (!isWordBoundary(cleanedPart, prefixIdx, prefix.length)) continue

    const teamName = extractTeamNameFromPosition(cleanedPart, prefixIdx, prefix)
    if (teamName.length > MIN_VALID_TEAM_NAME_LENGTH) {
      return teamName
    }
  }

  return null
}

/**
 * Check if a line is header-only (all parts match header patterns)
 */
function isHeaderOnlyLine(parts: string[]): boolean {
  return parts.every((p) => SWISS_HEADER_PATTERNS.some((pat) => pat.test(p)))
}

/**
 * Extract team names from Swiss scoresheet header
 * Header format: "PunktePointsPunti\tAader/ou/oB TV St. Johann\tVTV Horw 1 Aader/ou/oB"
 */
export function extractSwissTeamNames(ocrText: string): { teamA: string; teamB: string } {
  const lines = ocrText.split('\n')

  for (const line of lines) {
    if (!line.includes('\t')) continue

    const parts = line.split('\t').map((p) => p.trim())
    if (isHeaderOnlyLine(parts)) continue

    const foundTeams: string[] = []
    for (const part of parts) {
      const teamName = findTeamNameInPart(part)
      if (teamName && !foundTeams.includes(teamName)) {
        foundTeams.push(teamName)
      }
    }

    if (foundTeams.length >= 2) {
      return { teamA: foundTeams[0]!, teamB: foundTeams[1]! }
    }
    if (foundTeams.length === 1) {
      return { teamA: foundTeams[0]!, teamB: '' }
    }
  }

  return { teamA: '', teamB: '' }
}

// =============================================================================
// Section Markers (shared with sequential format)
// =============================================================================

/**
 * Check if a line indicates the libero section
 */
export function isLiberoMarker(line: string): boolean {
  return line.toUpperCase().includes('LIBERO')
}

/**
 * Check if a line indicates the officials section
 * Note: We only match section headers, not individual official lines
 */
export function isOfficialsMarker(line: string): boolean {
  const upper = line.toUpperCase()
  return (
    upper.includes('OFFICIAL') ||
    upper.includes('OFFICIEL') ||
    upper.includes('OFFIZIEL') ||
    upper.includes('UFFICIALI') ||
    upper.startsWith('COACH') ||
    /^TRAINER\b/.test(upper)
  )
}

/**
 * Check if a line indicates end of player data (signature/captain/trainer section)
 */
export function isEndMarker(line: string): boolean {
  const upper = line.toUpperCase()
  return (
    upper.includes('SIGNATURE') ||
    upper.includes('UNTERSCHRIFT') ||
    upper.includes('CAPTAIN') ||
    upper.includes('KAPITÄN') ||
    upper.includes('CAPITAINE') ||
    upper.includes('CAPITANO') ||
    upper.includes('REFEREE') ||
    upper.includes('ARBITRE') ||
    /^TRAINER\b/i.test(line) ||
    upper.includes('ENTRAÎNEUR') ||
    upper.includes('ENTRAINEUR') ||
    upper.includes('ALLENATORE')
  )
}

// =============================================================================
// Player / Official Parsing Helpers
// =============================================================================

/**
 * Parse a player from 3 columns: date (DOB), jersey number, and name.
 * Any column may be empty. Returns null if no valid name is found.
 */
function parsePlayerFromColumns(col0: string, col1: string, col2: string): ParsedPlayer | null {
  let birthDate: string | undefined
  let jerseyNumber: number | null = null
  let name = ''

  if (DATE_PATTERN.test(col0)) {
    birthDate = col0
  }

  if (JERSEY_NUMBER_PATTERN.test(col1)) {
    const num = parseInt(col1, 10)
    if (num >= 1 && num <= MAX_SHIRT_NUMBER) {
      jerseyNumber = num
    }
  }

  if (col2 && NAME_START_PATTERN.test(col2) && col2.length >= MIN_NAME_LENGTH) {
    name = col2
  }

  if (!name) return null

  const parsed = parsePlayerName(name)
  return {
    shirtNumber: jerseyNumber,
    lastName: parsed.lastName,
    firstName: parsed.firstName,
    displayName: parsed.displayName,
    rawName: name,
    licenseStatus: '',
    birthDate,
  }
}

/**
 * Parse a single player's data from libero line parts
 * Returns the player and the new current index
 */
function parseLiberoPlayerData(
  parts: string[],
  startIndex: number
): { player: ParsedPlayer | null; nextIndex: number } {
  let currentIndex = startIndex
  let date = ''
  let jerseyNumber: number | null = null
  let name = ''

  if (currentIndex < parts.length && DATE_PATTERN.test(parts[currentIndex]!)) {
    date = parts[currentIndex]!
    currentIndex++
  }

  if (currentIndex < parts.length && JERSEY_NUMBER_PATTERN.test(parts[currentIndex]!)) {
    jerseyNumber = parseInt(parts[currentIndex]!, 10)
    if (jerseyNumber > MAX_SHIRT_NUMBER) jerseyNumber = null
    currentIndex++
  }

  if (currentIndex < parts.length && NAME_START_PATTERN.test(parts[currentIndex]!)) {
    name = parts[currentIndex]!
    currentIndex++
  }

  if (!name) {
    return { player: null, nextIndex: currentIndex }
  }

  const parsed = parsePlayerName(name)
  const player: ParsedPlayer = {
    shirtNumber: jerseyNumber,
    lastName: parsed.lastName,
    firstName: parsed.firstName,
    displayName: parsed.displayName,
    rawName: name,
    licenseStatus: '',
    birthDate: date || undefined,
  }

  return { player, nextIndex: currentIndex }
}

/**
 * Parse a tab-separated libero line from Swiss format
 */
function parseSwissLiberoLine(line: string): {
  teamA: ParsedPlayer | null
  teamB: ParsedPlayer | null
} {
  const rawParts = line.split('\t')

  if (rawParts.length === TABULAR_TOTAL_COLUMNS) {
    const teamA = parsePlayerFromColumns(
      rawParts[0]!.trim(),
      rawParts[1]!.trim(),
      rawParts[2]!.trim()
    )
    const teamB = parsePlayerFromColumns(
      rawParts[3]!.trim(),
      rawParts[4]!.trim(),
      rawParts[5]!.trim()
    )
    return { teamA, teamB }
  }

  const parts = rawParts.map((p) => p.trim()).filter((p) => p.length > 0)

  if (parts.length < MIN_LIBERO_LINE_PARTS) {
    return { teamA: null, teamB: null }
  }

  let currentIndex = 0

  if (JERSEY_NUMBER_PATTERN.test(parts[0]!) && parseInt(parts[0]!, 10) <= MAX_ROW_NUMBER) {
    currentIndex = 1
  }

  const teamAResult = parseLiberoPlayerData(parts, currentIndex)
  currentIndex = teamAResult.nextIndex

  const teamBResult = parseLiberoPlayerData(parts, currentIndex)

  return { teamA: teamAResult.player, teamB: teamBResult.player }
}

/**
 * Parse a 6-column tab-separated player line from Swiss tabular format.
 */
function parseSwissTabularPlayerLine(line: string, teamA: ParsedTeam, teamB: ParsedTeam): boolean {
  const parts = line.split('\t')

  if (parts.length !== TABULAR_TOTAL_COLUMNS) return false

  const teamACols = [parts[0]!.trim(), parts[1]!.trim(), parts[2]!.trim()]
  const teamBCols = [parts[3]!.trim(), parts[4]!.trim(), parts[5]!.trim()]

  let parsedAny = false

  const playerA = parsePlayerFromColumns(teamACols[0]!, teamACols[1]!, teamACols[2]!)
  if (playerA) {
    teamA.players.push(playerA)
    parsedAny = true
  }

  const playerB = parsePlayerFromColumns(teamBCols[0]!, teamBCols[1]!, teamBCols[2]!)
  if (playerB) {
    teamB.players.push(playerB)
    parsedAny = true
  }

  return parsedAny
}

/**
 * Normalize official role strings from Swiss forms.
 * AC1 → AC (Swiss forms use AC1 for first assistant coach, AC2 for second)
 */
function normalizeRole(role: string): string | null {
  const upper = role.toUpperCase()
  if (VALID_ROLES.has(upper)) return upper
  if (upper === 'AC1') return 'AC'
  return null
}

/**
 * Parse one official from parts starting at currentIndex.
 */
function parseOneOfficial(
  parts: string[],
  startIndex: number
): { official: ParsedOfficial | null; nextIndex: number } {
  let currentIndex = startIndex

  if (currentIndex < parts.length && DATE_PATTERN.test(parts[currentIndex]!)) {
    currentIndex++
  }

  if (currentIndex >= parts.length) {
    return { official: null, nextIndex: currentIndex }
  }

  const normalizedRole = normalizeRole(parts[currentIndex]!)
  if (!normalizedRole) {
    return { official: null, nextIndex: currentIndex }
  }
  currentIndex++

  if (currentIndex >= parts.length || !NAME_START_PATTERN.test(parts[currentIndex]!)) {
    return { official: null, nextIndex: currentIndex }
  }

  const name = parts[currentIndex]!
  currentIndex++
  const parsed = parseOfficialName(name)

  return {
    official: {
      role: normalizedRole as OfficialRole,
      lastName: parsed.lastName,
      firstName: parsed.firstName,
      displayName: parsed.displayName,
      rawName: name,
    },
    nextIndex: currentIndex,
  }
}

/**
 * Parse a tab-separated officials line from Swiss format
 */
function parseSwissOfficialsLine(line: string): {
  teamA: ParsedOfficial | null
  teamB: ParsedOfficial | null
} {
  const rawParts = line.split('\t')

  if (rawParts.length === TABULAR_TOTAL_COLUMNS) {
    const teamACols = rawParts.slice(0, TABULAR_COLUMNS_PER_TEAM).map((p) => p.trim())
    const teamBCols = rawParts
      .slice(TABULAR_COLUMNS_PER_TEAM, TABULAR_TOTAL_COLUMNS)
      .map((p) => p.trim())

    const teamAFiltered = teamACols.filter((p) => p.length > 0)
    const teamBFiltered = teamBCols.filter((p) => p.length > 0)

    const teamAResult = teamAFiltered.length > 0 ? parseOneOfficial(teamAFiltered, 0) : null
    const teamBResult = teamBFiltered.length > 0 ? parseOneOfficial(teamBFiltered, 0) : null

    return {
      teamA: teamAResult?.official ?? null,
      teamB: teamBResult?.official ?? null,
    }
  }

  const parts = rawParts.map((p) => p.trim()).filter((p) => p.length > 0)

  const teamAResult = parseOneOfficial(parts, 0)
  const teamBResult = parseOneOfficial(parts, teamAResult.nextIndex)

  return { teamA: teamAResult.official, teamB: teamBResult.official }
}

// =============================================================================
// Concatenated Data Processing
// =============================================================================

/**
 * Create a player from name and optional birth date
 */
function createPlayerFromName(name: string, birthDate?: string): ParsedPlayer {
  const parsed = parsePlayerName(name)
  return {
    shirtNumber: null,
    lastName: parsed.lastName,
    firstName: parsed.firstName,
    displayName: parsed.displayName,
    rawName: name,
    licenseStatus: '',
    birthDate,
  }
}

/**
 * Extract concatenated names and dates from tab-separated parts
 */
function extractConcatenatedData(parts: string[]): {
  firstHalfNames: string[]
  secondHalfNames: string[]
  firstHalfDates: string[]
  secondHalfDates: string[]
} {
  const firstHalfNames: string[] = []
  const secondHalfNames: string[] = []
  const firstHalfDates: string[] = []
  const secondHalfDates: string[] = []
  const midpoint = Math.ceil(parts.length / 2)

  for (let partIndex = 0; partIndex < parts.length; partIndex++) {
    const part = parts[partIndex]!
    const isFirstHalf = partIndex < midpoint

    if (CONCATENATED_NAMES_PATTERN.test(part)) {
      const names = splitConcatenatedNames(part)
      if (isFirstHalf) {
        firstHalfNames.push(...names)
      } else {
        secondHalfNames.push(...names)
      }
    }

    if (CONCATENATED_DATES_PATTERN.test(part)) {
      const dates = splitConcatenatedDates(part)
      if (isFirstHalf) {
        firstHalfDates.push(...dates)
      } else {
        secondHalfDates.push(...dates)
      }
    }
  }

  return { firstHalfNames, secondHalfNames, firstHalfDates, secondHalfDates }
}

/**
 * Add players to team from extracted names and dates
 */
function addPlayersFromExtractedData(team: ParsedTeam, names: string[], dates: string[]): void {
  for (let i = 0; i < names.length; i++) {
    if (team.players.length >= MAX_PLAYERS_PER_TEAM) break
    const player = createPlayerFromName(names[i]!, dates[i])
    team.players.push(player)
  }
}

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
 * Check if a line should be skipped (noise or header-only)
 */
function shouldSkipLine(line: string): boolean {
  if (isNoiseLine(line)) return true
  if (SWISS_HEADER_PATTERNS.some((pattern) => pattern.test(line))) {
    return true
  }
  return false
}

/**
 * Update section state based on line markers
 * Returns: 'libero' | 'officials' | 'end' | null
 */
function detectSectionMarker(line: string): 'libero' | 'officials' | 'end' | null {
  if (isLiberoMarker(line)) return 'libero'
  if (isOfficialsMarker(line)) return 'officials'
  if (isEndMarker(line)) return 'end'
  return null
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
