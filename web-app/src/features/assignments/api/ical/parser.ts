/**
 * iCal Parser for volleymanager.volleyball.ch calendar feeds
 *
 * This module provides functions to parse iCal (.ics) content from the
 * volleymanager public calendar feeds and extract assignment information.
 *
 * ## Parsing Strategy
 *
 * The parser uses defensive pattern-based parsing that does NOT rely on
 * language-dependent labels. This is important because:
 * 1. The iCal feed may be in German, French, Italian, or English
 * 2. Label text may change over time
 * 3. We want to extract data reliably regardless of locale
 *
 * ### Pattern-based extraction examples:
 *
 * **Game ID from UID:**
 * - Pattern: `referee-convocation-for-game-{gameId}`
 * - Extract using regex: `/referee-convocation-for-game-(\d+)/`
 *
 * **Role from SUMMARY:**
 * - Pattern: `{role} | {homeTeam} - {awayTeam} ({league})`
 * - Roles are standardized abbreviations: ARB 1, ARB 2, LR, etc.
 *
 * **Teams from SUMMARY:**
 * - Split by " | " to separate role from match info
 * - Split match info by " - " to get teams
 * - League is in parentheses at the end
 *
 * **Coordinates from GEO:**
 * - Standard iCal format: `GEO:{latitude};{longitude}`
 * - No language dependency
 *
 * ## Sample iCal Data
 *
 * ```ics
 * BEGIN:VCALENDAR
 * VERSION:2.0
 * PRODID:-//Volleyball.ch//Volleymanager//EN
 * BEGIN:VEVENT
 * UID:referee-convocation-for-game-392936
 * SUMMARY:ARB 1 | TV St. Johann 1 - VTV Horw 1 (Mobiliar Volley Cup)
 * DESCRIPTION:Funktion: ARB 1\n
 *   Spiel-Nr: 392936\n
 *   Datum: 15.02.2025\n
 *   Zeit: 14:00\n
 *   Teams: TV St. Johann 1 vs VTV Horw 1\n
 *   Liga: Mobiliar Volley Cup\n
 *   Halle: Sporthalle Sternenfeld\n
 *   Adresse: Sternenfeldstrasse 50, 4127 Birsfelden\n
 *   Kontakt Heim: Max Mustermann (+41 79 123 45 67)\n
 *   Kontakt Gast: Anna Example (+41 78 987 65 43)
 * DTSTART:20250215T140000
 * DTEND:20250215T170000
 * LOCATION:Sporthalle Sternenfeld, Sternenfeldstrasse 50, 4127 Birsfelden
 * GEO:47.5584;7.6277
 * END:VEVENT
 * END:VCALENDAR
 * ```
 */

import type {
  ICalEvent,
  CalendarAssignment,
  ParseResult,
  ParsedFields,
  ParseConfidence,
  RefereeRole,
  Gender,
} from './types';
import { decode as decodePlusCode } from 'pluscodes';

/** Pattern to extract game ID from UID */
const GAME_ID_PATTERN = /referee-convocation-for-game-(\d+)/;

/** Pattern to match numeric IDs (for fallback extraction) */
const NUMERIC_ID_PATTERN = /#(\d+)/;

/** Pattern to extract Google Maps URL from description */
const MAPS_URL_PATTERN = /https?:\/\/(?:www\.)?(?:maps\.google\.com|google\.com\/maps)[^\s\\]*/i;

/**
 * Pattern to extract Google Plus Code from a URL query string.
 * Plus Codes have the format: 4-8 alphanumeric chars + plus sign + 2-4 alphanumeric chars
 * The plus sign is URL-encoded as %2B in query strings.
 * Example: ?q=8FV9HH8J%2B49 -> 8FV9HH8J+49
 */
const PLUS_CODE_PATTERN = /[?&]q=([A-Z0-9]{4,8}(?:%2B|\+)[A-Z0-9]{2,4})/i;

