/**
 * iCal Parser Module
 *
 * Provides parsing functionality for volleymanager.volleyball.ch iCal feeds.
 * This module enables Calendar Mode, which uses public iCal feeds as an
 * alternative to the authenticated API.
 *
 * @example
 * ```typescript
 * import { parseCalendarFeed, type CalendarAssignment } from '@/features/assignments/api/ical';
 *
 * const response = await fetch(icalUrl);
 * const icsContent = await response.text();
 * const results = parseCalendarFeed(icsContent);
 *
 * const assignments: CalendarAssignment[] = results
 *   .filter(r => r.confidence !== 'low')
 *   .map(r => r.assignment);
 * ```
 *
 * @module features/assignments/api/ical
 */

// Types
export type {
  ICalEvent,
  CalendarAssignment,
  Gender,
  RefereeRole,
  ParsedFields,
  ParseConfidence,
  ParseResult,
} from './types';

// Parser functions
export {
  parseICalFeed,
  extractAssignment,
  parseCalendarFeed,
} from './parser';
