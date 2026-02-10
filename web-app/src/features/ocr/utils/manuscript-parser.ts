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

import type {
  ParsedPlayer,
  ParsedOfficial,
  ParsedTeam,
  ParsedGameSheet,
  OfficialRole,
} from '../types'

// =============================================================================
// Constants
// =============================================================================

/** Maximum valid shirt number */
const MAX_SHIRT_NUMBER = 99

/** Minimum name length to consider valid */
const MIN_NAME_LENGTH = 2

/** Minimum length for team name text */
const MIN_TEAM_NAME_LENGTH = 3

/** Minimum ratio of letters in team name */
const MIN_LETTER_RATIO = 0.6

/** Valid official roles */
const VALID_ROLES = new Set(['C', 'AC', 'AC2', 'AC3', 'AC4', 'M'])

// =============================================================================
// OCR Error Correction Maps
// =============================================================================

/**
 * Common OCR character substitutions for digits
 * Maps misread characters to their likely intended digit
 */
const DIGIT_CORRECTIONS: Record<string, string> = {
  O: '0',
  o: '0',
  Q: '0',
  D: '0',
  I: '1',
  l: '1',
  i: '1',
  '|': '1',
  Z: '2',
  z: '2',
  E: '3',
  A: '4',
  S: '5',
  s: '5',
  G: '6',
  b: '6',
  T: '7',
  B: '8',
  g: '9',
  q: '9',
}

/**
 * Common OCR character substitutions for letters
 * Maps misread characters to their likely intended letter
 */
const LETTER_CORRECTIONS: Record<string, string> = {
  '0': 'O',
  '1': 'I',
  '|': 'I',
  '5': 'S',
  '8': 'B',
  '@': 'A',
  '&': 'A',
  '€': 'E',
  '£': 'L',
  '¢': 'C',
}

// =============================================================================
// OCR Correction Utilities
// =============================================================================

/**
 * Correct common OCR errors in a number string
 */
export function correctDigits(text: string): string {
  return text
    .split('')
    .map((char) => DIGIT_CORRECTIONS[char] ?? char)
    .join('')
}

/**
 * Correct common OCR errors in a letter string
 */
export function correctLetters(text: string): string {
  return text
    .split('')
    .map((char) => LETTER_CORRECTIONS[char] ?? char)
    .join('')
}

/**
 * Try to extract a valid shirt number from a string
 * Applies OCR corrections and validates the result
 */
export function extractShirtNumber(text: string): number | null {
  if (!text) return null

  // Clean and correct the text
  const cleaned = text.trim()
  const corrected = correctDigits(cleaned)

  // Try to parse as number
  const match = /^(\d{1,2})$/.exec(corrected)
  if (match) {
    const num = parseInt(match[1]!, 10)
    if (num >= 1 && num <= MAX_SHIRT_NUMBER) {
      return num
    }
  }

  return null
}

// =============================================================================
// Name Parsing Utilities
// =============================================================================

/**
 * Normalize a name from OCR - handles various case formats
 */
