/**
 * Calendar API for fetching assignments from public iCal feeds.
 *
 * This module provides functions to fetch and parse calendar data from
 * the volleymanager public iCal endpoint. It's used in Calendar Mode
 * as an alternative to the authenticated API.
 *
 * ## iCal Endpoint
 * The endpoint pattern is: `/iCal/referee/{code}`
 * where `code` is a 6-character alphanumeric calendar code.
 *
 * ## Error Handling
 * - 404: Calendar code not found (returns empty array or false)
 * - Network errors: Throws an error that should be handled by the caller
 */

import { parseCalendarFeed, type CalendarAssignment, type ParseResult } from './ical';
import { HttpStatus } from '@/shared/utils/constants';

// Re-export types for consumers
export type { CalendarAssignment, ParseResult } from './ical';

/** Base URL for API requests - uses proxy URL if set */
const API_BASE_URL = import.meta.env.VITE_API_PROXY_URL || '';

/** Calendar codes are exactly 6 alphanumeric characters */
const CALENDAR_CODE_PATTERN = /^[a-zA-Z0-9]{6}$/;

/**
 * Error thrown when the calendar code format is invalid.
 */
export class InvalidCalendarCodeError extends Error {
  constructor(code: string) {
    super(`Invalid calendar code format: "${code}". Must be 6 alphanumeric characters.`);
    this.name = 'InvalidCalendarCodeError';
  }
}

/**
 * Error thrown when the calendar code is not found (404).
 */
export class CalendarNotFoundError extends Error {
  constructor(code: string) {
    super(`Calendar not found for code: "${code}"`);
    this.name = 'CalendarNotFoundError';
  }
}

/**
 * Validates the format of a calendar code.
 *
 * @param code - The calendar code to validate
 * @throws InvalidCalendarCodeError if the format is invalid
 */
function validateCodeFormat(code: string): void {
  if (!CALENDAR_CODE_PATTERN.test(code)) {
    throw new InvalidCalendarCodeError(code);
  }
}

/**
 * Fetches calendar assignments for a given referee calendar code.
 *
 * This function:
 * 1. Fetches the iCal feed from the worker proxy
 * 2. Parses the iCal content using the parser module
 * 3. Converts to CalendarAssignment[] sorted by date (upcoming first)
 *
 * @param code - The 6-character calendar code
 * @param signal - Optional AbortSignal for request cancellation
 * @returns Array of calendar assignments sorted by start time (upcoming first)
 * @throws InvalidCalendarCodeError if code format is invalid
 * @throws CalendarNotFoundError if the calendar code is not found (404)
 * @throws Error on network or other errors
 *
 * @example
 * ```typescript
 * const assignments = await fetchCalendarAssignments('ABC123');
 * console.log(assignments[0].homeTeam); // "VBC Zürich"
 * ```
 */
export async function fetchCalendarAssignments(
  code: string,
  signal?: AbortSignal,
): Promise<CalendarAssignment[]> {
  validateCodeFormat(code);

  const url = `${API_BASE_URL}/iCal/referee/${code}`;

  const response = await fetch(url, {
    method: 'GET',
    signal,
    // No credentials needed - public endpoint
  });

  if (response.status === HttpStatus.NOT_FOUND) {
    throw new CalendarNotFoundError(code);
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch calendar: ${response.status} ${response.statusText}`);
  }

  const icsContent = await response.text();

  // Parse the iCal content
  const parseResults: ParseResult[] = parseCalendarFeed(icsContent);

  // Extract assignments, excluding low-confidence results
  const assignments: CalendarAssignment[] = parseResults
    .filter((result) => result.confidence !== 'low')
    .map((result) => result.assignment);

  // Sort by start time (upcoming first)
  return sortByStartTime(assignments);
}

/**
 * Sorts calendar assignments by start time (ascending - upcoming first).
 */
function sortByStartTime(assignments: CalendarAssignment[]): CalendarAssignment[] {
  return [...assignments].sort((a, b) => {
    const timeA = new Date(a.startTime).getTime();
    const timeB = new Date(b.startTime).getTime();
    return timeA - timeB;
  });
}

/**
 * Validates a calendar code by attempting to fetch the calendar.
 *
 * This function is used during login to verify that a calendar code
 * is valid before storing it.
 *
 * @param code - The 6-character calendar code to validate
 * @param signal - Optional AbortSignal for request cancellation
 * @returns true if the calendar exists (even if empty), false if not found (404)
 * @throws InvalidCalendarCodeError if code format is invalid
 * @throws Error on network errors (connection issues, timeouts, etc.)
 *
 * @example
 * ```typescript
 * try {
 *   const isValid = await validateCalendarCode('ABC123');
 *   if (isValid) {
 *     // Proceed with login
 *   } else {
 *     // Show "calendar not found" error
 *   }
 * } catch (error) {
 *   // Network error - show connectivity message
 * }
 * ```
 */
export async function validateCalendarCode(
  code: string,
  signal?: AbortSignal,
): Promise<boolean> {
  validateCodeFormat(code);

  const url = `${API_BASE_URL}/iCal/referee/${code}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal,
    });

    // 404 means the calendar code doesn't exist
    if (response.status === HttpStatus.NOT_FOUND) {
      return false;
    }

    // Any successful response means the calendar exists
    // (even if the content is empty or malformed)
    if (response.ok) {
      return true;
    }

    // Other error statuses - could be server errors, etc.
    // Treat as invalid to be safe
    return false;
  } catch (error) {
    // Re-throw AbortErrors (cancellation)
    if (error instanceof Error && error.name === 'AbortError') {
      throw error;
    }

    // Re-throw network errors - caller should handle these differently
    // from "not found" cases (e.g., show "check your connection" message)
    throw error;
  }
}