/** Role mapping from raw strings to RefereeRole type */
const ROLE_MAPPINGS: Record<string, RefereeRole> = {
  // French patterns: ARB 1, ARB 2, JL 1, JL 2
  'ARB 1': 'referee1',
  'ARB 2': 'referee2',
  'ARB1': 'referee1',
  'ARB2': 'referee2',
  // German patterns: 1. SR, 2. SR (with period)
  '1. SR': 'referee1',
  '2. SR': 'referee2',
  '1.SR': 'referee1',
  '2.SR': 'referee2',
  // Alternative patterns: SR 1, SR 2 (without period)
  'SR 1': 'referee1',
  'SR 2': 'referee2',
  'SR1': 'referee1',
  'SR2': 'referee2',
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
};

/**
 * Maps a raw role string to a RefereeRole type.
 * Uses case-insensitive matching and normalizes whitespace.
 */
function parseRole(roleStr: string): RefereeRole {
  const normalized = roleStr.trim().toUpperCase().replace(/\s+/g, ' ');
  return ROLE_MAPPINGS[normalized] ?? 'unknown';
}

/**
 * Detects gender from league name patterns.
 * Handles German, French, Italian, and English patterns,
 * as well as gender symbols (♀/♂).
 */
function parseGender(leagueName: string, description: string): Gender {
  const combined = `${leagueName} ${description}`.toLowerCase();

  // Check for gender symbols first (most reliable)
  if (combined.includes('♀')) return 'women';
  if (combined.includes('♂')) return 'men';

  // Check for mixed patterns
  if (/\bmixed\b/i.test(combined) || /\bgemischt\b/i.test(combined)) {
    return 'mixed';
  }

  // Check for women's patterns in multiple languages
  const womenPatterns =
    /\b(damen|frauen|femmes|donne|women|ladies|fem\.|f\.|nla\s*f|nlb\s*f)\b/i;
  if (womenPatterns.test(combined)) return 'women';

  // Check for men's patterns in multiple languages
  const menPatterns =
    /\b(herren|männer|hommes|uomini|men|masc\.|m\.|nla\s*m|nlb\s*m)\b/i;
  if (menPatterns.test(combined)) return 'men';

  return 'unknown';
}

/**
 * Extracts league category from description.
 * Format: "Ligue: #6652 | 3L | ♂" or "Liga: #6652 | 3L | ♂"
 * The category is the middle part (e.g., "3L", "NLA", "2L")
 */
function parseLeagueCategory(description: string): string | null {
  // Find the league line using string operations to avoid regex backtracking
  const lines = description.split('\n');
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    if (
      lowerLine.includes('ligue:') ||
      lowerLine.includes('liga:') ||
      lowerLine.includes('league:') ||
      lowerLine.includes('lega:')
    ) {
      // Split by | and take the second part (index 1 = category)
      const parts = line.split('|');
      const categoryPart = parts[1];
      if (parts.length >= 2 && categoryPart) {
        const category = categoryPart.trim();
        if (category.length > 0) {
          return category;
        }
      }
    }
  }
  return null;
}

/**
 * Extracts referee names from description.
 *
 * Handles multiple language formats:
 * - French: "ARB 1: Name | email | phone", "ARB 2: Name | email | phone"
 * - German: "1. SR: Name | email | phone", "2. SR: Name | email | phone"
 * - Line refs French: "JL 1: Name | email | phone"
 * - Line refs German: "1. LR: Name | email | phone", "2. LR: Name | email | phone"
 */
function parseRefereeNames(description: string): {
  referee1?: string;
  referee2?: string;
  lineReferee1?: string;
  lineReferee2?: string;
} {
  const referees: {
    referee1?: string;
    referee2?: string;
    lineReferee1?: string;
    lineReferee2?: string;
  } = {};

  // Use [^|\n]+ to match name up to pipe or newline (greedy, no backtracking)
  // Match referee 1 patterns:
  // - French: "ARB 1:" or "SR 1:"
  // - German: "1. SR:" (number first with period)
  const ref1Match = description.match(/(?:(?:ARB|SR)\s*1|1\.\s*SR):\s*([^|\n]+)/im);
  if (ref1Match?.[1]) {
    referees.referee1 = ref1Match[1].trim();
  }

  // Match referee 2 patterns:
  // - French: "ARB 2:" or "SR 2:"
  // - German: "2. SR:" (number first with period)
  const ref2Match = description.match(/(?:(?:ARB|SR)\s*2|2\.\s*SR):\s*([^|\n]+)/im);
  if (ref2Match?.[1]) {
    referees.referee2 = ref2Match[1].trim();
  }

  // Match line referee 1 patterns:
  // - French: "LR 1:" or "JL 1:"
  // - German: "1. LR:"
  const lr1Match = description.match(/(?:(?:LR|JL)\s*1|1\.\s*LR):\s*([^|\n]+)/im);
  if (lr1Match?.[1]) {
    referees.lineReferee1 = lr1Match[1].trim();
  }

  // Match line referee 2 patterns:
  // - French: "LR 2:" or "JL 2:"
  // - German: "2. LR:"
  const lr2Match = description.match(/(?:(?:LR|JL)\s*2|2\.\s*LR):\s*([^|\n]+)/im);
  if (lr2Match?.[1]) {
    referees.lineReferee2 = lr2Match[1].trim();
  }

  return referees;
}

