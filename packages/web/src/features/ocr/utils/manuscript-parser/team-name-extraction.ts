/**
 * Swiss Team Name Extraction
 *
 * Extracts team names from Swiss scoresheet headers by detecting
 * club prefixes (VBC, VTV, etc.) in tab-separated header lines.
 */

import { SWISS_HEADER_PATTERNS } from './table-detection'

// =============================================================================
// Constants
// =============================================================================

/** Club prefixes used in Swiss volleyball team names */
const CLUB_PREFIXES = ['VTV', 'TV', 'VBC', 'BC', 'VC', 'SC', 'FC', 'STV', 'TSV', 'USC', 'US']

/** Minimum length for a valid team name */
const MIN_VALID_TEAM_NAME_LENGTH = 3

// =============================================================================
// Helpers
// =============================================================================

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

// =============================================================================
// Main Export
// =============================================================================

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
