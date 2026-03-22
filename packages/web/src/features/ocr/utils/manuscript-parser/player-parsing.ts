/**
 * Player Parsing
 *
 * Parses player data from Swiss tabular format columns, including
 * regular players, liberos, and concatenated OCR data.
 */

import { splitConcatenatedNames, splitConcatenatedDates } from './concatenated-data'
import { parsePlayerName } from './name-parsing'
import { MAX_SHIRT_NUMBER, MIN_NAME_LENGTH } from './ocr-corrections'

import type { ParsedPlayer, ParsedTeam } from '../../types'

// =============================================================================
// Constants
// =============================================================================

/** Total columns in 6-column Swiss tabular format (3 per team × 2 teams) */
export const TABULAR_TOTAL_COLUMNS = 6

/** Columns per team in 6-column Swiss tabular format (date, number, name) */
export const TABULAR_COLUMNS_PER_TEAM = 3

/** Maximum players per team in a volleyball roster */
const MAX_PLAYERS_PER_TEAM = 14

/** Maximum row number in scoresheet (used to detect row numbers vs jersey numbers) */
const MAX_ROW_NUMBER = 14

/** Minimum parts needed to parse a libero line */
const MIN_LIBERO_LINE_PARTS = 3

/** Date pattern - DD.MM.YY(YY) or incomplete OCR dates like DD.MM. (trailing dot, no year) */
export const DATE_PATTERN = /^\d{1,2}\.\d{1,2}\.\d{0,4}$/

/** Name pattern - starts with a letter */
export const NAME_START_PATTERN = /^[A-Za-zÀ-ÿ]/

/** Jersey number pattern (1-2 digits) */
export const JERSEY_NUMBER_PATTERN = /^\d{1,2}$/

/** Concatenated names pattern (e.g., "S. AngeliL. Collier") */
const CONCATENATED_NAMES_PATTERN = /[A-Z]\.\s*[A-Za-zÀ-ÿ]+[A-Z]\.\s*[A-Za-zÀ-ÿ]+/

/** Concatenated dates pattern (multiple dates concatenated) */
const CONCATENATED_DATES_PATTERN = /\d{1,2}\.\d{1,2}\.\d{2,4}.*\d{1,2}\.\d{1,2}\.\d{2,4}/

// =============================================================================
// Column-Based Player Parsing
// =============================================================================

/**
 * Parse a player from 3 columns: date (DOB), jersey number, and name.
 * Any column may be empty. Returns null if no valid name is found.
 */
export function parsePlayerFromColumns(
  col0: string,
  col1: string,
  col2: string
): ParsedPlayer | null {
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

// =============================================================================
// Libero Parsing
// =============================================================================

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
export function parseSwissLiberoLine(line: string): {
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

// =============================================================================
// Tabular Player Line Parsing
// =============================================================================

/**
 * Parse a 6-column tab-separated player line from Swiss tabular format.
 */
export function parseSwissTabularPlayerLine(
  line: string,
  teamA: ParsedTeam,
  teamB: ParsedTeam
): boolean {
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
export function extractConcatenatedData(parts: string[]): {
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
export function addPlayersFromExtractedData(
  team: ParsedTeam,
  names: string[],
  dates: string[]
): void {
  for (let i = 0; i < names.length; i++) {
    if (team.players.length >= MAX_PLAYERS_PER_TEAM) break
    const player = createPlayerFromName(names[i]!, dates[i])
    team.players.push(player)
  }
}
