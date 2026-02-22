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

/** Maximum tab-separated parts per line in sequential format (date, number, name) */
const MAX_SEQUENTIAL_PARTS_PER_LINE = 3

/** Total columns in 6-column Swiss tabular format (3 per team × 2 teams) */
const TABULAR_TOTAL_COLUMNS = 6

/** Columns per team in 6-column Swiss tabular format (date, number, name) */
const TABULAR_COLUMNS_PER_TEAM = 3

/** Valid official roles (C=Coach, AC=Assistant Coach, M=Medical, P=Physiotherapist) */
const VALID_ROLES = new Set(['C', 'AC', 'AC2', 'AC3', 'AC4', 'M', 'P'])

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
  /oder\/ou\/o/i, // Common marker for "and/or" in Swiss forms (A oder/ou/o B)
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
/** Date pattern - DD.MM.YY(YY) or incomplete OCR dates like DD.MM. (trailing dot, no year) */
const DATE_PATTERN = /^\d{1,2}\.\d{1,2}\.\d{0,4}$/

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
  const rawParts = line.split('\t')

  // If we have exactly 6 columns, use column-based parsing to preserve team alignment
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

  // Fallback: sequential parsing for non-6-column lines
  const parts = rawParts.map((p) => p.trim()).filter((p) => p.length > 0)

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
 * Parse a 6-column tab-separated player line from Swiss tabular format.
 * Format: "date_A\tnumber_A\tname_A\tdate_B\tnumber_B\tname_B"
 * Columns may be empty (preserved as empty strings from HTML table conversion).
 * Returns true if the line was successfully parsed as player data.
 */
function parseSwissTabularPlayerLine(line: string, teamA: ParsedTeam, teamB: ParsedTeam): boolean {
  // Split keeping all parts (including empty) to preserve column alignment
  const parts = line.split('\t')

  // Need exactly 6 columns for the two-team tabular format
  if (parts.length !== TABULAR_TOTAL_COLUMNS) return false

  const teamACols = [parts[0]!.trim(), parts[1]!.trim(), parts[2]!.trim()]
  const teamBCols = [parts[3]!.trim(), parts[4]!.trim(), parts[5]!.trim()]

  let parsedAny = false

  // Parse Team A (columns 0-2)
  const playerA = parsePlayerFromColumns(teamACols[0]!, teamACols[1]!, teamACols[2]!)
  if (playerA) {
    teamA.players.push(playerA)
    parsedAny = true
  }

  // Parse Team B (columns 3-5)
  const playerB = parsePlayerFromColumns(teamBCols[0]!, teamBCols[1]!, teamBCols[2]!)
  if (playerB) {
    teamB.players.push(playerB)
    parsedAny = true
  }

  return parsedAny
}

/**
 * Parse a player from 3 columns: date (DOB), jersey number, and name.
 * Any column may be empty. Returns null if no valid name is found.
 */
