/**
 * iCal Parser Types
 *
 * Types for parsing volleymanager.volleyball.ch iCal feeds.
 *
 * Sample iCal event structure from volleymanager:
 * ```ics
 * BEGIN:VEVENT
 * UID:referee-convocation-for-game-392936
 * SUMMARY:ARB 1 | TV St. Johann 1 - VTV Horw 1 (Mobiliar Volley Cup)
 * DESCRIPTION:Role: ARB 1\nMatch ID: 392936\nDate: 15.02.2025\nTime: 14:00\n
 *   Teams: TV St. Johann 1 vs VTV Horw 1\nLeague: Mobiliar Volley Cup\n
 *   Hall: Sporthalle Sternenfeld\nAddress: Sternenfeldstrasse 50, 4127 Birsfelden\n
 *   Contact Home: Max Mustermann (+41 79 123 45 67)\n
 *   Contact Away: Anna Example (+41 78 987 65 43)
 * DTSTART:20250215T140000
 * DTEND:20250215T170000
 * LOCATION:Sporthalle Sternenfeld, Sternenfeldstrasse 50, 4127 Birsfelden
 * GEO:47.5584;7.6277
 * END:VEVENT
 * ```
 */

/**
 * Raw parsed iCal event data.
 * Represents the direct output from parsing an iCal VEVENT block.
 */
export interface ICalEvent {
  /** Unique identifier from the UID property (e.g., "referee-convocation-for-game-392936") */
  uid: string;

  /** Event summary/title from SUMMARY property */
  summary: string;

  /** Full description text from DESCRIPTION property (may contain escaped newlines) */
  description: string;

  /** Start date/time from DTSTART property (ISO 8601 format after parsing) */
  dtstart: string;

  /** End date/time from DTEND property (ISO 8601 format after parsing) */
  dtend: string;

  /** Location string from LOCATION property (contains full address in real API) */
  location: string | null;

  /** Hall/venue name extracted from X-APPLE-STRUCTURED-LOCATION X-TITLE parameter */
  appleLocationTitle: string | null;

  /** Geographic coordinates from GEO property */
  geo: {
    latitude: number;
    longitude: number;
  } | null;
}

/**
 * Gender category for a volleyball match.
 * Derived from league name patterns in the iCal data.
 */
export type Gender = 'men' | 'women' | 'mixed' | 'unknown';

/**
 * Referee role extracted from the assignment.
 * Based on patterns like "ARB 1", "ARB 2", "LR", etc.
 */
export type RefereeRole =
  | 'referee1' // First referee (ARB 1)
  | 'referee2' // Second referee (ARB 2)
  | 'lineReferee' // Line referee (LR)
  | 'scorer' // Scorer/Secretary
  | 'unknown';

/**
 * Parsed assignment data matching the app's requirements.
 * This is the normalized structure used throughout the application.
 */
export interface CalendarAssignment {
  /** Game ID extracted from UID (e.g., "392936" from "referee-convocation-for-game-392936") */
  gameId: string;

  /** Game number extracted from description (e.g., 382360 from "Match: #382360") */
  gameNumber: number | null;

  /** Referee role for this assignment */
  role: RefereeRole;

  /** Raw role string as it appears in the iCal (e.g., "ARB 1") for display purposes */
  roleRaw: string;

  /** Game start time as ISO 8601 string */
  startTime: string;

  /** Game end time as ISO 8601 string */
  endTime: string;

  /** Home team name */
  homeTeam: string;

  /** Away team name */
  awayTeam: string;

  /** League/competition name (e.g., "Mobiliar Volley Cup", "NLA Herren") */
  league: string;

  /** League category (e.g., "3L", "NLA", "2L") extracted from description */
  leagueCategory: string | null;

  /** Full address of the venue */
  address: string | null;

  /** Geographic coordinates of the venue */
  coordinates: {
    latitude: number;
    longitude: number;
  } | null;

  /** Name of the sports hall/venue */
  hallName: string | null;

  /** Hall ID extracted from description (e.g., "3661" from "Salle: #3661 | ...") */
  hallId: string | null;

  /** Gender category derived from ♀/♂ symbols in description */
  gender: Gender;

  /** Google Maps URL for the venue (constructed from address or coordinates) */
  mapsUrl: string | null;

  /** Referee names extracted from description */
  referees: {
    referee1?: string;
    referee2?: string;
    lineReferee1?: string;
    lineReferee2?: string;
  };
}

/**
 * Indicates which fields were successfully parsed from the iCal event.
 * Used to track parsing confidence and identify incomplete data.
 */
export interface ParsedFields {
  /** Whether gameId was extracted successfully */
  gameId: boolean;

  /** Whether role was extracted successfully */
  role: boolean;

  /** Whether teams were extracted successfully */
  teams: boolean;

  /** Whether league was extracted successfully */
  league: boolean;

  /** Whether hall/venue info was extracted successfully */
  venue: boolean;

  /** Whether address was extracted successfully */
  address: boolean;

  /** Whether coordinates were available */
  coordinates: boolean;
}

/**
 * Confidence level for parsed data.
 * - 'high': All critical fields parsed successfully
 * - 'medium': Core fields parsed, some optional fields missing
 * - 'low': Minimal data extracted, may be unreliable
 */
export type ParseConfidence = 'high' | 'medium' | 'low';

/**
 * Result of parsing an iCal event into a CalendarAssignment.
 * Includes the parsed data along with metadata about parsing quality.
 */
export interface ParseResult {
  /** The parsed assignment data */
  assignment: CalendarAssignment;

  /** Which fields were successfully parsed */
  parsedFields: ParsedFields;

  /** Overall confidence level of the parsing */
  confidence: ParseConfidence;

  /** Any warnings or issues encountered during parsing */
  warnings: string[];
}
