/**
 * Assignment Mapper
 *
 * Converts raw ICalEvent objects into structured CalendarAssignment objects.
 * Handles SUMMARY parsing, location processing, confidence calculation,
 * and orchestrates all description-level parsers.
 */

import {
  MAPS_URL_PATTERN,
  parseRole,
  parseGender,
  parseLeagueCategory,
  parseRefereeNames,
  parseGameNumber,
  parseAssociation,
  parseHallInfo,
  buildMapsUrl,
} from './description-parsers'

import type {
  ICalEvent,
  CalendarAssignment,
  RefereeRole,
  ParseResult,
  ParsedFields,
  ParseConfidence,
} from './types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Pattern to extract game ID from UID */
const GAME_ID_PATTERN = /referee-convocation-for-game-(\d+)/

/** Pattern to match numeric IDs (for fallback extraction) */
const NUMERIC_ID_PATTERN = /#(\d+)/

// ---------------------------------------------------------------------------
// SUMMARY Parsing
// ---------------------------------------------------------------------------

/**
 * Parses the SUMMARY field to extract role, teams, and league.
 * Expected format: "ARB 1 | Team1 - Team2 (League Name)"
 */
export function parseSummary(summary: string): {
  roleRaw: string
  role: RefereeRole
  homeTeam: string
  awayTeam: string
  league: string
  parsed: { role: boolean; teams: boolean; league: boolean }
} {
  const result = {
    roleRaw: '',
    role: 'unknown' as RefereeRole,
    homeTeam: '',
    awayTeam: '',
    league: '',
    parsed: { role: false, teams: false, league: false },
  }

  // Split by " | " to separate role from match info
  const pipeIndex = summary.indexOf(' | ')
  if (pipeIndex === -1) {
    // Try without spaces around pipe
    const altPipeIndex = summary.indexOf('|')
    if (altPipeIndex !== -1) {
      result.roleRaw = summary.slice(0, altPipeIndex).trim()
      result.role = parseRole(result.roleRaw)
      result.parsed.role = result.role !== 'unknown'
    }
    return result
  }

  result.roleRaw = summary.slice(0, pipeIndex).trim()
  result.role = parseRole(result.roleRaw)
  result.parsed.role = result.role !== 'unknown'

  // eslint-disable-next-line @typescript-eslint/no-magic-numbers -- " | " separator length
  const matchInfo = summary.slice(pipeIndex + 3).trim()

  // Extract league from parentheses at the end using string operations
  // to avoid ReDoS vulnerability from regex backtracking
  let leagueStartIndex = -1

  const lastCloseParen = matchInfo.lastIndexOf(')')
  if (lastCloseParen !== -1) {
    // Find matching open paren by scanning backwards
    const lastOpenParen = matchInfo.lastIndexOf('(', lastCloseParen)
    if (lastOpenParen !== -1 && lastOpenParen < lastCloseParen) {
      leagueStartIndex = lastOpenParen
      result.league = matchInfo.slice(lastOpenParen + 1, lastCloseParen).trim()
      result.parsed.league = result.league.length > 0
    }
  }

  // Extract teams (everything before the league parentheses)
  const teamsStr = leagueStartIndex !== -1 ? matchInfo.slice(0, leagueStartIndex).trim() : matchInfo

  // Split teams by " - "
  const teamSeparator = teamsStr.indexOf(' - ')
  if (teamSeparator !== -1) {
    result.homeTeam = teamsStr.slice(0, teamSeparator).trim()
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers -- " - " separator length
    result.awayTeam = teamsStr.slice(teamSeparator + 3).trim()
    result.parsed.teams = result.homeTeam.length > 0 && result.awayTeam.length > 0
  }

  return result
}

// ---------------------------------------------------------------------------
// Location Parsing
// ---------------------------------------------------------------------------

/**
 * Parses the LOCATION field as a full address.
 *
 * In the real volleymanager API:
 * - LOCATION contains the full street address (e.g., "Landskronstrasse 41, 4147 Aesch, Suisse")
 * - Hall name comes from X-APPLE-STRUCTURED-LOCATION X-TITLE parameter (handled separately)
 *
 * This function optionally strips the country suffix (", Suisse") for cleaner display.
 */
export function parseLocation(
  location: string | null,
  appleLocationTitle: string | null
): {
  hallName: string | null
  address: string | null
  parsed: { venue: boolean; address: boolean }
} {
  const result = {
    hallName: appleLocationTitle,
    address: null as string | null,
    parsed: { venue: appleLocationTitle !== null && appleLocationTitle.length > 0, address: false },
  }

  if (!location) return result

  // Use the full location as the address
  // Strip country suffix for cleaner display (common in Swiss volleyball)
  // Handles both French "Suisse" and German "Schweiz"
  let address = location.trim()
  const countrySuffix = /, (?:Suisse|Schweiz)$/i
  if (countrySuffix.test(address)) {
    address = address.replace(countrySuffix, '')
  }

  result.address = address
  result.parsed.address = address.length > 0

  return result
}

// ---------------------------------------------------------------------------
// Confidence Calculation
// ---------------------------------------------------------------------------

/**
 * Calculates confidence level based on which fields were successfully parsed.
 */
