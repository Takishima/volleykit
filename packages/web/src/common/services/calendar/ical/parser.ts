/**
 * iCal Parser for volleymanager.volleyball.ch calendar feeds
 *
 * This module provides functions to parse iCal (.ics) content from the
 * volleymanager public calendar feeds and extract assignment information.
 *
 * ## Architecture
 *
 * The parser is split into focused modules:
 * - `ical-tokenizer.ts` - RFC 5545 line unfolding, property extraction, VEVENT parsing
 * - `description-parsers.ts` - Multi-language field extraction from DESCRIPTION text
 * - `assignment-mapper.ts` - SUMMARY parsing, location processing, confidence calculation
 *
 * This file is the public API facade that re-exports all public functions.
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

import { extractAssignment } from './assignment-mapper'
import { parseICalFeed } from './ical-tokenizer'

import type { ICalEvent, ParseResult } from './types'

// Re-export from submodules for backward compatibility
export { parseICalFeed } from './ical-tokenizer'
export { extractAssignment } from './assignment-mapper'

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
  const events: ICalEvent[] = parseICalFeed(icsContent)
  return events.map(extractAssignment)
}