export function normalizeName(name: string): string {
  if (!name) return ''

  // Apply letter corrections
  const corrected = correctLetters(name)

  // Normalize to title case
  return corrected
    .toLowerCase()
    .split(/[\s-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

/**
 * Parse a player name - tries both LASTNAME FIRSTNAME and FIRSTNAME LASTNAME formats
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

  // For manuscript, assume LASTNAME FIRSTNAME format (same as electronic)
  // The first part is the last name, rest are first names
  const lastName = normalizeName(parts[0]!)
  const firstName = parts.slice(1).map(normalizeName).join(' ')
  const displayName = `${firstName} ${lastName}`

  return { lastName, firstName, displayName }
}

/**
 * Parse an official name - format is typically "Firstname Lastname"
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

// =============================================================================
// Swiss Tabular Format Detection
// =============================================================================

/** Minimum number of tab-separated lines required to detect Swiss tabular format */
const MIN_TAB_LINES_FOR_SWISS_FORMAT = 3

/**
 * Multilingual header labels found in Swiss manuscript scoresheets
 * These indicate a tabular format where OCR reads horizontally
 */
const SWISS_HEADER_PATTERNS = [
  /punkte.*points.*punti/i, // Score header (DE/FR/IT)
  /lizenz.*licence.*licenza/i, // License header (DE/FR/IT)
  /spieler.*joueur.*giocatore/i, // Player header (DE/FR/IT)
  /name.*nom.*nome/i, // Name header (DE/FR/IT)
  /mannschaft.*equipe.*squadra/i, // Team header (DE/FR/IT)
  /offizielle.*officiels.*ufficiali/i, // Officials header (DE/FR/IT)
  /kapitän.*capitaine.*capitano/i, // Captain header (DE/FR/IT)
  /trainer.*entraîneur.*allenatore/i, // Trainer header (DE/FR/IT)
  /aader\/ou\/o/i, // Common marker for "and/or" in Swiss forms
]

/**
 * Patterns for noise lines that should be filtered out
 */
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

/**
 * Detect if the OCR text appears to be from a Swiss tabular manuscript format
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

  return hasSwissHeaders && (hasTabularStructure || hasConcatenatedNames)
}

// =============================================================================
// Concatenated Data Splitting Utilities
// =============================================================================

/**
 * Split concatenated names like "S. AngeliL. CollierO. Follouier"
 * into individual names ["S. Angeli", "L. Collier", "O. Follouier"]
 *
 * Handles patterns:
 * - Initial + dot + LastName (e.g., "S. Angeli")
 * - Full names with uppercase start after lowercase
 */
export function splitConcatenatedNames(text: string): string[] {
  if (!text || text.trim().length === 0) return []

  // Pattern: uppercase letter + dot + space? + name, followed by another uppercase
  // or: lowercase letter followed by uppercase (word boundary)
  const names: string[] = []

  // First try splitting on pattern: "NameX." where X is an uppercase letter starting next name
  // Pattern matches: end of one name (lowercase) followed by start of next (uppercase + dot)
  const splitPattern = /([a-zà-ÿ])([A-Z]\.)/g
  const withMarkers = text.replace(splitPattern, '$1|||$2')

  // Also split where a lowercase letter is followed by uppercase (without dot)
  // This handles "SuterA." -> "Suter" + "A."
  const furtherSplit = withMarkers.replace(/([a-zà-ÿ])([A-Z][a-zà-ÿ])/g, '$1|||$2')

  const parts = furtherSplit.split('|||').filter((p) => p.trim().length > 0)

  for (const part of parts) {
    const trimmed = part.trim()
    if (trimmed.length >= 2) {
      names.push(trimmed)
    }
  }

  return names
}

/**
 * Split concatenated birth dates like "20.2.9721.1.9713.1.97"
 * into individual dates ["20.2.97", "21.1.97", "13.1.97"]
 */
export function splitConcatenatedDates(text: string): string[] {
  if (!text || text.trim().length === 0) return []

  const dates: string[] = []
  let remaining = text

  // Process dates iteratively - each date is D.M.YY or DD.M.YY or DD.MM.YY format
  // We need to be greedy about finding dates but careful about year boundaries
  while (remaining.length > 0) {
    // Try to match a date at the start of remaining string
    // Pattern for 4-digit years: only valid years (1900-2099)
    const match4 = remaining.match(/^(\d{1,2})\.(\d{1,2})\.((?:19|20)\d{2})/)
    if (match4) {
      dates.push(match4[0])
      remaining = remaining.substring(match4[0].length)
      continue
    }

    // Pattern for 2-digit years (most common in Swiss forms)
    const match2 = remaining.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2})/)
    if (match2) {
      dates.push(match2[0])
      remaining = remaining.substring(match2[0].length)
      continue
    }

    // No date found at start, skip one character and try again
    remaining = remaining.substring(1)
  }

  return dates
}

/** Maximum single digit jersey number */
const MAX_SINGLE_DIGIT = 9