/**
 * Extracts game number from description.
 * Format: "Match: #382360 | ..." or "Spiel: #382360 | ..."
 */
function parseGameNumber(description: string): number | null {
  // Match patterns like "Match: #382360" or "Spiel: #382360"
  const match = description.match(/(?:Match|Spiel|Partie|Partita):\s*#?(\d+)/i);
  if (match?.[1]) {
    return parseInt(match[1], 10);
  }
  return null;
}

/**
 * Extracts regional association code from team info in description.
 *
 * Handles multiple language formats:
 * - French: "Equipe recevante: #10008 | TV St. Johann (3L, ♀, SVRBA)"
 * - German: "Heimteam: #20 | Volley Amriswil (NLA, ♂, SV)"
 *
 * The association code is the last item in parentheses: (Category, Gender, AssociationCode)
 */
function parseAssociation(description: string): string | null {
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
  ];

  // Find a team line by checking each line
  const lines = description.split('\n');
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    if (teamLabels.some((label) => lowerLine.includes(label))) {
      // Split by | to get the team info part: "TV St. Johann (3L, ♀, SVRBA)"
      const parts = line.split('|');
      const teamPart = parts[1];
      if (teamPart) {
        // Find opening and closing parentheses using indexOf (no regex backtracking)
        const openParen = teamPart.lastIndexOf('(');
        const closeParen = teamPart.lastIndexOf(')');
        if (openParen !== -1 && closeParen > openParen) {
          const parenContent = teamPart.slice(openParen + 1, closeParen);
          // Split by comma to get: ["3L", " ♀", " SVRBA"]
          const values = parenContent.split(',');
          const lastValue = values[values.length - 1];
          if (lastValue) {
            const assoc = lastValue.trim().toUpperCase();
            // Validate it looks like an association code (2-6 uppercase letters)
            if (/^[A-Z]{2,6}$/.test(assoc)) {
              return assoc;
            }
          }
        }
      }
    }
  }

  // Fallback: look for known association codes anywhere in description
  const knownAssociations = ['SVRBA', 'SVRZ', 'SVRI', 'SVRNO', 'SVRNW', 'SVRBE', 'SV'];
  for (const assoc of knownAssociations) {
    if (description.includes(assoc)) {
      return assoc;
    }
  }

  return null;
}

/**
 * Extracts hall ID and name from description.
 * Format: "Salle: #3661 | Turnhalle Sekundarschule Feld (H)"
 * or "Halle: #10 | Tellenfeld B (A)"
 */
function parseHallInfo(description: string): {
  hallId: string | null;
  hallName: string | null;
} {
  // Hall labels in different languages
  const hallLabels = ['salle:', 'halle:', 'hall:', 'sala:'];

  const lines = description.split('\n');
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    if (hallLabels.some((label) => lowerLine.includes(label))) {
      // Split by | to get: ["Salle: #3661", "Turnhalle Sekundarschule Feld (H)"]
      const parts = line.split('|');
      if (parts.length >= 2) {
        // Extract ID from first part (e.g., "#3661" or "#10")
        const idPart = parts[0];
        const idMatch = idPart ? /#?(\d+)/.exec(idPart) : null;
        const hallId = idMatch?.[1] ?? null;

        // Hall name is the second part
        const hallName = parts[1]?.trim() ?? null;

        return { hallId, hallName };
      }
    }
  }
  return { hallId: null, hallName: null };
}

