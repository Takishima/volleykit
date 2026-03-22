/**
 * Sequential Format Parser
 *
 * Parses OCR text from manuscript scoresheets where Team A section is followed
 * by Team B section (sequential layout). Handles pattern-based player extraction,
 * team section splitting, and official detection.
 */

import { deduplicatePlayers } from '../dedup-players'
import { parsePlayerName, parseOfficialName } from './name-parsing'
import { MAX_SHIRT_NUMBER, MIN_NAME_LENGTH, extractShirtNumber } from './ocr-corrections'
import {
  SWISS_HEADER_PATTERNS,
  isLiberoMarker,
  isOfficialsMarker,
  isEndMarker,
} from './swiss-tabular'

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

/** Minimum length for team name text */
const MIN_TEAM_NAME_LENGTH = 3

/** Minimum ratio of letters in team name */
const MIN_LETTER_RATIO = 0.6

/** Valid official roles (C=Coach, AC=Assistant Coach, M=Medical, P=Physiotherapist) */
const VALID_ROLES = new Set(['C', 'AC', 'AC2', 'AC3', 'AC4', 'M', 'P'])

/** Date pattern - DD.MM.YY(YY) or incomplete OCR dates like DD.MM. (trailing dot, no year) */
const DATE_PATTERN = /^\d{1,2}\.\d{1,2}\.\d{0,4}$/

/** Name pattern - starts with a letter */
const NAME_START_PATTERN = /^[A-Za-zÀ-ÿ]/

/** Jersey number pattern (1-2 digits) */
const JERSEY_NUMBER_PATTERN = /^\d{1,2}$/

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
 * Check if a line is a Swiss multilingual header row (license/player/name headers).
 */
function isSwissDataHeader(line: string): boolean {
  return SWISS_HEADER_PATTERNS.some((pattern) => pattern.test(line))
}

// =============================================================================
// Player / Official Extraction
// =============================================================================

/**
 * Try to extract a player from a tab-separated line with format: date\tnumber\tname
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

  if (currentIndex < parts.length && DATE_PATTERN.test(parts[currentIndex]!)) {
    birthDate = parts[currentIndex]!
    currentIndex++
  }

  if (currentIndex < parts.length && JERSEY_NUMBER_PATTERN.test(parts[currentIndex]!)) {
    const num = parseInt(parts[currentIndex]!, 10)
    if (num >= 1 && num <= MAX_SHIRT_NUMBER) {
      jerseyNumber = num
      currentIndex++
    }
  }

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

  const shirtNumber = extractShirtNumber(numberStr)

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
 * Normalize official role strings.
 * AC1 → AC (Swiss form convention)
 */
function normalizeRole(role: string): string | null {
  const upper = role.toUpperCase()
  if (VALID_ROLES.has(upper)) return upper
  if (upper === 'AC1') return 'AC'
  return null
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

  if (currentIndex < parts.length && DATE_PATTERN.test(parts[currentIndex]!)) {
    currentIndex++
  }

  if (currentIndex >= parts.length) return null
  const role = normalizeRole(parts[currentIndex]!)
  if (!role) return null
  currentIndex++

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

  if (!VALID_ROLES.has(roleStr)) return null
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

  if (trimmed.length < MIN_TEAM_NAME_LENGTH) return null

  if (PLAYER_LINE_PATTERN.test(trimmed)) return null
  if (PLAYER_LINE_LENIENT.test(trimmed)) return null

  if (trimmed.includes('\t') && DATE_PATTERN.test(trimmed.split('\t')[0]!.trim())) return null

  if (isLiberoMarker(trimmed)) return null
  if (isOfficialsMarker(trimmed)) return null
  if (isEndMarker(trimmed)) return null

  if (isSwissFormLabelOrHeader(trimmed)) return null

  const letterCount = (trimmed.match(/[A-Za-zÀ-ÿ]/g) ?? []).length
  if (letterCount >= MIN_TEAM_NAME_LENGTH && letterCount / trimmed.length > MIN_LETTER_RATIO) {
    return trimmed
  }

  return null
}

/**
 * Split text into sections for two teams
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

function isTeamAMarker(upperLine: string): boolean {
  return TEAM_A_MARKERS.some((marker) => upperLine.includes(marker))
}

function isTeamBMarker(upperLine: string): boolean {
  return TEAM_B_MARKERS.some((marker) => upperLine.includes(marker))
}

function extractNameFromMarker(line: string, stripPattern: RegExp): string {
  const cleaned = line.replace(stripPattern, '').trim()
  return extractTeamName(cleaned) ?? ''
}

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

function looksLikeTeamContent(line: string): boolean {
  return (
    tryExtractPlayer(line) !== null ||
    tryExtractOfficial(line) !== null ||
    isLiberoMarker(line) ||
    isOfficialsMarker(line)
  )
}

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

function handleEndMarker(trimmed: string, state: SplitterState): boolean {
  if (!isEndMarker(trimmed)) return false
  if (state.currentTeam === 'A' && state.teamAHasContent) {
    state.seenEndMarkerInTeamA = true
  }
  return true
}

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
    if (isOfficialsMarker(line)) {
      inOfficialsSection = true
      continue
    }
    if (isEndMarker(line)) {
      break
    }

    if (isLiberoMarker(line)) {
      continue
    }

    if (inOfficialsSection) {
      const official = tryExtractOfficial(line)
      if (official) {
        team.officials.push(official)
      }
    } else {
      const player = tryExtractPlayer(line)
      if (player) {
        team.players.push(player)
        continue
      }

      const official = tryExtractOfficial(line)
      if (official) {
        team.officials.push(official)
      }
    }
  }

  return { team, warnings }
}

// =============================================================================
// Main Sequential Parser
// =============================================================================

/**
 * Parse sequential manuscript format (Team A section followed by Team B section)
 */
export function parseSequentialSheet(lines: string[]): ParsedGameSheet {
  const warnings: string[] = []

  const sections = splitIntoTeamSections(lines)

  const teamAResult = parseTeamLines(sections.teamALines, sections.teamAName)
  const teamBResult = parseTeamLines(sections.teamBLines, sections.teamBName)

  deduplicatePlayers(teamAResult.team)
  deduplicatePlayers(teamBResult.team)

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