/** Minimum two-digit jersey number */
const MIN_TWO_DIGIT = 10

/** Maximum two-digit jersey number */
const MAX_TWO_DIGIT = 99

/**
 * Split concatenated jersey numbers like "51396102581915"
 * This is tricky as we don't know boundaries. Use heuristics:
 * - Numbers 1-9 are single digit
 * - Numbers 10-99 are two digits
 * - Prefer single digits when ambiguous (volleyball typically uses 1-20)
 */
export function splitConcatenatedNumbers(text: string, expectedCount?: number): number[] {
  if (!text || text.trim().length === 0) return []

  const cleaned = text.replace(/\D/g, '') // Remove non-digits
  if (cleaned.length === 0) return []

  const numbers: number[] = []
  let i = 0

  while (i < cleaned.length) {
    const oneDigit = parseInt(cleaned[i]!, 10)

    // If we have an expected count, use it to guide decisions
    if (expectedCount !== undefined) {
      const remainingChars = cleaned.length - i
      const remainingNeeded = expectedCount - numbers.length
      // If we need more numbers than remaining chars, take single digits
      if (remainingNeeded >= remainingChars && oneDigit >= 1) {
        numbers.push(oneDigit)
        i += 1
        continue
      }
    }

    // Try two-digit number if we have room
    if (i + 1 < cleaned.length) {
      const twoDigit = parseInt(cleaned.substring(i, i + 2), 10)

      // If first digit is 0, skip it (invalid jersey number)
      if (cleaned[i] === '0') {
        i += 1
        continue
      }

      // Prefer single digit for most cases (volleyball numbers 1-20 are common)
      // Only take two digits if the single digit would be 0 or if two-digit is clearly intended
      if (oneDigit >= 1 && oneDigit <= MAX_SINGLE_DIGIT) {
        numbers.push(oneDigit)
        i += 1
        continue
      }

      // For numbers starting with 0, skip the leading zero
      if (twoDigit >= MIN_TWO_DIGIT && twoDigit <= MAX_TWO_DIGIT) {
        numbers.push(twoDigit)
        i += 2
        continue
      }
    }

    // Single digit remaining or default
    if (oneDigit >= 1) {
      numbers.push(oneDigit)
    }
    i += 1
  }

  return numbers
}