/**
 * Converts an iCal date string to ISO 8601 format.
 * Handles formats:
 * - YYYYMMDDTHHMMSS (local time)
 * - YYYYMMDDTHHMMSSZ (UTC)
 * - YYYYMMDD (date only)
 */
function parseICalDate(icalDate: string): string {
  // Remove any parameters (e.g., TZID)
  const dateStr = icalDate.includes(':')
    ? icalDate.split(':').pop()!
    : icalDate;

  // Handle date-only format (YYYYMMDD)
  if (dateStr.length === 8) {
    const year = dateStr.slice(0, 4);
    const month = dateStr.slice(4, 6);
    const day = dateStr.slice(6, 8);
    return `${year}-${month}-${day}`;
  }

  // Handle datetime format (YYYYMMDDTHHMMSS or YYYYMMDDTHHMMSSZ)
  const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/.exec(
    dateStr
  );
  if (match) {
    const [, year, month, day, hour, minute, second, utc] = match;
    const iso = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
    return utc ? `${iso}Z` : iso;
  }

  // Return as-is if format is unrecognized
  return icalDate;
}

/**
 * Extracts a Google Plus Code from a Google Maps URL.
 * The Plus Code is typically in the query parameter 'q=' and may be URL-encoded.
 *
 * @example
 * extractPlusCode('https://maps.google.com/?q=8FV9HH8J%2B49&hl=fr') // '8FV9HH8J+49'
 * extractPlusCode('https://maps.google.com/?q=8FVC7HR7+C3') // '8FVC7HR7+C3'
 */
function extractPlusCode(mapsUrl: string): string | null {
  const match = PLUS_CODE_PATTERN.exec(mapsUrl);
  if (match?.[1]) {
    // Decode URL-encoded plus sign (%2B -> +)
    return decodeURIComponent(match[1]);
  }
  return null;
}

/**
 * Extracts a Plus Code from the description text by finding a Google Maps URL.
 */
function extractPlusCodeFromDescription(description: string): string | null {
  const mapsMatch = MAPS_URL_PATTERN.exec(description);
  if (mapsMatch) {
    return extractPlusCode(mapsMatch[0]);
  }
  return null;
}

/**
 * Constructs a Google Maps URL from address or coordinates.
 */
function buildMapsUrl(
  address: string | null,
  coordinates: { latitude: number; longitude: number } | null
): string | null {
  if (coordinates) {
    return `https://www.google.com/maps?q=${coordinates.latitude},${coordinates.longitude}`;
  }
  if (address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  }
  return null;
}

/**
 * Calculates confidence level based on which fields were successfully parsed.
 */
function calculateConfidence(fields: ParsedFields): ParseConfidence {
  const criticalFields = [fields.gameId, fields.role, fields.teams];
  const allCriticalParsed = criticalFields.every(Boolean);

  if (!allCriticalParsed) return 'low';

  const optionalFields = [
    fields.league,
    fields.venue,
    fields.address,
    fields.coordinates,
  ];
  const optionalParsedCount = optionalFields.filter(Boolean).length;

  if (optionalParsedCount >= 3) return 'high';
  return 'medium';
}

/**
 * Unfolds multi-line iCal content according to RFC 5545.
 * Lines starting with a space or tab are continuations of the previous line.
 */
function unfoldLines(content: string): string {
  // Normalize line endings to \r\n (iCal standard)
  const normalized = content.replace(/\r?\n/g, '\r\n');
  // Unfold continuation lines (lines starting with space or tab)
  return normalized.replace(/\r\n[ \t]/g, '');
}

/**
 * Unescapes iCal text values.
 * Handles: \n -> newline, \, -> comma, \\ -> backslash, \; -> semicolon
 *
 * Uses a placeholder approach to prevent double-unescaping vulnerabilities.
 * For example, "\\n" (escaped backslash + n) should become "\n" (backslash + n),
 * not a newline character.
 */
