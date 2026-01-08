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
 */

import type {
  ParsedPlayer,
  ParsedOfficial,
  ParsedTeam,
  ParsedGameSheet,
  OfficialRole,
} from '../types';

// =============================================================================
// Constants
// =============================================================================

/** Maximum valid shirt number */
const MAX_SHIRT_NUMBER = 99;

/** Minimum name length to consider valid */
const MIN_NAME_LENGTH = 2;

/** Minimum length for team name text */
const MIN_TEAM_NAME_LENGTH = 3;

/** Minimum ratio of letters in team name */
const MIN_LETTER_RATIO = 0.6;

/** Valid official roles */
const VALID_ROLES = new Set(['C', 'AC', 'AC2', 'AC3', 'AC4']);

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
};

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
};

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
    .join('');
}

/**
 * Correct common OCR errors in a letter string
 */
export function correctLetters(text: string): string {
  return text
    .split('')
    .map((char) => LETTER_CORRECTIONS[char] ?? char)
    .join('');
}

/**
 * Try to extract a valid shirt number from a string
 * Applies OCR corrections and validates the result
 */
export function extractShirtNumber(text: string): number | null {
  if (!text) return null;

  // Clean and correct the text
  const cleaned = text.trim();
  const corrected = correctDigits(cleaned);

  // Try to parse as number
  const match = /^(\d{1,2})$/.exec(corrected);
  if (match) {
    const num = parseInt(match[1]!, 10);
    if (num >= 1 && num <= MAX_SHIRT_NUMBER) {
      return num;
    }
  }

  return null;
}

// =============================================================================
// Name Parsing Utilities
// =============================================================================

/**
 * Normalize a name from OCR - handles various case formats
 */
