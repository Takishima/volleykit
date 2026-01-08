/**
 * Player List Parser
 *
 * Parses OCR text output into structured player lists for both teams.
 * Supports both electronic (tab-separated) and manuscript (handwritten) scoresheets.
 *
 * Expected electronic OCR format:
 * Row 1: TeamA Name<tab>TeamB Name
 * Row 2: N.<tab>Name of the player<tab>N.<tab>Name of the player (headers)
 * Row 3+: Number<tab>LASTNAME FIRSTNAME<tab>License<tab>Number<tab>LASTNAME FIRSTNAME<tab>License
 * ...
 * LIBERO section: L1<tab>Number LASTNAME FIRSTNAME<tab>License<tab>L1<tab>Number LASTNAME FIRSTNAME<tab>License
 * OFFICIAL MEMBERS section: C<tab>Name<tab>C<tab>Name (coaches), AC<tab>Name<tab>AC<tab>Name (assistants)
 *
 * For manuscript scoresheets, use parseGameSheet with type: 'manuscript' option.
 */

import type { ScoresheetType } from './scoresheet-detector';
import { parseManuscriptSheet } from './manuscript-parser';
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

/** Minimum parts required for single-column player data */
const MIN_PARTS_SINGLE_COLUMN = 3;
/** Minimum parts required for two-column (both teams) player data */
const MIN_PARTS_TWO_COLUMN = 6;
/** Minimum parts for single-column official */
const MIN_PARTS_OFFICIAL_SINGLE = 2;
/** Minimum parts for two-column official */
const MIN_PARTS_OFFICIAL_TWO_COL = 4;

/** Index positions for libero entries in two-column tab-separated format */
const LIBERO_TWO_COL_A_MARKER_IDX = 0;
const LIBERO_TWO_COL_A_NAME_IDX = 1;
const LIBERO_TWO_COL_A_LICENSE_IDX = 2;
const LIBERO_TWO_COL_B_MARKER_IDX = 3;
const LIBERO_TWO_COL_B_NAME_IDX = 4;
const LIBERO_TWO_COL_B_LICENSE_IDX = 5;

/** Index positions for official entries */
const OFFICIAL_B_ROLE_IDX = 2;
const OFFICIAL_B_NAME_IDX = 3;
/** Maximum header rows to parse before assuming players section */
const MAX_HEADER_ROWS = 3;
/** Lookback limit for finding team names */
const TEAM_NAME_LOOKBACK = 3;
/** Minimum alphabetic length for team name detection */
const MIN_ALPHA_LENGTH = 3;
/** Maximum valid shirt number */
const MAX_SHIRT_NUMBER = 99;

// =============================================================================
// Name Parsing Utilities
// =============================================================================

/**
 * Normalize a name from OCR (UPPERCASE) to title case
 */