// =============================================================================
// Swiss Tabular Format Team Name Extraction
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
    .replace(/aader\/ou\/o\s*B?\s*/gi, ' ')
    .replace(/punkte[\s\S]*?punti\s*/i, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Remove trailing numbers from team name (like "1" in "VTV Horw 1")
 */
function removeTrailingNumbers(name: string): string {
  const trimmed = name.trim()
  // Split into words and remove trailing numeric parts
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
  // Get the text after the prefix
  const afterPrefix = text.substring(startIndex + prefix.length).trim()

  // Find where the team name ends (at next club prefix or end of string)
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
// Swiss Tabular Format Parsing
// =============================================================================

/** Maximum players per team in a volleyball roster */
const MAX_PLAYERS_PER_TEAM = 14

/** Maximum row number in scoresheet (used to detect row numbers vs jersey numbers) */
const MAX_ROW_NUMBER = 14

/** Minimum parts needed to parse a libero line */
const MIN_LIBERO_LINE_PARTS = 3

/** Date pattern for DD.MM.YY or DD.MM.YYYY format */
const DATE_PATTERN = /^\d{1,2}\.\d{1,2}\.\d{2,4}$/

/** Name pattern - starts with a letter */
const NAME_START_PATTERN = /^[A-Za-zÀ-ÿ]/

/** Jersey number pattern (1-2 digits) */
const JERSEY_NUMBER_PATTERN = /^\d{1,2}$/

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

  // Check if current is a date
  if (currentIndex < parts.length && DATE_PATTERN.test(parts[currentIndex]!)) {
    date = parts[currentIndex]!
    currentIndex++
  }

  // Next should be jersey number
  if (currentIndex < parts.length && JERSEY_NUMBER_PATTERN.test(parts[currentIndex]!)) {
    jerseyNumber = parseInt(parts[currentIndex]!, 10)
    if (jerseyNumber > MAX_SHIRT_NUMBER) jerseyNumber = null
    currentIndex++
  }

  // Next should be name
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
 * Format: "2\t20.2.97\t5\tS. Angeli\t10.6.92\t7\tS. Candido"
 * Returns players for both teams
 */
function parseSwissLiberoLine(line: string): {
  teamA: ParsedPlayer | null
  teamB: ParsedPlayer | null
} {
  const parts = line
    .split('\t')
    .map((p) => p.trim())
    .filter((p) => p.length > 0)

  if (parts.length < MIN_LIBERO_LINE_PARTS) {
    return { teamA: null, teamB: null }
  }

  let currentIndex = 0

  // Skip row number if present (first part being just a small number)
  if (JERSEY_NUMBER_PATTERN.test(parts[0]!) && parseInt(parts[0]!, 10) <= MAX_ROW_NUMBER) {
    currentIndex = 1
  }

  // Parse Team A libero
  const teamAResult = parseLiberoPlayerData(parts, currentIndex)
  currentIndex = teamAResult.nextIndex

  // Parse Team B libero
  const teamBResult = parseLiberoPlayerData(parts, currentIndex)

  return { teamA: teamAResult.player, teamB: teamBResult.player }
}

/**
 * Parse a tab-separated officials line from Swiss format
 * Format: "C\tM. Lorentz\tC\tA. Zbinden"
 */
function parseSwissOfficialsLine(line: string): {
  teamA: ParsedOfficial | null
  teamB: ParsedOfficial | null
} {
  const parts = line
    .split('\t')
    .map((p) => p.trim())
    .filter((p) => p.length > 0)

  let teamAOfficial: ParsedOfficial | null = null
  let teamBOfficial: ParsedOfficial | null = null

  let currentIndex = 0

  // Parse Team A official
  if (currentIndex < parts.length) {
    const role = parts[currentIndex]!.toUpperCase()
    if (VALID_ROLES.has(role)) {
      currentIndex++
      if (currentIndex < parts.length && /^[A-Za-zÀ-ÿ]/.test(parts[currentIndex]!)) {
        const name = parts[currentIndex]!
        const parsed = parseOfficialName(name)
        teamAOfficial = {
          role: role as OfficialRole,
          lastName: parsed.lastName,
          firstName: parsed.firstName,
          displayName: parsed.displayName,
          rawName: name,
        }
        currentIndex++
      }
    }
  }

  // Parse Team B official
  if (currentIndex < parts.length) {
    const role = parts[currentIndex]!.toUpperCase()
    if (VALID_ROLES.has(role)) {
      currentIndex++
      if (currentIndex < parts.length && /^[A-Za-zÀ-ÿ]/.test(parts[currentIndex]!)) {
        const name = parts[currentIndex]!
        const parsed = parseOfficialName(name)
        teamBOfficial = {
          role: role as OfficialRole,
          lastName: parsed.lastName,
          firstName: parsed.firstName,
          displayName: parsed.displayName,
          rawName: name,
        }
      }
    }
  }

  return { teamA: teamAOfficial, teamB: teamBOfficial }
}

/** Concatenated names pattern (e.g., "S. AngeliL. Collier") */
const CONCATENATED_NAMES_PATTERN = /[A-Z]\.\s*[A-Za-zÀ-ÿ]+[A-Z]\.\s*[A-Za-zÀ-ÿ]+/

/** Concatenated dates pattern (multiple dates concatenated) */
const CONCATENATED_DATES_PATTERN = /\d{1,2}\.\d{1,2}\.\d{2,4}.*\d{1,2}\.\d{1,2}\.\d{2,4}/

/** Official line pattern (starts with C/AC followed by tab) */
const OFFICIAL_LINE_START_PATTERN = /^[CA]C?\d?\t/i

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
  if (SWISS_HEADER_PATTERNS.some((pattern) => pattern.test(line)) && !line.includes('\t')) {
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

/**
 * Parse Swiss tabular manuscript format
 * This format has both teams side-by-side with OCR reading horizontally
 */
function parseSwissTabularSheet(ocrText: string): ParsedGameSheet {
  const lines = ocrText.split('\n').map((l) => l.trim())
  const teamNames = extractSwissTeamNames(ocrText)

  const teamA: ParsedTeam = { name: teamNames.teamA, players: [], officials: [] }
  const teamB: ParsedTeam = { name: teamNames.teamB, players: [], officials: [] }

  let inLiberoSection = false
  let inOfficialsSection = false

  for (const line of lines) {
    if (shouldSkipLine(line)) continue

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

    if (!line.includes('\t')) continue

    if (processStructuredLine(line, inOfficialsSection, inLiberoSection, teamA, teamB)) {
      continue
    }

    // Process concatenated player data
    const parts = line.split('\t')
    const data = extractConcatenatedData(parts)
    addPlayersFromExtractedData(teamA, data.firstHalfNames, data.firstHalfDates)
    addPlayersFromExtractedData(teamB, data.secondHalfNames, data.secondHalfDates)
  }

  const warnings = generateTeamWarnings(teamA, teamB)
  return { teamA, teamB, warnings }
}

// =============================================================================
// Line Pattern Detection
// =============================================================================

/**
 * Pattern for detecting a player line in manuscript format
 * Matches: number followed by name, with various separators
 */
const PLAYER_LINE_PATTERN = /^(\d{1,2})[\s.:_-]+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s]*)/

/**
 * Pattern for detecting a player line with OCR errors
 * More lenient - allows OCR-misread digits
 */
const PLAYER_LINE_LENIENT = /^([0-9OoIlZzSsGgBb]{1,2})[\s.:_-]+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s]*)/

