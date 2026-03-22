/**
 * Description Field Parsers
 *
 * Functions for extracting structured data from iCal DESCRIPTION fields
 * and other text properties. Handles multi-language volleymanager formats
 * (German, French, Italian, English).
 *
 * Also includes Plus Code / Maps URL utilities used during event parsing.
 */

import type { RefereeRole, Gender } from './types'

// ---------------------------------------------------------------------------
// Constants & Patterns
// ---------------------------------------------------------------------------

/** Pattern to extract Google Maps URL from description */
export const MAPS_URL_PATTERN =
  /https?:\/\/(?:www\.)?(?:maps\.google\.com|google\.com\/maps)[^\s\\]*/i

/**
 * Pattern to extract Google Plus Code from a URL query string.
 * Plus Codes have the format: 4-8 alphanumeric chars + plus sign + 2-4 alphanumeric chars
 * The plus sign is URL-encoded as %2B in query strings.
 * Example: ?q=8FV9HH8J%2B49 -> 8FV9HH8J+49
 */
const PLUS_CODE_PATTERN = /[?&]q=([A-Z0-9]{4,8}(?:%2B|\+)[A-Z0-9]{2,4})/i

/** Role mapping from raw strings to RefereeRole type */
const ROLE_MAPPINGS: Record<string, RefereeRole> = {
  // French patterns: ARB 1, ARB 2, JL 1, JL 2
  'ARB 1': 'referee1',
  'ARB 2': 'referee2',
  ARB1: 'referee1',
  ARB2: 'referee2',
  // German patterns: 1. SR, 2. SR (with period)
  '1. SR': 'referee1',
  '2. SR': 'referee2',
  '1.SR': 'referee1',
  '2.SR': 'referee2',
  // Alternative patterns: SR 1, SR 2 (without period)
  'SR 1': 'referee1',
  'SR 2': 'referee2',
  SR1: 'referee1',
  SR2: 'referee2',
  // French/generic scorer: JL
  JL: 'scorer',
  'JL 1': 'scorer',
  'JL 2': 'scorer',
  JL1: 'scorer',
  JL2: 'scorer',
  // Line referees: LR or with number prefix (German)
  LR: 'lineReferee',
  'LR 1': 'lineReferee',
  'LR 2': 'lineReferee',
  LR1: 'lineReferee',
  LR2: 'lineReferee',
  // German line referee patterns: 1. LR, 2. LR
  '1. LR': 'lineReferee',
  '2. LR': 'lineReferee',
  '1.LR': 'lineReferee',
  '2.LR': 'lineReferee',
}

// ---------------------------------------------------------------------------
// Role Parsing
// ---------------------------------------------------------------------------

/**
 * Maps a raw role string to a RefereeRole type.
 * Uses case-insensitive matching and normalizes whitespace.
 */
export function parseRole(roleStr: string): RefereeRole {
  const normalized = roleStr.trim().toUpperCase().replace(/\s+/g, ' ')
  return ROLE_MAPPINGS[normalized] ?? 'unknown'
}

// ---------------------------------------------------------------------------
// Gender Detection
// ---------------------------------------------------------------------------

/**
 * Detects gender from league name patterns.
 * Handles German, French, Italian, and English patterns,
 * as well as gender symbols (♀/♂).
 */
export function parseGender(leagueName: string, description: string): Gender {
  const combined = `${leagueName} ${description}`.toLowerCase()

  // Check for gender symbols first (most reliable)
  if (combined.includes('♀')) return 'women'
  if (combined.includes('♂')) return 'men'

  // Check for mixed patterns
  if (/\bmixed\b/i.test(combined) || /\bgemischt\b/i.test(combined)) {
    return 'mixed'
  }

  // Check for women's patterns in multiple languages
  const womenPatterns = /\b(damen|frauen|femmes|donne|women|ladies|fem\.|f\.|nla\s*f|nlb\s*f)\b/i
  if (womenPatterns.test(combined)) return 'women'

  // Check for men's patterns in multiple languages
  const menPatterns = /\b(herren|männer|hommes|uomini|men|masc\.|m\.|nla\s*m|nlb\s*m)\b/i
  if (menPatterns.test(combined)) return 'men'

  return 'unknown'
}

// ---------------------------------------------------------------------------
// League Category
// ---------------------------------------------------------------------------

