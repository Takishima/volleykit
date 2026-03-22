/**
 * Shared Parsing Helpers
 *
 * Name parsing, section detection, team name extraction, and player/official
 * parsing from tab-separated parts. Used by both electronic and OCR-aware parsers.
 */

import type { ParsedPlayer, ParsedOfficial, ParsedTeam, OfficialRole } from '../../types'

// =============================================================================
// Constants
// =============================================================================

/** Minimum parts required for single-column player data */
export const MIN_PARTS_SINGLE_COLUMN = 3
/** Minimum parts required for two-column (both teams) player data */
export const MIN_PARTS_TWO_COLUMN = 6
/** Minimum parts for single-column official */
export const MIN_PARTS_OFFICIAL_SINGLE = 2
/** Minimum parts for two-column official */
export const MIN_PARTS_OFFICIAL_TWO_COL = 4

/** Index positions for libero entries in two-column tab-separated format */
export const LIBERO_TWO_COL_A_MARKER_IDX = 0
export const LIBERO_TWO_COL_A_NAME_IDX = 1
export const LIBERO_TWO_COL_A_LICENSE_IDX = 2
export const LIBERO_TWO_COL_B_MARKER_IDX = 3
export const LIBERO_TWO_COL_B_NAME_IDX = 4
export const LIBERO_TWO_COL_B_LICENSE_IDX = 5

/** Index positions for official entries */
export const OFFICIAL_B_ROLE_IDX = 2
export const OFFICIAL_B_NAME_IDX = 3
/** Maximum header rows to parse before assuming players section */
export const MAX_HEADER_ROWS = 3
/** Lookback limit for finding team names */
const TEAM_NAME_LOOKBACK = 3
/** Minimum alphabetic length for team name detection */
export const MIN_ALPHA_LENGTH = 3
/** Maximum valid shirt number */
export const MAX_SHIRT_NUMBER = 99

/** Valid license status values that indicate end of a player entry */
export const LICENSE_STATUS_VALUES = new Set(['NOT', 'LFP', 'OK', 'NE', 'PEN'])

/** Minimum words needed for a valid two-column player line */
export const MIN_WORDS_TWO_COLUMN_PLAYER = 5

// =============================================================================
// Name Parsing Utilities
// =============================================================================

/**
 * Normalize a name from OCR (UPPERCASE) to title case
 */