/**
 * Pattern for detecting an official line
 * Matches: C/AC/AC2/AC3/AC4 followed by name
 * Note: Uses case-insensitive flag, so name capture uses lowercase ranges only
 */
const OFFICIAL_LINE_PATTERN = /^(C|AC\d?)[\s.:_-]+([a-zà-ÿ][a-zà-ÿ\s]*)/i

/**
 * Check if a line contains team section marker
 */
function isTeamSectionMarker(line: string): boolean {
  const upper = line.toUpperCase()
  return (
    upper.includes('TEAM A') ||
    upper.includes('TEAM B') ||
    upper.includes('ÉQUIPE A') ||
    upper.includes('ÉQUIPE B') ||
    upper.includes('MANNSCHAFT A') ||
    upper.includes('MANNSCHAFT B') ||
    upper.includes('HOME') ||
    upper.includes('AWAY') ||
    upper.includes('HEIM') ||
    upper.includes('GAST')
  )
}

/**
 * Check if a line indicates the libero section
 */
function isLiberoMarker(line: string): boolean {
  return line.toUpperCase().includes('LIBERO')
}

/**
 * Check if a line indicates the officials section
 * Note: We only match section headers, not individual official lines
 */
function isOfficialsMarker(line: string): boolean {
  const upper = line.toUpperCase()
  // Must contain 'OFFICIAL' or specific section headers
  // Avoid matching lines like "C Hans Trainer" which contain 'TRAINER'
  return upper.includes('OFFICIAL') || upper.startsWith('COACH') || /^TRAINER\b/.test(upper)
}

/**
 * Check if a line indicates end of player data
 */
function isEndMarker(line: string): boolean {
  const upper = line.toUpperCase()
  return (
    upper.includes('SIGNATURE') ||
    upper.includes('CAPTAIN') ||
    upper.includes('REFEREE') ||
    upper.includes('ARBITRE')
  )
}

/**
 * Try to extract a player from a line
 */