/**
 * Extracts league category from description.
 * Format: "Ligue: #6652 | 3L | ♂" or "Liga: #6652 | 3L | ♂"
 * The category is the middle part (e.g., "3L", "NLA", "2L")
 */
export function parseLeagueCategory(description: string): string | null {
  // Find the league line using string operations to avoid regex backtracking
  const lines = description.split('\n')
  for (const line of lines) {
    const lowerLine = line.toLowerCase()
    if (
      lowerLine.includes('ligue:') ||
      lowerLine.includes('liga:') ||
      lowerLine.includes('league:') ||
      lowerLine.includes('lega:')
    ) {
      // Split by | and take the second part (index 1 = category)
      const parts = line.split('|')
      const categoryPart = parts[1]
      if (parts.length >= 2 && categoryPart) {
        const category = categoryPart.trim()
        if (category.length > 0) {
          return category
        }
      }
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Referee Names
// ---------------------------------------------------------------------------

/**
 * Extracts referee names from description.
 *
 * Handles multiple language formats:
 * - French: "ARB 1: Name | email | phone", "ARB 2: Name | email | phone"
 * - German: "1. SR: Name | email | phone", "2. SR: Name | email | phone"
 * - Line refs French: "JL 1: Name | email | phone"
 * - Line refs German: "1. LR: Name | email | phone", "2. LR: Name | email | phone"
 */
export function parseRefereeNames(description: string): {
  referee1?: string
  referee2?: string
  lineReferee1?: string
  lineReferee2?: string
} {
  const referees: {
    referee1?: string
    referee2?: string
    lineReferee1?: string
    lineReferee2?: string
  } = {}

  // Use [^|\n]+ to match name up to pipe or newline (greedy, no backtracking)
  // Match referee 1 patterns:
  // - French: "ARB 1:" or "SR 1:"
  // - German: "1. SR:" (number first with period)
  const ref1Match = description.match(/(?:(?:ARB|SR)\s*1|1\.\s*SR):\s*([^|\n]+)/im)
  if (ref1Match?.[1]) {
    referees.referee1 = ref1Match[1].trim()
  }

  // Match referee 2 patterns:
  // - French: "ARB 2:" or "SR 2:"
  // - German: "2. SR:" (number first with period)
  const ref2Match = description.match(/(?:(?:ARB|SR)\s*2|2\.\s*SR):\s*([^|\n]+)/im)
  if (ref2Match?.[1]) {
    referees.referee2 = ref2Match[1].trim()
  }

  // Match line referee 1 patterns:
  // - French: "LR 1:" or "JL 1:"
  // - German: "1. LR:"
  const lr1Match = description.match(/(?:(?:LR|JL)\s*1|1\.\s*LR):\s*([^|\n]+)/im)
  if (lr1Match?.[1]) {
    referees.lineReferee1 = lr1Match[1].trim()
  }

  // Match line referee 2 patterns:
  // - French: "LR 2:" or "JL 2:"
  // - German: "2. LR:"
  const lr2Match = description.match(/(?:(?:LR|JL)\s*2|2\.\s*LR):\s*([^|\n]+)/im)
  if (lr2Match?.[1]) {
    referees.lineReferee2 = lr2Match[1].trim()
  }

  return referees
}

// ---------------------------------------------------------------------------
// Game Number
// ---------------------------------------------------------------------------

/**
 * Extracts game number from description.
 * Format: "Match: #382360 | ..." or "Spiel: #382360 | ..."
 */
export function parseGameNumber(description: string): number | null {
  // Match patterns like "Match: #382360" or "Spiel: #382360"
  const match = description.match(/(?:Match|Spiel|Partie|Partita):\s*#?(\d+)/i)
  if (match?.[1]) {
    return parseInt(match[1], 10)
  }
  return null
}

// ---------------------------------------------------------------------------
// Association
// ---------------------------------------------------------------------------

/**
 * Extracts regional association code from team info in description.
 *
 * Handles multiple language formats:
 * - French: "Equipe recevante: #10008 | TV St. Johann (3L, ♀, SVRBA)"
 * - German: "Heimteam: #20 | Volley Amriswil (NLA, ♂, SV)"
 *
 * The association code is the last item in parentheses: (Category, Gender, AssociationCode)
 */
export function parseAssociation(description: string): string | null {
  // Team line labels in different languages
  const teamLabels = [
    'equipe recevante:',
    'equipe visiteuse:',
    'heimteam:',
    'gastteam:',
    'home team:',
    'away team:',
    'squadra di casa:',
    'squadra ospite:',
  ]

  // Find a team line by checking each line
  const lines = description.split('\n')
  for (const line of lines) {
    const lowerLine = line.toLowerCase()
    if (teamLabels.some((label) => lowerLine.includes(label))) {
      // Split by | to get the team info part: "TV St. Johann (3L, ♀, SVRBA)"
      const parts = line.split('|')
      const teamPart = parts[1]
      if (teamPart) {
        // Find opening and closing parentheses using indexOf (no regex backtracking)
        const openParen = teamPart.lastIndexOf('(')
        const closeParen = teamPart.lastIndexOf(')')
        if (openParen !== -1 && closeParen > openParen) {
          const parenContent = teamPart.slice(openParen + 1, closeParen)
          // Split by comma to get: ["3L", " ♀", " SVRBA"]
          const values = parenContent.split(',')
          const lastValue = values[values.length - 1]
          if (lastValue) {
            const assoc = lastValue.trim().toUpperCase()
            // Validate it looks like an association code (2-6 uppercase letters)
            if (/^[A-Z]{2,6}$/.test(assoc)) {
              return assoc
            }
          }
        }
      }
    }
  }

  // Fallback: look for known association codes anywhere in description
  const knownAssociations = ['SVRBA', 'SVRZ', 'SVRI', 'SVRNO', 'SVRNW', 'SVRBE', 'SV']
  for (const assoc of knownAssociations) {
    if (description.includes(assoc)) {
      return assoc
    }
  }

  return null
}

// ---------------------------------------------------------------------------
// Hall Info
// ---------------------------------------------------------------------------

/**
 * Extracts hall ID and name from description.
 * Format: "Salle: #3661 | Turnhalle Sekundarschule Feld (H)"
 * or "Halle: #10 | Tellenfeld B (A)"
 */
export function parseHallInfo(description: string): {
  hallId: string | null
  hallName: string | null
} {
  // Hall labels in different languages
  const hallLabels = ['salle:', 'halle:', 'hall:', 'sala:']

  const lines = description.split('\n')
  for (const line of lines) {
    const lowerLine = line.toLowerCase()
    if (hallLabels.some((label) => lowerLine.includes(label))) {
      // Split by | to get: ["Salle: #3661", "Turnhalle Sekundarschule Feld (H)"]
      const parts = line.split('|')
      if (parts.length >= 2) {
        // Extract ID from first part (e.g., "#3661" or "#10")
        const idPart = parts[0]
        const idMatch = idPart ? /#?(\d+)/.exec(idPart) : null
        const hallId = idMatch?.[1] ?? null

        // Hall name is the second part
        const hallName = parts[1]?.trim() ?? null

        return { hallId, hallName }
      }
    }
  }
  return { hallId: null, hallName: null }
}

// ---------------------------------------------------------------------------
// Plus Code / Maps URL Utilities
// ---------------------------------------------------------------------------

/**
 * Extracts a Google Plus Code from a Google Maps URL.
 * The Plus Code is typically in the query parameter 'q=' and may be URL-encoded.
 *
 * @example
 * extractPlusCode('https://maps.google.com/?q=8FV9HH8J%2B49&hl=fr') // '8FV9HH8J+49'
 * extractPlusCode('https://maps.google.com/?q=8FVC7HR7+C3') // '8FVC7HR7+C3'
 */
export function extractPlusCode(mapsUrl: string): string | null {
  const match = PLUS_CODE_PATTERN.exec(mapsUrl)
  if (match?.[1]) {
    // Decode URL-encoded plus sign (%2B -> +)
    return decodeURIComponent(match[1])
  }
  return null
}

/**
 * Extracts a Plus Code from the description text by finding a Google Maps URL.
 */
export function extractPlusCodeFromDescription(description: string): string | null {
  const mapsMatch = MAPS_URL_PATTERN.exec(description)
  if (mapsMatch) {
    return extractPlusCode(mapsMatch[0])
  }
  return null
}

/**
 * Constructs a Google Maps URL from address or coordinates.
 */
export function buildMapsUrl(
  address: string | null,
  coordinates: { latitude: number; longitude: number } | null
): string | null {
  if (coordinates) {
    return `https://www.google.com/maps?q=${coordinates.latitude},${coordinates.longitude}`
  }
  if (address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
  }
  return null
}