export function normalizeName(name: string): string {
  if (!name) {
    return ''
  }
  return name
    .toLowerCase()
    .split(/[\s-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

/**
 * Parse a player name in "LASTNAME FIRSTNAME [MIDDLENAME]" format
 */
export function parsePlayerName(rawName: string): {
  lastName: string
  firstName: string
  displayName: string
} {
  if (!rawName || typeof rawName !== 'string') {
    return { lastName: '', firstName: '', displayName: '' }
  }

  const trimmed = rawName.trim()
  const parts = trimmed.split(/\s+/).filter((p) => p.length > 0)

  if (parts.length === 0) {
    return { lastName: '', firstName: '', displayName: '' }
  }

  if (parts.length === 1) {
    const lastName = normalizeName(parts[0]!)
    return { lastName, firstName: '', displayName: lastName }
  }

  // First part is always last name, rest are first names
  const lastName = normalizeName(parts[0]!)
  const firstName = parts.slice(1).map(normalizeName).join(' ')
  const displayName = `${firstName} ${lastName}`

  return { lastName, firstName, displayName }
}

/**
 * Parse an official name - format is "Firstname Lastname" (not reversed like players)
 */
export function parseOfficialName(rawName: string): {
  lastName: string
  firstName: string
  displayName: string
} {
  if (!rawName || typeof rawName !== 'string') {
    return { lastName: '', firstName: '', displayName: '' }
  }

  const trimmed = rawName.trim()
  const parts = trimmed.split(/\s+/).filter((p) => p.length > 0)

  if (parts.length === 0) {
    return { lastName: '', firstName: '', displayName: '' }
  }

  if (parts.length === 1) {
    const name = normalizeName(parts[0]!)
    return { lastName: name, firstName: '', displayName: name }
  }

  // For officials, format is "Firstname Lastname" - last part is last name
  const lastName = normalizeName(parts[parts.length - 1]!)
  const firstName = parts.slice(0, -1).map(normalizeName).join(' ')
  const displayName = `${firstName} ${lastName}`

  return { lastName, firstName, displayName }
}

/**
 * Extract shirt number from libero marker field
 * Handles formats like "L 12", "L1 6", "L2 17"
 */
function parseLiberoMarker(marker: string): number | null {
  if (!marker || typeof marker !== 'string') {
    return null
  }

  const trimmed = marker.trim()
  const match = /^L\d?\s+(\d{1,2})$/.exec(trimmed)

  if (match) {
    return parseInt(match[1]!, 10)
  }

  return null
}

/**
 * Parse a libero entry which has format "Number LASTNAME FIRSTNAME"
 */
function parseLiberoEntry(entry: string): { number: number | null; name: string } {
  if (!entry || typeof entry !== 'string') {
    return { number: null, name: '' }
  }

  const trimmed = entry.trim()
  const match = /^(\d{1,2})\s+(\S[\s\S]*?)$/.exec(trimmed)

  if (match) {
    return {
      number: parseInt(match[1]!, 10),
      name: match[2]!.trim(),
    }
  }

  return { number: null, name: trimmed }
}

// =============================================================================
// Section Detection
// =============================================================================

export function isOfficialsHeader(line: string): boolean {
  const upper = line.toUpperCase()
  return upper.includes('OFFICIAL MEMBERS') || upper.includes('ADMITTED ON THE BENCH')
}

export function isSignaturesSection(line: string): boolean {
  const upper = line.toUpperCase()
  return upper.includes('SIGNATURES') || upper.includes('TEAM CAPTAIN')
}

export function isLiberoSection(line: string, parts: string[]): boolean {
  return line.toUpperCase().includes('LIBERO') && parts.length <= 2
}

/** Valid official roles */
const VALID_ROLES = new Set(['C', 'AC', 'AC2', 'AC3', 'AC4', 'M', 'P'])

function isOfficialRole(role: string): role is OfficialRole {
  return VALID_ROLES.has(role.toUpperCase().trim())
}

export function isSectionHeader(line: string): boolean {
  const upper = line.toUpperCase()
  return upper.includes('LIBERO') || upper.includes('N.') || upper.includes('NAME OF THE PLAYER')
}

export function hasNonNumericContent(parts: string[]): boolean {
  const alphaPattern = /[a-zA-Z]{3,}/
  return parts.some((p) => alphaPattern.test(p))
}

// =============================================================================
// Space-Separated Column Splitting (for OCR without tabs)
// =============================================================================

/**
 * Result of splitting a space-separated line into two team columns
 */
export interface TwoColumnSplit {
  teamAParts: string[]
  teamBParts: string[]
}

/**
 * Try to split a space-separated line into two team columns using license status as markers.
 */
export function trySpaceSeparatedTwoColumnSplit(line: string): TwoColumnSplit | null {
  if (!line || line.includes('\t')) {
    return null
  }

  const trimmed = line.trim()
  const words = trimmed.split(/\s+/)

  if (words.length < MIN_WORDS_TWO_COLUMN_PLAYER) {
    return null
  }

  const numA = words[0]!
  if (!/^\d{1,2}$/.test(numA)) {
    return null
  }
  const shirtNumA = parseInt(numA, 10)
  if (shirtNumA < 1 || shirtNumA > MAX_SHIRT_NUMBER) {
    return null
  }

  let licenseAIndex = -1
  for (let i = 2; i < words.length - 2; i++) {
    if (LICENSE_STATUS_VALUES.has(words[i]!.toUpperCase())) {
      licenseAIndex = i
      break
    }
  }

  if (licenseAIndex === -1) {
    return null
  }

  const licenseA = words[licenseAIndex]!
  const nameAWords = words.slice(1, licenseAIndex)
  if (nameAWords.length === 0) {
    return null
  }

  const numB = words[licenseAIndex + 1]
  if (!numB || !/^\d{1,2}$/.test(numB)) {
    return null
  }
  const shirtNumB = parseInt(numB, 10)
  if (shirtNumB < 1 || shirtNumB > MAX_SHIRT_NUMBER) {
    return null
  }

  const remainingWords = words.slice(licenseAIndex + 2)
  if (remainingWords.length === 0) {
    return null
  }

  const lastWord = remainingWords[remainingWords.length - 1]!
  let licenseB = ''
  let nameBWords = remainingWords

  if (LICENSE_STATUS_VALUES.has(lastWord.toUpperCase())) {
    licenseB = lastWord
    nameBWords = remainingWords.slice(0, -1)
  }

  if (nameBWords.length === 0) {
    return null
  }

  return {
    teamAParts: [numA, nameAWords.join(' '), licenseA],
    teamBParts: [numB, nameBWords.join(' '), licenseB],
  }
}

/**
 * Try to split a space-separated team names line into two team names.
 */
export function trySpaceSeparatedTeamNamesSplit(line: string): [string, string] | null {
  if (!line || line.includes('\t')) {
    return null
  }

  const trimmed = line.trim()

  const gapIndex = trimmed.search(/\s{3,}/)
  if (gapIndex === -1) {
    return null
  }

  const afterGap = trimmed.slice(gapIndex).search(/\S/)
  if (afterGap === -1) {
    return null
  }

  const teamA = trimmed.slice(0, gapIndex)
  const teamB = trimmed.slice(gapIndex + afterGap)

  const cleanA = teamA.replace(/^[AB]\s+/, '').trim()
  const cleanB = teamB.replace(/^[AB]\s+/, '').trim()

  if (cleanA.length >= MIN_ALPHA_LENGTH && cleanB.length >= MIN_ALPHA_LENGTH) {
    return [cleanA, cleanB]
  }

  return null
}

// =============================================================================
// Player List Start Detection
// =============================================================================

export interface PlayerListStart {
  startIndex: number
  teamNamesIndex: number
}

function findTeamNamesIndex(lines: string[], headerIndex: number): number {
  const minIndex = Math.max(0, headerIndex - TEAM_NAME_LOOKBACK)
  for (let j = headerIndex - 1; j >= minIndex; j--) {
    const line = lines[j]
    if (!line) continue

    const parts = line.split('\t').filter((p) => p.trim().length > 0)
    if (parts.length >= 2 && hasNonNumericContent(parts)) {
      return j
    }

    const spaceSplit = trySpaceSeparatedTeamNamesSplit(line)
    if (spaceSplit) {
      return j
    }
  }
  return -1
}

function isPlayerDataLine(line: string): boolean {
  const parts = line.split('\t')
  if (parts.length < MIN_PARTS_SINGLE_COLUMN) return false

  const firstPart = parts[0]!.trim()
  if (!/^\d{1,2}$/.test(firstPart)) return false

  const num = parseInt(firstPart, 10)
  if (num < 1 || num > MAX_SHIRT_NUMBER) return false

  const secondPart = parts[1]!.trim()
  return /^[A-Z\s]+$/.test(secondPart) && secondPart.length > MIN_ALPHA_LENGTH
}

export function findPlayerListStart(lines: string[]): PlayerListStart {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue
    const upperLine = line.toUpperCase()
    const isHeaderRow =
      upperLine.includes('NAME OF THE PLAYER') ||
      (upperLine.includes('N.') && upperLine.includes('NAME'))

    if (isHeaderRow) {
      return {
        startIndex: i + 1,
        teamNamesIndex: findTeamNamesIndex(lines, i),
      }
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue
    if (isPlayerDataLine(line)) {
      return { startIndex: i, teamNamesIndex: i - 1 }
    }
  }

  return { startIndex: 0, teamNamesIndex: -1 }
}

// =============================================================================
// Team Name Extraction
// =============================================================================

export function cleanTeamName(name: string): string {
  return name.replace(/^[AB]\s+/, '').trim()
}

export function extractTeamNames(
  allLines: string[],
  teamNamesIndex: number
): { teamAName: string; teamBName: string } {
  if (teamNamesIndex < 0 || teamNamesIndex >= allLines.length) {
    return { teamAName: '', teamBName: '' }
  }

  const teamNamesLine = allLines[teamNamesIndex]
  if (!teamNamesLine) {
    return { teamAName: '', teamBName: '' }
  }

  const nameParts = teamNamesLine
    .split('\t')
    .map((p) => p.trim())
    .filter((p) => p.length > 0)

  if (nameParts.length >= 2) {
    return {
      teamAName: cleanTeamName(nameParts[0]!),
      teamBName: cleanTeamName(nameParts[1]!),
    }
  }

  const spaceSplit = trySpaceSeparatedTeamNamesSplit(teamNamesLine)
  if (spaceSplit) {
    return {
      teamAName: spaceSplit[0],
      teamBName: spaceSplit[1],
    }
  }

  if (nameParts.length === 1) {
    return { teamAName: cleanTeamName(nameParts[0]!), teamBName: '' }
  }

  return { teamAName: '', teamBName: '' }
}

// =============================================================================
// Section Parsers
// =============================================================================

export function parsePlayerFromParts(parts: string[], startIdx: number): ParsedPlayer | null {
  const numStr = parts[startIdx]
  const name = parts[startIdx + 1]
  const license = parts[startIdx + 2]

  if (!numStr || !name) return null
  const num = parseInt(numStr, 10)
  if (isNaN(num)) return null

  const parsed = parsePlayerName(name)
  return {
    shirtNumber: num,
    lastName: parsed.lastName,
    firstName: parsed.firstName,
    displayName: parsed.displayName,
    rawName: name,
    licenseStatus: license || '',
  }
}

/**
 * Parse libero from parts where marker contains the number
 */
export function parseLiberoFromParts(
  parts: string[],
  markerIdx: number,
  nameIdx: number,
  licenseIdx: number
): ParsedPlayer | null {
  const markerStr = parts[markerIdx]
  const nameStr = parts[nameIdx]

  if (!markerStr || !nameStr) return null

  const shirtNumber = parseLiberoMarker(markerStr)

  if (shirtNumber === null) {
    const entry = parseLiberoEntry(nameStr)
    if (entry.name) {
      const parsed = parsePlayerName(entry.name)
      return {
        shirtNumber: entry.number,
        lastName: parsed.lastName,
        firstName: parsed.firstName,
        displayName: parsed.displayName,
        rawName: entry.name,
        licenseStatus: parts[licenseIdx] || '',
      }
    }
    return null
  }

  const parsed = parsePlayerName(nameStr)
  return {
    shirtNumber,
    lastName: parsed.lastName,
    firstName: parsed.firstName,
    displayName: parsed.displayName,
    rawName: nameStr,
    licenseStatus: parts[licenseIdx] || '',
  }
}

export function parseOfficialFromParts(
  parts: string[],
  roleIdx: number,
  nameIdx: number
): ParsedOfficial | null {
  const role = parts[roleIdx]
  const name = parts[nameIdx]

  if (!role || !isOfficialRole(role) || !name) return null

  const parsed = parseOfficialName(name)
  return {
    role: role.toUpperCase() as OfficialRole,
    lastName: parsed.lastName,
    firstName: parsed.firstName,
    displayName: parsed.displayName,
    rawName: name,
  }
}

// =============================================================================
// Utility Exports
// =============================================================================

/**
 * Get all players for a team
 */
export function getAllPlayers(team: ParsedTeam): ParsedPlayer[] {
  return team.players
}

/**
 * Get all officials for a team
 */
export function getAllOfficials(team: ParsedTeam): ParsedOfficial[] {
  return team.officials
}