export function calculateConfidence(fields: ParsedFields): ParseConfidence {
  const criticalFields = [fields.gameId, fields.role, fields.teams]
  const allCriticalParsed = criticalFields.every(Boolean)

  if (!allCriticalParsed) return 'low'

  const optionalFields = [fields.league, fields.venue, fields.address, fields.coordinates]
  const optionalParsedCount = optionalFields.filter(Boolean).length

  // eslint-disable-next-line @typescript-eslint/no-magic-numbers -- confidence threshold
  if (optionalParsedCount >= 3) return 'high'
  return 'medium'
}

// ---------------------------------------------------------------------------
// Main Assignment Extraction
// ---------------------------------------------------------------------------

/**
 * Converts a raw ICalEvent into a CalendarAssignment with full parsing metadata.
 *
 * This function uses pattern-based extraction to parse assignment details
 * without relying on language-specific labels in the description.
 *
 * ## Parsing patterns used:
 *
 * ### Game ID (from UID)
 * ```
 * UID: referee-convocation-for-game-{gameId}
 * Regex: /referee-convocation-for-game-(\d+)/
 * ```
 *
 * ### Role (from SUMMARY prefix)
 * ```
 * SUMMARY: {role} | {rest}
 * Known roles: ARB 1, ARB 2, LR, ...
 * ```
 *
 * ### Teams and League (from SUMMARY)
 * ```
 * SUMMARY: {role} | {homeTeam} - {awayTeam} ({league})
 * Split by " | " then parse "{home} - {away} ({league})"
 * ```
 *
 * ### Hall name (from LOCATION)
 * ```
 * LOCATION: {hallName}, {address}
 * First part before comma is typically the hall name
 * ```
 *
 * ### Gender (from league name patterns)
 * ```
 * Patterns: "Herren", "Damen", "Mixed", "Hommes", "Femmes"
 * Also: "NLA", "NLB" often indicate professional leagues
 * ```
 *
 * @param event - The raw ICalEvent to convert
 * @returns ParseResult containing the assignment and parsing metadata
 *
 * @example
 * ```typescript
 * const events = parseICalFeed(icsContent);
 * const result = extractAssignment(events[0]);
 *
 * if (result.confidence === 'high') {
 *   console.log(result.assignment.homeTeam); // "TV St. Johann 1"
 * } else {
 *   console.warn('Parsing issues:', result.warnings);
 * }
 * ```
 */
export function extractAssignment(event: ICalEvent): ParseResult {
  const warnings: string[] = []
  const parsedFields: ParsedFields = {
    gameId: false,
    role: false,
    teams: false,
    league: false,
    venue: false,
    address: false,
    coordinates: false,
  }

  // Extract game ID from UID
  let gameId = ''
  const gameIdMatch = GAME_ID_PATTERN.exec(event.uid)
  if (gameIdMatch?.[1]) {
    gameId = gameIdMatch[1]
    parsedFields.gameId = true
  } else {
    // Fallback: try to extract any numeric ID
    const numericMatch = NUMERIC_ID_PATTERN.exec(event.uid)
    if (numericMatch?.[1]) {
      gameId = numericMatch[1]
      parsedFields.gameId = true
      warnings.push('Game ID extracted using fallback pattern')
    } else {
      warnings.push('Could not extract game ID from UID')
    }
  }

  // Parse SUMMARY for role, teams, and league
  const summaryData = parseSummary(event.summary)
  parsedFields.role = summaryData.parsed.role
  parsedFields.teams = summaryData.parsed.teams
  parsedFields.league = summaryData.parsed.league

  if (!summaryData.parsed.role) {
    warnings.push(`Unknown role format: "${summaryData.roleRaw}"`)
  }
  if (!summaryData.parsed.teams) {
    warnings.push('Could not extract teams from summary')
  }
  if (!summaryData.parsed.league) {
    warnings.push('Could not extract league from summary')
  }

  // Extract hall ID and name from description
  const hallInfo = parseHallInfo(event.description)

  // Parse LOCATION for address, using appleLocationTitle for hall name
  // Priority for hall name: description-based > appleLocationTitle > null
  const locationData = parseLocation(event.location, hallInfo.hallName ?? event.appleLocationTitle)
  parsedFields.venue = locationData.parsed.venue
  parsedFields.address = locationData.parsed.address

  // Check for coordinates
  parsedFields.coordinates = event.geo !== null

  // Determine gender from league and description
  const gender = parseGender(summaryData.league, event.description)

  // Extract league category from description
  const leagueCategory = parseLeagueCategory(event.description)

  // Extract referee names from description
  const referees = parseRefereeNames(event.description)

  // Extract game number from description
  const gameNumber = parseGameNumber(event.description)

  // Extract association from team info in description
  const association = parseAssociation(event.description)

  // Extract or build maps URL
  const mapsMatch = MAPS_URL_PATTERN.exec(event.description)
  const mapsUrl = mapsMatch ? mapsMatch[0] : buildMapsUrl(locationData.address, event.geo)

  const assignment: CalendarAssignment = {
    gameId,
    gameNumber,
    role: summaryData.role,
    roleRaw: summaryData.roleRaw,
    startTime: event.dtstart,
    endTime: event.dtend,
    homeTeam: summaryData.homeTeam,
    awayTeam: summaryData.awayTeam,
    league: summaryData.league,
    leagueCategory,
    address: locationData.address,
    coordinates: event.geo,
    hallName: locationData.hallName,
    hallId: hallInfo.hallId,
    gender,
    mapsUrl,
    plusCode: event.plusCode,
    referees,
    association,
  }

  const confidence = calculateConfidence(parsedFields)

  return {
    assignment,
    parsedFields,
    confidence,
    warnings,
  }
}