export function normalizeName(name: string): string {
  if (!name) {
    return '';
  }
  return name
    .toLowerCase()
    .split(/[\s-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/**
 * Parse a player name in "LASTNAME FIRSTNAME [MIDDLENAME]" format
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

  // First part is always last name, rest are first names
  const lastName = normalizeName(parts[0]!);
  const firstName = parts.slice(1).map(normalizeName).join(' ');
  const displayName = `${firstName} ${lastName}`;

  return { lastName, firstName, displayName };
}

/**
 * Parse an official name - format is "Firstname Lastname" (not reversed like players)
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

/**
 * Extract shirt number from libero marker field
 * Handles formats like "L 12", "L1 6", "L2 17"
 * The marker (L, L1, L2) indicates libero position, the number is the shirt number
 */
function parseLiberoMarker(marker: string): number | null {
  if (!marker || typeof marker !== 'string') {
    return null;
  }

  const trimmed = marker.trim();
  // Match libero marker (L, L1, L2, etc.) followed by optional space and number
  // e.g., "L 12" -> 12, "L1 6" -> 6, "L2 17" -> 17
  const match = /^L\d?\s+(\d{1,2})$/.exec(trimmed);

  if (match) {
    return parseInt(match[1]!, 10);
  }

  return null;
}

/**
 * Parse a libero entry which has format "Number LASTNAME FIRSTNAME"
 * Used for old-style format where number is in the name field
 * Uses a non-greedy match to avoid backtracking issues
 */
function parseLiberoEntry(entry: string): { number: number | null; name: string } {
  if (!entry || typeof entry !== 'string') {
    return { number: null, name: '' };
  }

  const trimmed = entry.trim();
  // Use non-greedy match and word boundary to avoid backtracking
  const match = /^(\d{1,2})\s+(\S[\s\S]*?)$/.exec(trimmed);

  if (match) {
    return {
      number: parseInt(match[1]!, 10),
      name: match[2]!.trim(),
    };
  }

  return { number: null, name: trimmed };
}

// =============================================================================
// Section Detection
// =============================================================================

function isOfficialsHeader(line: string): boolean {
  const upper = line.toUpperCase();
  return upper.includes('OFFICIAL MEMBERS') || upper.includes('ADMITTED ON THE BENCH');
}

function isSignaturesSection(line: string): boolean {
  const upper = line.toUpperCase();
  return upper.includes('SIGNATURES') || upper.includes('TEAM CAPTAIN');
}

function isLiberoSection(line: string, parts: string[]): boolean {
  return line.toUpperCase().includes('LIBERO') && parts.length <= 2;
}

/** Valid official roles */
const VALID_ROLES = new Set(['C', 'AC', 'AC2', 'AC3', 'AC4']);

function isOfficialRole(role: string): role is OfficialRole {
  return VALID_ROLES.has(role.toUpperCase().trim());
}

function isSectionHeader(line: string): boolean {
  const upper = line.toUpperCase();
  return upper.includes('LIBERO') || upper.includes('N.') || upper.includes('NAME OF THE PLAYER');
}

function hasNonNumericContent(parts: string[]): boolean {
  const alphaPattern = /[a-zA-Z]{3,}/;
  return parts.some((p) => alphaPattern.test(p));
}

// =============================================================================
// Player List Start Detection
// =============================================================================

interface PlayerListStart {
  startIndex: number;
  teamNamesIndex: number;
}

function findTeamNamesIndex(lines: string[], headerIndex: number): number {
  const minIndex = Math.max(0, headerIndex - TEAM_NAME_LOOKBACK);
  for (let j = headerIndex - 1; j >= minIndex; j--) {
    const line = lines[j];
    if (!line) continue;
    const parts = line.split('\t').filter((p) => p.trim().length > 0);
    if (parts.length >= 2 && hasNonNumericContent(parts)) {
      return j;
    }
  }
  return -1;
}

function isPlayerDataLine(line: string): boolean {
  const parts = line.split('\t');
  if (parts.length < MIN_PARTS_SINGLE_COLUMN) return false;

  const firstPart = parts[0]!.trim();
  if (!/^\d{1,2}$/.test(firstPart)) return false;

  const num = parseInt(firstPart, 10);
  if (num < 1 || num > MAX_SHIRT_NUMBER) return false;

  const secondPart = parts[1]!.trim();
  return /^[A-Z\s]+$/.test(secondPart) && secondPart.length > MIN_ALPHA_LENGTH;
}

function findPlayerListStart(lines: string[]): PlayerListStart {
  // Look for the header row with "N." and "Name of the player"
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const upperLine = line.toUpperCase();
    const isHeaderRow =
      upperLine.includes('NAME OF THE PLAYER') ||
      (upperLine.includes('N.') && upperLine.includes('NAME'));

    if (isHeaderRow) {
      return {
        startIndex: i + 1,
        teamNamesIndex: findTeamNamesIndex(lines, i),
      };
    }
  }

  // Fallback: look for lines that match player data pattern
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    if (isPlayerDataLine(line)) {
      return { startIndex: i, teamNamesIndex: i - 1 };
    }
  }

  return { startIndex: 0, teamNamesIndex: -1 };
}

// =============================================================================
// Team Name Extraction
// =============================================================================

function cleanTeamName(name: string): string {
  return name.replace(/^[AB]\s+/, '').trim();
}

function extractTeamNames(
  allLines: string[],
  teamNamesIndex: number,
): { teamAName: string; teamBName: string } {
  if (teamNamesIndex < 0 || teamNamesIndex >= allLines.length) {
    return { teamAName: '', teamBName: '' };
  }

  const teamNamesLine = allLines[teamNamesIndex];
  if (!teamNamesLine) {
    return { teamAName: '', teamBName: '' };
  }

  const nameParts = teamNamesLine
    .split('\t')
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (nameParts.length >= 2) {
    return {
      teamAName: cleanTeamName(nameParts[0]!),
      teamBName: cleanTeamName(nameParts[1]!),
    };
  }

  if (nameParts.length === 1) {
    return { teamAName: cleanTeamName(nameParts[0]!), teamBName: '' };
  }

  return { teamAName: '', teamBName: '' };
}

// =============================================================================
// Section Parsers
// =============================================================================

function parsePlayerFromParts(
  parts: string[],
  startIdx: number,
): ParsedPlayer | null {
  const numStr = parts[startIdx];
  const name = parts[startIdx + 1];
  const license = parts[startIdx + 2];

  if (!numStr || !name) return null;
  const num = parseInt(numStr, 10);
  if (isNaN(num)) return null;

  const parsed = parsePlayerName(name);
  return {
    shirtNumber: num,
    lastName: parsed.lastName,
    firstName: parsed.firstName,
    displayName: parsed.displayName,
    rawName: name,
    licenseStatus: license || '',
  };
}

/**
 * Parse libero from parts where marker contains the number
 * Format: [L1 <num>] [NAME] [LICENSE]
 * Falls back to old format where number is in the name field if marker parsing fails
 */
function parseLiberoFromParts(
  parts: string[],
  markerIdx: number,
  nameIdx: number,
  licenseIdx: number,
): ParsedPlayer | null {
  const markerStr = parts[markerIdx];
  const nameStr = parts[nameIdx];

  if (!markerStr || !nameStr) return null;

  // Extract shirt number from marker (e.g., "L1 7" -> 7)
  const shirtNumber = parseLiberoMarker(markerStr);

  // If marker doesn't contain number, try old format (number in name field)
  if (shirtNumber === null) {
    const entry = parseLiberoEntry(nameStr);
    if (entry.name) {
      const parsed = parsePlayerName(entry.name);
      return {
        shirtNumber: entry.number,
        lastName: parsed.lastName,
        firstName: parsed.firstName,
        displayName: parsed.displayName,
        rawName: entry.name,
        licenseStatus: parts[licenseIdx] || '',
      };
    }
    return null;
  }

  // New format: number in marker, name is just the name
  const parsed = parsePlayerName(nameStr);
  return {
    shirtNumber,
    lastName: parsed.lastName,
    firstName: parsed.firstName,
    displayName: parsed.displayName,
    rawName: nameStr,
    licenseStatus: parts[licenseIdx] || '',
  };
}

function parseOfficialFromParts(
  parts: string[],
  roleIdx: number,
  nameIdx: number,
): ParsedOfficial | null {
  const role = parts[roleIdx];
  const name = parts[nameIdx];

  if (!role || !isOfficialRole(role) || !name) return null;

  const parsed = parseOfficialName(name);
  return {
    role: role.toUpperCase() as OfficialRole,
    lastName: parsed.lastName,
    firstName: parsed.firstName,
    displayName: parsed.displayName,
    rawName: name,
  };
}

// =============================================================================
// Main Parser State Machine
// =============================================================================

type ParserSection = 'header' | 'players' | 'libero' | 'officials' | 'done';

interface ParserState {
  section: ParserSection;
  headerRowsParsed: number;
  teamA: ParsedTeam;
  teamB: ParsedTeam;
  /** Whether we've seen two-column player rows (6+ parts) */
  seenTwoColumnPlayers: boolean;
  /** Whether Team A's column has ended (single-column rows go to Team B) */
  teamAColumnEnded: boolean;
}

function processHeaderLine(
  parts: string[],
  line: string,
  state: ParserState,
): ParserSection {
  if (state.headerRowsParsed === 0 && !isSectionHeader(line)) {
    if (parts.length >= 2) {
      state.teamA.name = cleanTeamName(parts[0]!);
      state.teamB.name = cleanTeamName(parts[1]!);
    } else if (parts.length === 1) {
      state.teamA.name = cleanTeamName(parts[0]!);
    }
    state.headerRowsParsed++;
    return 'header';
  }

  if (isSectionHeader(line)) {
    return 'players';
  }

  state.headerRowsParsed++;
  return state.headerRowsParsed > MAX_HEADER_ROWS ? 'players' : 'header';
}

function processPlayersLine(parts: string[], state: ParserState): void {
  if (parts.length < MIN_PARTS_SINGLE_COLUMN) return;

  const isTwoColumnRow = parts.length >= MIN_PARTS_TWO_COLUMN;

  if (isTwoColumnRow) {
    // Two-column row: both teams have data
    state.seenTwoColumnPlayers = true;

    const playerA = parsePlayerFromParts(parts, 0);
    if (playerA) state.teamA.players.push(playerA);

    const playerB = parsePlayerFromParts(parts, MIN_PARTS_SINGLE_COLUMN);
    if (playerB) state.teamB.players.push(playerB);
  } else {
    // Single-column row: only one team has data
    // If we've already seen two-column rows, this is overflow for Team B
    // (Team A's column ended first, remaining players are Team B)
    const player = parsePlayerFromParts(parts, 0);
    if (player) {
      if (state.seenTwoColumnPlayers) {
        // Team A ended, overflow goes to Team B
        state.teamAColumnEnded = true;
        state.teamB.players.push(player);
      } else {
        // Haven't seen two-column yet, assume Team A
        state.teamA.players.push(player);
      }
    }
  }
}

function processLiberoLine(parts: string[], state: ParserState): void {
  if (parts.length < MIN_PARTS_SINGLE_COLUMN) return;

  const isTwoColumnRow = parts.length >= MIN_PARTS_TWO_COLUMN;

  if (isTwoColumnRow) {
    // Two-column libero row: both teams have libero data
    // Format: [L1 <num>] [NAME] [LICENSE] [L1 <num>] [NAME] [LICENSE]
    const liberoA = parseLiberoFromParts(
      parts,
      LIBERO_TWO_COL_A_MARKER_IDX,
      LIBERO_TWO_COL_A_NAME_IDX,
      LIBERO_TWO_COL_A_LICENSE_IDX,
    );
    if (liberoA) state.teamA.players.push(liberoA);

    const liberoB = parseLiberoFromParts(
      parts,
      LIBERO_TWO_COL_B_MARKER_IDX,
      LIBERO_TWO_COL_B_NAME_IDX,
      LIBERO_TWO_COL_B_LICENSE_IDX,
    );
    if (liberoB) state.teamB.players.push(liberoB);
  } else {
    // Single-column libero row
    // Format: [L1/L2 <num>] [NAME] [LICENSE]
    const libero = parseLiberoFromParts(parts, 0, 1, 2);
    if (libero) {
      // Single-column liberos go to Team B if we've seen the transition
      if (state.teamAColumnEnded || state.seenTwoColumnPlayers) {
        state.teamB.players.push(libero);
      } else {
        state.teamA.players.push(libero);
      }
    }
  }
}

function processOfficialsLine(parts: string[], state: ParserState): void {
  if (parts.length < MIN_PARTS_OFFICIAL_SINGLE) return;

  const isTwoColumnRow = parts.length >= MIN_PARTS_OFFICIAL_TWO_COL;

  if (isTwoColumnRow) {
    // Two-column officials row: both teams have official data
    const officialA = parseOfficialFromParts(parts, 0, 1);
    if (officialA) state.teamA.officials.push(officialA);

    const officialB = parseOfficialFromParts(parts, OFFICIAL_B_ROLE_IDX, OFFICIAL_B_NAME_IDX);
    if (officialB) state.teamB.officials.push(officialB);
  } else {
    // Single-column officials row
    const official = parseOfficialFromParts(parts, 0, 1);
    if (official) {
      // Single-column officials go to Team B if we've seen the transition
      if (state.teamAColumnEnded || state.seenTwoColumnPlayers) {
        state.teamB.officials.push(official);
      } else {
        state.teamA.officials.push(official);
      }
    }
  }
}

function processLine(line: string, state: ParserState): void {
  // Check for section transitions
  if (isSignaturesSection(line)) {
    state.section = 'done';
    return;
  }
  if (state.section === 'done') return;

  if (isOfficialsHeader(line)) {
    state.section = 'officials';
    return;
  }

  const parts = line.split('\t').map((p) => p.trim());

  if (isLiberoSection(line, parts)) {
    state.section = 'libero';
    return;
  }

  // Process based on current section
  switch (state.section) {
    case 'header':
      state.section = processHeaderLine(parts, line, state);
      break;
    case 'players':
      processPlayersLine(parts, state);
      break;
    case 'libero':
      processLiberoLine(parts, state);
      break;
    case 'officials':
      processOfficialsLine(parts, state);
      break;
  }
}

// =============================================================================
// Main Parser
// =============================================================================

/**
 * Parse the OCR text output into structured player lists
 */
export function parseGameSheet(ocrText: string): ParsedGameSheet {
  const warnings: string[] = [];
  const state: ParserState = {
    section: 'header',
    headerRowsParsed: 0,
    teamA: { name: '', players: [], officials: [] },
    teamB: { name: '', players: [], officials: [] },
    seenTwoColumnPlayers: false,
    teamAColumnEnded: false,
  };

  if (!ocrText || typeof ocrText !== 'string') {
    warnings.push('No OCR text provided');
    return { teamA: state.teamA, teamB: state.teamB, warnings };
  }

  // Split into lines and filter empty ones
  const allLines = ocrText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // Find where the player list section starts
  const { startIndex, teamNamesIndex } = findPlayerListStart(allLines);

  if (startIndex > 0) {
    warnings.push(`Skipped ${startIndex} lines of non-player data (score/set information)`);
  }

  // Extract team names from the identified line
  const { teamAName, teamBName } = extractTeamNames(allLines, teamNamesIndex);
  state.teamA.name = teamAName;
  state.teamB.name = teamBName;

  // Update initial section based on whether team names were found
  const teamNamesFound = teamAName.length > 0 || teamBName.length > 0;
  state.section = teamNamesFound ? 'players' : 'header';

  // Process lines from the player list start
  const lines = allLines.slice(startIndex);

  if (lines.length === 0) {
    warnings.push('OCR text contains no lines');
    return { teamA: state.teamA, teamB: state.teamB, warnings };
  }

  for (const line of lines) {
    processLine(line, state);
  }

  // Add warnings
  if (state.teamA.players.length === 0) {
    warnings.push('No players found for Team A');
  }
  if (state.teamB.players.length === 0) {
    warnings.push('No players found for Team B');
  }
  if (state.teamA.officials.length === 0 && state.teamB.officials.length === 0) {
    warnings.push('No officials (coaches) found - the OFFICIAL MEMBERS section may not have been recognized');
  }

  return { teamA: state.teamA, teamB: state.teamB, warnings };
}

// =============================================================================
// Utility Exports
// =============================================================================

/**
 * Get all players for a team
 */
export function getAllPlayers(team: ParsedTeam): ParsedPlayer[] {
  return team.players;
}

/**
 * Get all officials for a team
 */
export function getAllOfficials(team: ParsedTeam): ParsedOfficial[] {
  return team.officials;
}

// =============================================================================
// Parser Factory
// =============================================================================

/**
 * Options for parseGameSheet
 */
export interface ParseGameSheetOptions {
  /**
   * Type of scoresheet to parse
   * - 'electronic': Tab-separated format from printed/electronic scoresheets
   * - 'manuscript': Handwritten format with variable spacing
   * @default 'electronic'
   */
  type?: ScoresheetType;
}

/**
 * Parse a game sheet using the appropriate parser based on scoresheet type
 *
 * This is the main entry point for parsing OCR text. The type parameter
 * determines which parsing strategy to use:
 * - 'electronic' (default): Uses tab-separated column parsing
 * - 'manuscript': Uses pattern matching for handwritten text
 *
 * @param ocrText - Raw OCR text from scanning the scoresheet
 * @param options - Parser options including scoresheet type
 * @returns Parsed game sheet with both teams
 *
 * @example
 * ```typescript
 * // Parse electronic scoresheet (default)
 * const result = parseGameSheet(ocrText);
 *
 * // Parse manuscript scoresheet
 * const result = parseGameSheet(ocrText, { type: 'manuscript' });
 * ```
 */
export function parseGameSheetWithType(
  ocrText: string,
  options?: ParseGameSheetOptions,
): ParsedGameSheet {
  const type = options?.type ?? 'electronic';

  if (type === 'manuscript') {
    return parseManuscriptSheet(ocrText);
  }

  // Default to electronic parser (the existing parseGameSheet implementation)
  return parseElectronicSheet(ocrText);
}

/**
 * Parse electronic (tab-separated) scoresheet OCR text
 *
 * This is the original parseGameSheet function renamed for clarity.
 * For new code, prefer using parseGameSheetWithType with explicit type.
 *
 * @param ocrText - Raw OCR text from electronic scoresheet
 * @returns Parsed game sheet with both teams
 */
export const parseElectronicSheet = parseGameSheet;