function unescapeText(text: string): string {
  // Use null character as placeholder for escaped backslashes
  const BACKSLASH_PLACEHOLDER = '\x00';

  return (
    text
      // First, replace escaped backslashes with placeholder to prevent double-unescaping
      .replace(/\\\\/g, BACKSLASH_PLACEHOLDER)
      // Then unescape other sequences
      .replace(/\\n/g, '\n')
      .replace(/\\,/g, ',')
      .replace(/\\;/g, ';')
      // Finally, convert placeholder back to single backslash
      .replaceAll(BACKSLASH_PLACEHOLDER, '\\')
  );
}

/**
 * Extracts a property value from an iCal event block.
 * Handles property parameters (e.g., DTSTART;TZID=...:value)
 */
function extractProperty(
  eventBlock: string,
  propertyName: string
): string | null {
  // Split into lines and find the property line
  const lines = eventBlock.split(/\r?\n/);
  const upperPropName = propertyName.toUpperCase();

  for (const line of lines) {
    const upperLine = line.toUpperCase();
    // Check if line starts with property name followed by : or ;
    if (
      upperLine.startsWith(`${upperPropName}:`) ||
      upperLine.startsWith(`${upperPropName};`)
    ) {
      // Find the colon that separates parameters from value
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) continue;

      const value = line.slice(colonIndex + 1);
      return unescapeText(value.trim());
    }
  }

  return null;
}

/**
 * Extracts X-TITLE from X-APPLE-STRUCTURED-LOCATION property.
 * Format: X-APPLE-STRUCTURED-LOCATION;...;X-TITLE=Hall Name:lat;lon
 */
function extractAppleLocationTitle(eventBlock: string): string | null {
  const lines = eventBlock.split(/\r?\n/);

  for (const line of lines) {
    const upperLine = line.toUpperCase();
    if (upperLine.startsWith('X-APPLE-STRUCTURED-LOCATION')) {
      // Extract X-TITLE parameter value
      // Format: X-TITLE=Hall Name (may contain escaped characters)
      const titleMatch = line.match(/X-TITLE=([^:;]+)/i);
      if (titleMatch?.[1]) {
        return unescapeText(titleMatch[1].trim());
      }
    }
  }

  return null;
}

/**
 * Parses raw iCal (.ics) content into an array of ICalEvent objects.
 *
 * This function handles:
 * - Multi-line field unfolding (lines starting with space/tab are continuations)
 * - Escaped characters in text fields (\n, \,, \\, etc.)
 * - Extraction of standard VEVENT properties
 *
 * @param icsContent - Raw iCal file content as a string
 * @returns Array of parsed ICalEvent objects
 *
 * @example
 * ```typescript
 * const events = parseICalFeed(icsFileContent);
 * console.log(events[0].uid); // "referee-convocation-for-game-392936"
 * ```
 */
export function parseICalFeed(icsContent: string): ICalEvent[] {
  if (!icsContent || typeof icsContent !== 'string') {
    return [];
  }

  const unfolded = unfoldLines(icsContent);
  const events: ICalEvent[] = [];

  // Split into VEVENT blocks
  const eventBlocks = unfolded.split(/BEGIN:VEVENT/i).slice(1);

  for (const block of eventBlocks) {
    // Find the end of the event
    const endIndex = block.search(/END:VEVENT/i);
    if (endIndex === -1) continue;

    const eventContent = block.slice(0, endIndex);

    // Extract required properties
    const uid = extractProperty(eventContent, 'UID');
    const summary = extractProperty(eventContent, 'SUMMARY');
    const dtstart = extractProperty(eventContent, 'DTSTART');
    const dtend = extractProperty(eventContent, 'DTEND');

    // Skip events without required fields
    if (!uid || !summary || !dtstart) continue;

    // Extract optional properties
    const description = extractProperty(eventContent, 'DESCRIPTION') ?? '';
    const location = extractProperty(eventContent, 'LOCATION');
    const geoStr = extractProperty(eventContent, 'GEO');
    const appleLocationTitle = extractAppleLocationTitle(eventContent);

    // Parse GEO coordinates
    let geo: ICalEvent['geo'] = null;
    if (geoStr) {
      const geoParts = geoStr.split(';');
      const latStr = geoParts[0];
      const lonStr = geoParts[1];
      if (latStr !== undefined && lonStr !== undefined) {
        const latitude = parseFloat(latStr);
        const longitude = parseFloat(lonStr);
        if (!isNaN(latitude) && !isNaN(longitude)) {
          geo = { latitude, longitude };
        }
      }
    }

    // Extract Plus Code from Google Maps URL in description
    const plusCode = extractPlusCodeFromDescription(description);

    // If we have a Plus Code but no GEO coordinates, decode the Plus Code
    if (plusCode && !geo) {
      const decoded = decodePlusCode(plusCode);
      if (decoded) {
        geo = { latitude: decoded.latitude, longitude: decoded.longitude };
      }
    }

    events.push({
      uid,
      summary,
      description,
      dtstart: parseICalDate(dtstart),
      dtend: dtend ? parseICalDate(dtend) : parseICalDate(dtstart),
      location,
      appleLocationTitle,
      geo,
      plusCode,
    });
  }

  return events;
}