export function normalizeName(name: string): string {
  if (!name) return '';

  // Apply letter corrections
  const corrected = correctLetters(name);

  // Normalize to title case
  return corrected
    .toLowerCase()
    .split(/[\s-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/**
 * Parse a player name - tries both LASTNAME FIRSTNAME and FIRSTNAME LASTNAME formats
 */
export function parsePlayerName(rawName: string): {
  lastName: string;
  firstName: string;
  displayName: string;
} {
  if (!rawName || typeof rawName !== 'string') {
    return { lastName: '', firstName: '', displayName: '' };
  }

  const trimmed = rawName.trim();
  const parts = trimmed.split(/\s+/).filter((p) => p.length > 0);

  if (parts.length === 0) {
    return { lastName: '', firstName: '', displayName: '' };
  }

  if (parts.length === 1) {
    const lastName = normalizeName(parts[0]!);
    return { lastName, firstName: '', displayName: lastName };
  }

  // For manuscript, assume LASTNAME FIRSTNAME format (same as electronic)
  // The first part is the last name, rest are first names
  const lastName = normalizeName(parts[0]!);
  const firstName = parts.slice(1).map(normalizeName).join(' ');
  const displayName = `${firstName} ${lastName}`;

  return { lastName, firstName, displayName };
}

/**
 * Parse an official name - format is typically "Firstname Lastname"
 */
export function parseOfficialName(rawName: string): {
  lastName: string;
  firstName: string;
  displayName: string;
} {
  if (!rawName || typeof rawName !== 'string') {
    return { lastName: '', firstName: '', displayName: '' };
  }

  const trimmed = rawName.trim();
  const parts = trimmed.split(/\s+/).filter((p) => p.length > 0);

  if (parts.length === 0) {
    return { lastName: '', firstName: '', displayName: '' };
  }

  if (parts.length === 1) {
    const name = normalizeName(parts[0]!);
    return { lastName: name, firstName: '', displayName: name };
  }

  // For officials, format is "Firstname Lastname" - last part is last name
  const lastName = normalizeName(parts[parts.length - 1]!);
  const firstName = parts.slice(0, -1).map(normalizeName).join(' ');
  const displayName = `${firstName} ${lastName}`;

  return { lastName, firstName, displayName };
}

// =============================================================================
// Line Pattern Detection
// =============================================================================

/**
 * Pattern for detecting a player line in manuscript format
 * Matches: number followed by name, with various separators
 */
const PLAYER_LINE_PATTERN = /^(\d{1,2})[\s.:_-]+([A-Za-zÀ-ÿ\s]+)/;

/**
 * Pattern for detecting a player line with OCR errors
 * More lenient - allows OCR-misread digits
 */
const PLAYER_LINE_LENIENT = /^([0-9OoIlZzSsGgBb]{1,2})[\s.:_-]+([A-Za-zÀ-ÿ\s]+)/;

/**
 * Pattern for detecting an official line
 * Matches: C/AC/AC2/AC3/AC4 followed by name
 */
const OFFICIAL_LINE_PATTERN = /^(C|AC\d?)[\s.:_-]+([A-Za-zÀ-ÿ\s]+)/i;

/**
 * Check if a line contains team section marker
 */
function isTeamSectionMarker(line: string): boolean {
  const upper = line.toUpperCase();
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
  );
}

/**
 * Check if a line indicates the libero section
 */
function isLiberoMarker(line: string): boolean {
  return line.toUpperCase().includes('LIBERO');
}

/**
 * Check if a line indicates the officials section
 */
function isOfficialsMarker(line: string): boolean {
  const upper = line.toUpperCase();
  return upper.includes('OFFICIAL') || upper.includes('COACH') || upper.includes('TRAINER');
}

/**
 * Check if a line indicates end of player data
 */
function isEndMarker(line: string): boolean {
  const upper = line.toUpperCase();
  return (
    upper.includes('SIGNATURE') ||
    upper.includes('CAPTAIN') ||
    upper.includes('REFEREE') ||
    upper.includes('ARBITRE')
  );
}

/**
 * Try to extract a player from a line
 */
function tryExtractPlayer(line: string): ParsedPlayer | null {
  // Try strict pattern first
  let match = PLAYER_LINE_PATTERN.exec(line);
  if (!match) {
    // Try lenient pattern with OCR correction
    match = PLAYER_LINE_LENIENT.exec(line);
  }

  if (!match) return null;

  const numberStr = match[1]!;
  const nameStr = match[2]!.trim();

  // Extract and validate shirt number
  const shirtNumber = extractShirtNumber(numberStr);

  // Validate name length
  if (nameStr.length < MIN_NAME_LENGTH) return null;

  const parsed = parsePlayerName(nameStr);

  return {
    shirtNumber,
    lastName: parsed.lastName,
    firstName: parsed.firstName,
    displayName: parsed.displayName,
    rawName: nameStr,
    licenseStatus: '', // Not typically visible in manuscript
  };
}

/**
 * Try to extract an official from a line
 */
function tryExtractOfficial(line: string): ParsedOfficial | null {
  const match = OFFICIAL_LINE_PATTERN.exec(line);
  if (!match) return null;

  const roleStr = match[1]!.toUpperCase();
  const nameStr = match[2]!.trim();

  // Validate role
  if (!VALID_ROLES.has(roleStr)) return null;

  // Validate name length
  if (nameStr.length < MIN_NAME_LENGTH) return null;

  const parsed = parseOfficialName(nameStr);

  return {
    role: roleStr as OfficialRole,
    lastName: parsed.lastName,
    firstName: parsed.firstName,
    displayName: parsed.displayName,
    rawName: nameStr,
  };
}

// =============================================================================
// Team Detection and Splitting
// =============================================================================

/**
 * Try to extract team name from a line
 */
function extractTeamName(line: string): string | null {
  const trimmed = line.trim();

  // Skip empty lines
  if (trimmed.length < MIN_TEAM_NAME_LENGTH) return null;

  // Skip lines that look like player data
  if (PLAYER_LINE_PATTERN.test(trimmed)) return null;
  if (PLAYER_LINE_LENIENT.test(trimmed)) return null;

  // Skip section markers
  if (isLiberoMarker(trimmed)) return null;
  if (isOfficialsMarker(trimmed)) return null;
  if (isEndMarker(trimmed)) return null;

  // Check if it looks like a team name (mostly letters, maybe some spaces/hyphens)
  const letterCount = (trimmed.match(/[A-Za-zÀ-ÿ]/g) ?? []).length;
  if (letterCount >= MIN_TEAM_NAME_LENGTH && letterCount / trimmed.length > MIN_LETTER_RATIO) {
    return trimmed;
  }

  return null;
}

/**
 * Split text into sections for two teams
 * Manuscript sheets may have teams in different arrangements
 */
interface TeamSections {
  teamALines: string[];
  teamBLines: string[];
  teamAName: string;
  teamBName: string;
}

/** Patterns for Team A markers */
const TEAM_A_MARKERS = ['TEAM A', 'ÉQUIPE A', 'MANNSCHAFT A', 'HOME', 'HEIM'];
/** Patterns for Team B markers */
const TEAM_B_MARKERS = ['TEAM B', 'ÉQUIPE B', 'MANNSCHAFT B', 'AWAY', 'GAST'];
/** Regex to strip Team A markers from a line */
const TEAM_A_STRIP_PATTERN = /TEAM\s*A|ÉQUIPE\s*A|MANNSCHAFT\s*A|HOME|HEIM/i;
/** Regex to strip Team B markers from a line */
const TEAM_B_STRIP_PATTERN = /TEAM\s*B|ÉQUIPE\s*B|MANNSCHAFT\s*B|AWAY|GAST/i;

/**
 * Check if line matches Team A markers
 */
function isTeamAMarker(upperLine: string): boolean {
  return TEAM_A_MARKERS.some((marker) => upperLine.includes(marker));
}

/**
 * Check if line matches Team B markers
 */
function isTeamBMarker(upperLine: string): boolean {
  return TEAM_B_MARKERS.some((marker) => upperLine.includes(marker));
}

/**
 * Extract team name from a marker line
 */
function extractNameFromMarker(line: string, stripPattern: RegExp): string {
  const cleaned = line.replace(stripPattern, '').trim();
  return extractTeamName(cleaned) ?? '';
}

/**
 * Process a line that is a team section marker
 */
function processTeamMarker(
  trimmed: string,
  result: TeamSections,
): { team: 'A' | 'B'; isTeamA: boolean } | null {
  const upper = trimmed.toUpperCase();

  if (isTeamAMarker(upper)) {
    const name = extractNameFromMarker(trimmed, TEAM_A_STRIP_PATTERN);
    if (name) result.teamAName = name;
    return { team: 'A', isTeamA: true };
  }

  if (isTeamBMarker(upper)) {
    const name = extractNameFromMarker(trimmed, TEAM_B_STRIP_PATTERN);
    if (name) result.teamBName = name;
    return { team: 'B', isTeamA: false };
  }

  return null;
}

function splitIntoTeamSections(lines: string[]): TeamSections {
  const result: TeamSections = {
    teamALines: [],
    teamBLines: [],
    teamAName: '',
    teamBName: '',
  };

  let currentTeam: 'A' | 'B' | null = null;
  let teamASectionFound = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check for team section markers
    if (isTeamSectionMarker(trimmed)) {
      const markerResult = processTeamMarker(trimmed, result);
      if (markerResult) {
        currentTeam = markerResult.team;
        if (markerResult.isTeamA) teamASectionFound = true;
        continue;
      }
    }

    // If we haven't found explicit team sections, try to detect team name
    if (!teamASectionFound && !result.teamAName) {
      const teamName = extractTeamName(trimmed);
      if (teamName) {
        result.teamAName = teamName;
        currentTeam = 'A';
        continue;
      }
    }

    // Default to team A if no team is set
    if (currentTeam === null) {
      currentTeam = 'A';
    }

    // Add line to current team
    if (currentTeam === 'A') {
      result.teamALines.push(trimmed);
    } else {
      result.teamBLines.push(trimmed);
    }
  }

  return result;
}

// =============================================================================
// Team Parser
// =============================================================================

/**
 * Parse a team's lines into players and officials
 */
function parseTeamLines(
  lines: string[],
  teamName: string,
): { team: ParsedTeam; warnings: string[] } {
  const team: ParsedTeam = {
    name: teamName,
    players: [],
    officials: [],
  };
  const warnings: string[] = [];

  let inOfficialsSection = false;

  for (const line of lines) {
    // Check for section transitions
    if (isOfficialsMarker(line)) {
      inOfficialsSection = true;
      continue;
    }
    if (isEndMarker(line)) {
      break;
    }

    // Skip libero markers
    if (isLiberoMarker(line)) {
      continue;
    }

    if (inOfficialsSection) {
      const official = tryExtractOfficial(line);
      if (official) {
        team.officials.push(official);
      }
    } else {
      // Try to extract player
      const player = tryExtractPlayer(line);
      if (player) {
        team.players.push(player);
        continue;
      }

      // If not a player, try official (might be inline with players)
      const official = tryExtractOfficial(line);
      if (official) {
        team.officials.push(official);
      }
    }
  }

  return { team, warnings };
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
  const warnings: string[] = [];

  const emptyTeam: ParsedTeam = { name: '', players: [], officials: [] };

  if (!ocrText || typeof ocrText !== 'string') {
    warnings.push('No OCR text provided');
    return { teamA: { ...emptyTeam }, teamB: { ...emptyTeam }, warnings };
  }

  // Split into lines and filter empty
  const lines = ocrText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    warnings.push('OCR text contains no lines');
    return { teamA: { ...emptyTeam }, teamB: { ...emptyTeam }, warnings };
  }

  // Try to split into team sections
  const sections = splitIntoTeamSections(lines);

  // Parse each team
  const teamAResult = parseTeamLines(sections.teamALines, sections.teamAName);
  const teamBResult = parseTeamLines(sections.teamBLines, sections.teamBName);

  // Collect warnings
  warnings.push(...teamAResult.warnings);
  warnings.push(...teamBResult.warnings);

  if (teamAResult.team.players.length === 0) {
    warnings.push('No players found for Team A');
  }
  if (teamBResult.team.players.length === 0 && sections.teamBLines.length > 0) {
    warnings.push('No players found for Team B');
  }

  return {
    teamA: teamAResult.team,
    teamB: teamBResult.team,
    warnings,
  };
}