function parsePlayerFromColumns(col0: string, col1: string, col2: string): ParsedPlayer | null {
  let birthDate: string | undefined
  let jerseyNumber: number | null = null
  let name = ''

  // Column 0: expect DOB (DD.MM.YY or DD.MM.YYYY)
  if (DATE_PATTERN.test(col0)) {
    birthDate = col0
  }

  // Column 1: expect jersey number (1-2 digits, 1-99)
  if (JERSEY_NUMBER_PATTERN.test(col1)) {
    const num = parseInt(col1, 10)
    if (num >= 1 && num <= MAX_SHIRT_NUMBER) {
      jerseyNumber = num
    }
  }

  // Column 2: expect player name
  if (col2 && NAME_START_PATTERN.test(col2) && col2.length >= MIN_NAME_LENGTH) {
    name = col2
  }

  // Must have at least a name to count as a valid player
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
 * Normalize official role strings from Swiss forms.
 * AC1 → AC (Swiss forms use AC1 for first assistant coach, AC2 for second)
 */
function normalizeRole(role: string): string | null {
  const upper = role.toUpperCase()
  if (VALID_ROLES.has(upper)) return upper
  // AC1 → AC (Swiss form convention)
  if (upper === 'AC1') return 'AC'
  return null
}

/**
 * Parse one official from parts starting at currentIndex.
 * Handles optional date prefix: [date]\trole\tname
 */
function parseOneOfficial(
  parts: string[],
  startIndex: number
): { official: ParsedOfficial | null; nextIndex: number } {
  let currentIndex = startIndex

  // Skip date prefix if present (DOB for officials)
  if (currentIndex < parts.length && DATE_PATTERN.test(parts[currentIndex]!)) {
    currentIndex++
  }

  // Expect role
  if (currentIndex >= parts.length) {
    return { official: null, nextIndex: currentIndex }
  }

  const normalizedRole = normalizeRole(parts[currentIndex]!)
  if (!normalizedRole) {
    return { official: null, nextIndex: currentIndex }
  }
  currentIndex++

  // Expect name
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
 * Supports formats:
 *   "C\tM. Lorentz\tC\tA. Zbinden"             (without dates)
 *   "11.08.65\tC\tD. Heynen\t07.04.71\tC\tN. Birrer"  (with DOB prefix)
 */
function parseSwissOfficialsLine(line: string): {
  teamA: ParsedOfficial | null
  teamB: ParsedOfficial | null
} {
  const rawParts = line.split('\t')

  // If we have exactly 6 columns, use column-based parsing to preserve team alignment
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

  // Fallback: sequential parsing for non-6-column lines
  const parts = rawParts.map((p) => p.trim()).filter((p) => p.length > 0)

  // Parse Team A official (skips leading date if present)
  const teamAResult = parseOneOfficial(parts, 0)

  // Parse Team B official (continues from where Team A left off)
  const teamBResult = parseOneOfficial(parts, teamAResult.nextIndex)

  return { teamA: teamAResult.official, teamB: teamBResult.official }
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
 * Deduplicate players in a team's roster.
 *
 * Manuscript scoresheets typically list libero players twice:
 * once in the main player list and again in a separate LIBERO section.
 * This function removes duplicates, keeping the first occurrence.
 *
 * Two players are considered duplicates if they share the same rawName
 * (case-insensitive). Shirt numbers are NOT used for deduplication because
 * OCR errors can assign the same number to different players.
 */
function deduplicatePlayers(team: ParsedTeam): void {
  const seenNames = new Set<string>()
  const deduped: ParsedPlayer[] = []

  for (const player of team.players) {
    const nameKey = player.rawName.toLowerCase().trim()

    if (!nameKey || !seenNames.has(nameKey)) {
      deduped.push(player)
      if (nameKey) seenNames.add(nameKey)
    }
  }

  team.players = deduped
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
  // Must contain 'OFFICIAL' or multilingual equivalents, or specific section headers
  // Avoid matching lines like "C Hans Trainer" which contain 'TRAINER'
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
function isEndMarker(line: string): boolean {
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

/**
 * Check if a line is a Swiss multilingual header row (license/player/name headers).
 * These repeat at the start of each team section in sequential format.
 */
function isSwissDataHeader(line: string): boolean {
  return SWISS_HEADER_PATTERNS.some((pattern) => pattern.test(line))
}

/**
 * Try to extract a player from a tab-separated line with format: date\tnumber\tname
 * This format is common in Swiss sequential manuscript scoresheets.
 */
function tryExtractPlayerFromTabs(line: string): ParsedPlayer | null {
  if (!line.includes('\t')) return null

  const parts = line
    .split('\t')
    .map((p) => p.trim())
    .filter((p) => p.length > 0)

  if (parts.length < 2) return null

  let birthDate: string | undefined
  let jerseyNumber: number | null = null
  let name = ''
  let currentIndex = 0

  // First part might be a date (DD.MM.YY or DD.MM.YYYY)
  if (currentIndex < parts.length && DATE_PATTERN.test(parts[currentIndex]!)) {
    birthDate = parts[currentIndex]!
    currentIndex++
  }

  // Next should be jersey number
  if (currentIndex < parts.length && JERSEY_NUMBER_PATTERN.test(parts[currentIndex]!)) {
    const num = parseInt(parts[currentIndex]!, 10)
    if (num >= 1 && num <= MAX_SHIRT_NUMBER) {
      jerseyNumber = num
      currentIndex++
    }
  }

  // Next should be name
  if (currentIndex < parts.length && NAME_START_PATTERN.test(parts[currentIndex]!)) {
    name = parts[currentIndex]!
  }

  if (!name || name.length < MIN_NAME_LENGTH) return null

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
 * Try to extract a player from a line
 */
function tryExtractPlayer(line: string): ParsedPlayer | null {
  // Try tab-separated format first (date\tnumber\tname)
  const tabPlayer = tryExtractPlayerFromTabs(line)
  if (tabPlayer) return tabPlayer

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
 * Try to extract an official from a tab-separated line with format: date\trole\tname
 * or role\tname (without date)
 */
function tryExtractOfficialFromTabs(line: string): ParsedOfficial | null {
  if (!line.includes('\t')) return null

  const parts = line
    .split('\t')
    .map((p) => p.trim())
    .filter((p) => p.length > 0)

  if (parts.length < 2) return null

  let currentIndex = 0

  // First part might be a date - skip it
  if (currentIndex < parts.length && DATE_PATTERN.test(parts[currentIndex]!)) {
    currentIndex++
  }

  // Next should be role (with AC1 → AC normalization)
  if (currentIndex >= parts.length) return null
  const role = normalizeRole(parts[currentIndex]!)
  if (!role) return null
  currentIndex++

  // Next should be name
  if (currentIndex >= parts.length) return null
  const nameStr = parts[currentIndex]!
  if (!NAME_START_PATTERN.test(nameStr) || nameStr.length < MIN_NAME_LENGTH) return null

  const parsed = parseOfficialName(nameStr)

  return {
    role: role as OfficialRole,
    lastName: parsed.lastName,
    firstName: parsed.firstName,
    displayName: parsed.displayName,
    rawName: nameStr,
  }
}

/**
 * Try to extract an official from a line
 */
function tryExtractOfficial(line: string): ParsedOfficial | null {
  // Try tab-separated format first (date\trole\tname or role\tname)
  const tabOfficial = tryExtractOfficialFromTabs(line)
  if (tabOfficial) return tabOfficial

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
 * Check if a line is a Swiss form label or data header that should be skipped.
 * Covers multilingual form labels ("Mannschaften/Equipes/Squadre", "A oder/ou/o B")
 * and data header rows ("Lizenz-Nr.Licence-No.Licenza-No.").
 */
function isSwissFormLabelOrHeader(line: string): boolean {
  const upper = line.toUpperCase()
  return (
    upper.includes('LIZENZ-NR') ||
    upper.includes('LICENCE-NO') ||
    upper.includes('LICENZA-NO') ||
    upper.includes('ODER/OU/O') ||
    /MANNSCHAFT.*EQUIPE.*SQUADR/i.test(line) ||
    /SPIELER.*JOUEUR.*GIOCATORE/i.test(line) ||
    /NAME.*NOM.*NOME/i.test(line) ||
    isSwissDataHeader(line)
  )
}

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

  // Skip tab-separated player data (date\tnumber\tname)
  if (trimmed.includes('\t') && DATE_PATTERN.test(trimmed.split('\t')[0]!.trim())) return null

  // Skip section markers
  if (isLiberoMarker(trimmed)) return null
  if (isOfficialsMarker(trimmed)) return null
  if (isEndMarker(trimmed)) return null

  // Skip Swiss form labels and data headers
  if (isSwissFormLabelOrHeader(trimmed)) return null

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

/** Mutable state for the team section splitter */
interface SplitterState {
  currentTeam: 'A' | 'B' | null
  teamASectionFound: boolean
  seenEndMarkerInTeamA: boolean
  teamAHasContent: boolean
}

/**
 * Check if a line looks like team content (player data or section marker)
 */
function looksLikeTeamContent(line: string): boolean {
  return (
    tryExtractPlayer(line) !== null ||
    tryExtractOfficial(line) !== null ||
    isLiberoMarker(line) ||
    isOfficialsMarker(line)
  )
}

/**
 * Try to detect a team B transition after Team A's end markers.
 * Returns: 'switch-b' to switch to Team B, 'switch-b-keep' to switch AND process line,
 * 'skip' to skip noise, or null if this handler doesn't apply.
 */
function tryDetectTeamBTransition(
  trimmed: string,
  state: SplitterState,
  result: TeamSections
): 'switch-b' | 'switch-b-keep' | 'skip' | null {
  if (!state.seenEndMarkerInTeamA || state.currentTeam !== 'A') return null

  const teamName = extractTeamName(trimmed)
  if (teamName) {
    result.teamBName = teamName
    state.currentTeam = 'B'
    return 'switch-b'
  }

  if (looksLikeTeamContent(trimmed)) {
    state.currentTeam = 'B'
    return 'switch-b-keep'
  }

  return 'skip'
}

/**
 * Process a team section marker line.
 * Returns true if the line was consumed (should continue to next line).
 */
function handleTeamSectionMarker(
  trimmed: string,
  state: SplitterState,
  result: TeamSections
): boolean {
  if (!isTeamSectionMarker(trimmed)) return false
  const markerResult = processTeamMarker(trimmed, result)
  if (!markerResult) return false
  state.currentTeam = markerResult.team
  if (markerResult.isTeamA) state.teamASectionFound = true
  return true
}

/**
 * Process an end marker line (signature, trainer, captain).
 * Returns true if the line was consumed.
 */
function handleEndMarker(trimmed: string, state: SplitterState): boolean {
  if (!isEndMarker(trimmed)) return false
  if (state.currentTeam === 'A' && state.teamAHasContent) {
    state.seenEndMarkerInTeamA = true
  }
  return true
}

/**
 * Try to detect Team A's name from a line when no explicit section was found.
 * Returns true if the line was consumed as a team name.
 */
function handleTeamANameDetection(
  trimmed: string,
  state: SplitterState,
  result: TeamSections
): boolean {
  if (state.teamASectionFound || result.teamAName) return false
  const teamName = extractTeamName(trimmed)
  if (!teamName) return false
  result.teamAName = teamName
  state.currentTeam = 'A'
  return true
}

function splitIntoTeamSections(lines: string[]): TeamSections {
  const result: TeamSections = {
    teamALines: [],
    teamBLines: [],
    teamAName: '',
    teamBName: '',
  }

  const state: SplitterState = {
    currentTeam: null,
    teamASectionFound: false,
    seenEndMarkerInTeamA: false,
    teamAHasContent: false,
  }

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || isSwissFormLabelOrHeader(trimmed)) continue
    if (handleTeamSectionMarker(trimmed, state, result)) continue
    if (handleEndMarker(trimmed, state)) continue

    // After seeing end markers in Team A, look for Team B start
    const transition = tryDetectTeamBTransition(trimmed, state, result)
    if (transition === 'switch-b' || transition === 'skip') continue

    if (handleTeamANameDetection(trimmed, state, result)) continue

    if (state.currentTeam === null) state.currentTeam = 'A'
    if (state.currentTeam === 'A') state.teamAHasContent = true

    // Add line to current team
    if (state.currentTeam === 'A') {
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

  // Deduplicate players (liberos often appear in both the main list and LIBERO section)
  deduplicatePlayers(teamAResult.team)
  deduplicatePlayers(teamBResult.team)

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