/**
 * Parses the SUMMARY field to extract role, teams, and league.
 * Expected format: "ARB 1 | Team1 - Team2 (League Name)"
 */
function parseSummary(summary: string): {
  roleRaw: string;
  role: RefereeRole;
  homeTeam: string;
  awayTeam: string;
  league: string;
  parsed: { role: boolean; teams: boolean; league: boolean };
} {
  const result = {
    roleRaw: '',
    role: 'unknown' as RefereeRole,
    homeTeam: '',
    awayTeam: '',
    league: '',
    parsed: { role: false, teams: false, league: false },
  };

  // Split by " | " to separate role from match info
  const pipeIndex = summary.indexOf(' | ');
  if (pipeIndex === -1) {
    // Try without spaces around pipe
    const altPipeIndex = summary.indexOf('|');
    if (altPipeIndex !== -1) {
      result.roleRaw = summary.slice(0, altPipeIndex).trim();
      result.role = parseRole(result.roleRaw);
      result.parsed.role = result.role !== 'unknown';
    }
    return result;
  }

  result.roleRaw = summary.slice(0, pipeIndex).trim();
  result.role = parseRole(result.roleRaw);
  result.parsed.role = result.role !== 'unknown';

  const matchInfo = summary.slice(pipeIndex + 3).trim();

  // Extract league from parentheses at the end using string operations
  // to avoid ReDoS vulnerability from regex backtracking
  let leagueStartIndex = -1;

  const lastCloseParen = matchInfo.lastIndexOf(')');
  if (lastCloseParen !== -1) {
    // Find matching open paren by scanning backwards
    const lastOpenParen = matchInfo.lastIndexOf('(', lastCloseParen);
    if (lastOpenParen !== -1 && lastOpenParen < lastCloseParen) {
      leagueStartIndex = lastOpenParen;
      result.league = matchInfo.slice(lastOpenParen + 1, lastCloseParen).trim();
      result.parsed.league = result.league.length > 0;
    }
  }

  // Extract teams (everything before the league parentheses)
  const teamsStr =
    leagueStartIndex !== -1
      ? matchInfo.slice(0, leagueStartIndex).trim()
      : matchInfo;

  // Split teams by " - "
  const teamSeparator = teamsStr.indexOf(' - ');
  if (teamSeparator !== -1) {
    result.homeTeam = teamsStr.slice(0, teamSeparator).trim();
    result.awayTeam = teamsStr.slice(teamSeparator + 3).trim();
    result.parsed.teams = result.homeTeam.length > 0 && result.awayTeam.length > 0;
  }

  return result;
}

/**
 * Parses the LOCATION field as a full address.
 *
 * In the real volleymanager API:
 * - LOCATION contains the full street address (e.g., "Landskronstrasse 41, 4147 Aesch, Suisse")
 * - Hall name comes from X-APPLE-STRUCTURED-LOCATION X-TITLE parameter (handled separately)
 *
 * This function optionally strips the country suffix (", Suisse") for cleaner display.
 */