function tryExtractPlayer(line: string): ParsedPlayer | null {
  // Try strict pattern first
  let match = PLAYER_LINE_PATTERN.exec(line)
  if (!match) {
    // Try lenient pattern with OCR correction
    match = PLAYER_LINE_LENIENT.exec(line)
  }

  if (!match) return null

  const numberStr = match[1]!
  const nameStr = match[2]!.trim()

  // Extract and validate shirt number
  const shirtNumber = extractShirtNumber(numberStr)

  // Validate name length
  if (nameStr.length < MIN_NAME_LENGTH) return null

  const parsed = parsePlayerName(nameStr)

  return {
    shirtNumber,
    lastName: parsed.lastName,
    firstName: parsed.firstName,
    displayName: parsed.displayName,
    rawName: nameStr,
    licenseStatus: '', // Not typically visible in manuscript
  }
}

/**
 * Try to extract an official from a line
 */
function tryExtractOfficial(line: string): ParsedOfficial | null {
  const match = OFFICIAL_LINE_PATTERN.exec(line)
  if (!match) return null

  const roleStr = match[1]!.toUpperCase()
  const nameStr = match[2]!.trim()

  // Validate role
  if (!VALID_ROLES.has(roleStr)) return null

  // Validate name length
  if (nameStr.length < MIN_NAME_LENGTH) return null

  const parsed = parseOfficialName(nameStr)

  return {
    role: roleStr as OfficialRole,
    lastName: parsed.lastName,
    firstName: parsed.firstName,
    displayName: parsed.displayName,
    rawName: nameStr,
  }
}

// =============================================================================
// Team Detection and Splitting
// =============================================================================

/**
 * Try to extract team name from a line
 */
function extractTeamName(line: string): string | null {
  const trimmed = line.trim()

  // Skip empty lines
  if (trimmed.length < MIN_TEAM_NAME_LENGTH) return null

  // Skip lines that look like player data
  if (PLAYER_LINE_PATTERN.test(trimmed)) return null
  if (PLAYER_LINE_LENIENT.test(trimmed)) return null

  // Skip section markers
  if (isLiberoMarker(trimmed)) return null
  if (isOfficialsMarker(trimmed)) return null
  if (isEndMarker(trimmed)) return null

  // Check if it looks like a team name (mostly letters, maybe some spaces/hyphens)
  const letterCount = (trimmed.match(/[A-Za-zÀ-ÿ]/g) ?? []).length
  if (letterCount >= MIN_TEAM_NAME_LENGTH && letterCount / trimmed.length > MIN_LETTER_RATIO) {
    return trimmed
  }

  return null
}

/**
 * Split text into sections for two teams
 * Manuscript sheets may have teams in different arrangements
 */
interface TeamSections {
  teamALines: string[]
  teamBLines: string[]
  teamAName: string
  teamBName: string
}

/** Patterns for Team A markers */
const TEAM_A_MARKERS = ['TEAM A', 'ÉQUIPE A', 'MANNSCHAFT A', 'HOME', 'HEIM']
/** Patterns for Team B markers */
const TEAM_B_MARKERS = ['TEAM B', 'ÉQUIPE B', 'MANNSCHAFT B', 'AWAY', 'GAST']
/** Regex to strip Team A markers from a line */
const TEAM_A_STRIP_PATTERN = /TEAM\s*A|ÉQUIPE\s*A|MANNSCHAFT\s*A|HOME|HEIM/i
/** Regex to strip Team B markers from a line */
const TEAM_B_STRIP_PATTERN = /TEAM\s*B|ÉQUIPE\s*B|MANNSCHAFT\s*B|AWAY|GAST/i

/**
 * Check if line matches Team A markers
 */
function isTeamAMarker(upperLine: string): boolean {
  return TEAM_A_MARKERS.some((marker) => upperLine.includes(marker))
}

/**
 * Check if line matches Team B markers
 */
function isTeamBMarker(upperLine: string): boolean {
  return TEAM_B_MARKERS.some((marker) => upperLine.includes(marker))
}

/**
 * Extract team name from a marker line
 */
