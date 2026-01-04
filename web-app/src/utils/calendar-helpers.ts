/**
 * Calendar URL/code extraction and validation utilities.
 *
 * Calendar URLs from VolleyManager follow this pattern:
 * https://volleymanager.volleyball.ch/calendar/{6-char-code}
 * webcal://volleymanager.volleyball.ch/calendar/{6-char-code}
 *
 * Users can provide:
 * - Full HTTPS URL
 * - webcal:// URL
 * - Just the 6-character code
 */

/** Calendar codes are exactly 6 alphanumeric characters */
const CALENDAR_CODE_PATTERN = /^[a-zA-Z0-9]{6}$/;

/** Known VolleyManager calendar URL patterns */
const CALENDAR_URL_PATTERNS = [
  // https://volleymanager.volleyball.ch/calendar/XXXXXX
  /^https?:\/\/(?:www\.)?volleymanager\.volleyball\.ch\/calendar\/([a-z0-9]{6})\/?$/i,
  // webcal://volleymanager.volleyball.ch/calendar/XXXXXX
  /^webcal:\/\/(?:www\.)?volleymanager\.volleyball\.ch\/calendar\/([a-z0-9]{6})\/?$/i,
  // https://volleymanager.volleyball.ch/sportmanager.volleyball/calendar/ical/XXXXXX
  /^https?:\/\/(?:www\.)?volleymanager\.volleyball\.ch\/sportmanager\.volleyball\/calendar\/ical\/([a-z0-9]{6})\/?$/i,
  // webcal://volleymanager.volleyball.ch/sportmanager.volleyball/calendar/ical/XXXXXX
  /^webcal:\/\/(?:www\.)?volleymanager\.volleyball\.ch\/sportmanager\.volleyball\/calendar\/ical\/([a-z0-9]{6})\/?$/i,
];

/**
 * Extracts a 6-character calendar code from various input formats.
 *
 * Accepts:
 * - Full HTTPS URL (e.g., https://volleymanager.volleyball.ch/calendar/XXXXXX)
 * - webcal:// URL (e.g., webcal://volleymanager.volleyball.ch/calendar/XXXXXX)
 * - Just the 6-character code (e.g., XXXXXX)
 *
 * @param input - User input (URL or code)
 * @returns The extracted 6-character code, or null if invalid format
 */
export function extractCalendarCode(input: string): string | null {
  const trimmed = input.trim();

  if (!trimmed) {
    return null;
  }

  // Check if it's already a valid 6-character code
  if (CALENDAR_CODE_PATTERN.test(trimmed)) {
    return trimmed;
  }

  // Try to extract from URL patterns
  for (const pattern of CALENDAR_URL_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Result of calendar code validation.
 */
export interface CalendarValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates a calendar code by attempting to fetch the calendar feed.
 *
 * This makes an actual API call to verify the calendar exists and is accessible.
 *
 * @param code - 6-character calendar code
 * @param signal - Optional AbortSignal for cancellation
 * @returns Validation result with success/error status
 */
export async function validateCalendarCode(
  code: string,
  signal?: AbortSignal,
): Promise<CalendarValidationResult> {
  // Basic format validation first
  if (!CALENDAR_CODE_PATTERN.test(code)) {
    return { valid: false, error: "auth.invalidCalendarCode" };
  }

  const API_BASE = import.meta.env.VITE_API_PROXY_URL || "";
  const calendarUrl = `${API_BASE}/sportmanager.volleyball/calendar/ical/${code}`;

  try {
    const response = await fetch(calendarUrl, {
      method: "HEAD",
      signal,
    });

    if (response.ok) {
      return { valid: true };
    }

    if (response.status === 404) {
      return { valid: false, error: "auth.calendarNotFound" };
    }

    return { valid: false, error: "auth.calendarValidationFailed" };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }
    return { valid: false, error: "auth.calendarValidationFailed" };
  }
}