function parseLocation(
  location: string | null,
  appleLocationTitle: string | null
): {
  hallName: string | null;
  address: string | null;
  parsed: { venue: boolean; address: boolean };
} {
  const result = {
    hallName: appleLocationTitle,
    address: null as string | null,
    parsed: { venue: appleLocationTitle !== null && appleLocationTitle.length > 0, address: false },
  };

  if (!location) return result;

  // Use the full location as the address
  // Strip country suffix for cleaner display (common in Swiss volleyball)
  // Handles both French "Suisse" and German "Schweiz"
  let address = location.trim();
  const countrySuffix = /, (?:Suisse|Schweiz)$/i;
  if (countrySuffix.test(address)) {
    address = address.replace(countrySuffix, '');
  }

  result.address = address;
  result.parsed.address = address.length > 0;

  return result;
}

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
  const warnings: string[] = [];
  const parsedFields: ParsedFields = {
    gameId: false,
    role: false,
    teams: false,
    league: false,
    venue: false,
    address: false,
    coordinates: false,
  };

  // Extract game ID from UID
  let gameId = '';
  const gameIdMatch = GAME_ID_PATTERN.exec(event.uid);
  if (gameIdMatch?.[1]) {
    gameId = gameIdMatch[1];
    parsedFields.gameId = true;
  } else {
    // Fallback: try to extract any numeric ID
    const numericMatch = NUMERIC_ID_PATTERN.exec(event.uid);
    if (numericMatch?.[1]) {
      gameId = numericMatch[1];
      parsedFields.gameId = true;
      warnings.push('Game ID extracted using fallback pattern');
    } else {
      warnings.push('Could not extract game ID from UID');
    }
  }

  // Parse SUMMARY for role, teams, and league
  const summaryData = parseSummary(event.summary);
  parsedFields.role = summaryData.parsed.role;
  parsedFields.teams = summaryData.parsed.teams;
  parsedFields.league = summaryData.parsed.league;

  if (!summaryData.parsed.role) {
    warnings.push(`Unknown role format: "${summaryData.roleRaw}"`);
  }
  if (!summaryData.parsed.teams) {
    warnings.push('Could not extract teams from summary');
  }
  if (!summaryData.parsed.league) {
    warnings.push('Could not extract league from summary');
  }

  // Extract hall ID and name from description
  const hallInfo = parseHallInfo(event.description);

  // Parse LOCATION for address, using appleLocationTitle for hall name
  // Priority for hall name: description-based > appleLocationTitle > null
  const locationData = parseLocation(
    event.location,
    hallInfo.hallName ?? event.appleLocationTitle
  );
  parsedFields.venue = locationData.parsed.venue;
  parsedFields.address = locationData.parsed.address;

  // Check for coordinates
  parsedFields.coordinates = event.geo !== null;

  // Determine gender from league and description
  const gender = parseGender(summaryData.league, event.description);

  // Extract league category from description
  const leagueCategory = parseLeagueCategory(event.description);

  // Extract referee names from description
  const referees = parseRefereeNames(event.description);

  // Extract game number from description
  const gameNumber = parseGameNumber(event.description);

  // Extract association from team info in description
  const association = parseAssociation(event.description);

  // Extract or build maps URL
  let mapsUrl: string | null = null;
  const mapsMatch = MAPS_URL_PATTERN.exec(event.description);
  if (mapsMatch) {
    mapsUrl = mapsMatch[0];
  } else {
    mapsUrl = buildMapsUrl(locationData.address, event.geo);
  }

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
  };

  const confidence = calculateConfidence(parsedFields);

  return {
    assignment,
    parsedFields,
    confidence,
    warnings,
  };
}

/**
 * Parses a complete iCal feed and returns all assignments with metadata.
 *
 * This is the main entry point for parsing an iCal feed into usable
 * assignment data for the application.
 *
 * @param icsContent - Raw iCal file content
 * @returns Array of ParseResult objects, one per event
 *
 * @example
 * ```typescript
 * const response = await fetch(icalUrl);
 * const icsContent = await response.text();
 * const results = parseCalendarFeed(icsContent);
 *
 * // Filter for high-confidence results only
 * const reliable = results.filter(r => r.confidence === 'high');
 * ```
 */
export function parseCalendarFeed(icsContent: string): ParseResult[] {
  const events = parseICalFeed(icsContent);
  return events.map(extractAssignment);
}