function extractNameFromMarker(line: string, stripPattern: RegExp): string {
  const cleaned = line.replace(stripPattern, '').trim()
  return extractTeamName(cleaned) ?? ''
}

/**
 * Process a line that is a team section marker
 */
function processTeamMarker(
  trimmed: string,
  result: TeamSections
): { team: 'A' | 'B'; isTeamA: boolean } | null {
  const upper = trimmed.toUpperCase()

  if (isTeamAMarker(upper)) {
    const name = extractNameFromMarker(trimmed, TEAM_A_STRIP_PATTERN)
    if (name) result.teamAName = name
    return { team: 'A', isTeamA: true }
  }

  if (isTeamBMarker(upper)) {
    const name = extractNameFromMarker(trimmed, TEAM_B_STRIP_PATTERN)
    if (name) result.teamBName = name
    return { team: 'B', isTeamA: false }
  }

  return null
}

function splitIntoTeamSections(lines: string[]): TeamSections {
  const result: TeamSections = {
    teamALines: [],
    teamBLines: [],
    teamAName: '',
    teamBName: '',
  }

  let currentTeam: 'A' | 'B' | null = null
  let teamASectionFound = false

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // Check for team section markers
    if (isTeamSectionMarker(trimmed)) {
      const markerResult = processTeamMarker(trimmed, result)
      if (markerResult) {
        currentTeam = markerResult.team
        if (markerResult.isTeamA) teamASectionFound = true
        continue
      }
    }

    // If we haven't found explicit team sections, try to detect team name
    if (!teamASectionFound && !result.teamAName) {
      const teamName = extractTeamName(trimmed)
      if (teamName) {
        result.teamAName = teamName
        currentTeam = 'A'
        continue
      }
    }

    // Default to team A if no team is set
    if (currentTeam === null) {
      currentTeam = 'A'
    }

    // Add line to current team
    if (currentTeam === 'A') {
      result.teamALines.push(trimmed)
    } else {
      result.teamBLines.push(trimmed)
    }
  }

  return result
}

// =============================================================================
// Team Parser
// =============================================================================

/**
 * Parse a team's lines into players and officials
 */
function parseTeamLines(
  lines: string[],
  teamName: string
): { team: ParsedTeam; warnings: string[] } {
  const team: ParsedTeam = {
    name: teamName,
    players: [],
    officials: [],
  }
  const warnings: string[] = []

  let inOfficialsSection = false

  for (const line of lines) {
    // Check for section transitions
    if (isOfficialsMarker(line)) {
      inOfficialsSection = true
      continue
    }
    if (isEndMarker(line)) {
      break
    }

    // Skip libero markers
    if (isLiberoMarker(line)) {
      continue
    }

    if (inOfficialsSection) {
      const official = tryExtractOfficial(line)
      if (official) {
        team.officials.push(official)
      }
    } else {
      // Try to extract player
      const player = tryExtractPlayer(line)
      if (player) {
        team.players.push(player)
        continue
      }

      // If not a player, try official (might be inline with players)
      const official = tryExtractOfficial(line)
      if (official) {
        team.officials.push(official)
      }
    }
  }

  return { team, warnings }
}

// =============================================================================
// Main Parser
// =============================================================================

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
  // Try to split into team sections
  const sections = splitIntoTeamSections(lines)

  // Parse each team
  const teamAResult = parseTeamLines(sections.teamALines, sections.teamAName)
  const teamBResult = parseTeamLines(sections.teamBLines, sections.teamBName)

  // Collect warnings
  warnings.push(...teamAResult.warnings)
  warnings.push(...teamBResult.warnings)

  if (teamAResult.team.players.length === 0) {
    warnings.push('No players found for Team A')
  }
  if (teamBResult.team.players.length === 0 && sections.teamBLines.length > 0) {
    warnings.push('No players found for Team B')
  }

  return {
    teamA: teamAResult.team,
    teamB: teamBResult.team,
    warnings,
  }
}
