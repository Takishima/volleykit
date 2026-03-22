/**
 * Official Parsing
 *
 * Parses team officials (coaches, assistant coaches, medical staff)
 * from Swiss tabular format lines.
 */

import { parseOfficialName } from './name-parsing'
import {
  TABULAR_TOTAL_COLUMNS,
  TABULAR_COLUMNS_PER_TEAM,
  DATE_PATTERN,
  NAME_START_PATTERN,
} from './player-parsing'

import type { ParsedOfficial, OfficialRole } from '../../types'

// =============================================================================
// Constants
// =============================================================================

/** Valid official roles (C=Coach, AC=Assistant Coach, M=Medical, P=Physiotherapist) */
const VALID_ROLES = new Set(['C', 'AC', 'AC2', 'AC3', 'AC4', 'M', 'P'])

/** Official line pattern (starts with C/AC followed by tab) */
export const OFFICIAL_LINE_START_PATTERN = /^[CA]C?\d?\t/i

// =============================================================================
// Helpers
// =============================================================================

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

// =============================================================================
// Main Export
// =============================================================================

/**
 * Parse a tab-separated officials line from Swiss format
 */
export function parseSwissOfficialsLine(line: string): {
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
