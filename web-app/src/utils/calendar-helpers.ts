/**
 * Calendar URL/code extraction and validation utilities.
 *
 * Calendar URLs from VolleyManager follow these patterns:
 * - https://volleymanager.volleyball.ch/calendar/{6-char-code}
 * - https://volleymanager.volleyball.ch/indoor/iCal/referee/{6-char-code}
 * - webcal://volleymanager.volleyball.ch/calendar/{6-char-code}
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
  // https://volleymanager.volleyball.ch/indoor/iCal/referee/XXXXXX
  /^https?:\/\/(?:www\.)?volleymanager\.volleyball\.ch\/indoor\/iCal\/referee\/([a-z0-9]{6})\/?$/i,
  // webcal://volleymanager.volleyball.ch/indoor/iCal/referee/XXXXXX
  /^webcal:\/\/(?:www\.)?volleymanager\.volleyball\.ch\/indoor\/iCal\/referee\/([a-z0-9]{6})\/?$/i,
];

/**
 * Sanitizes input by removing invisible characters and normalizing whitespace.
 * iOS Safari can sometimes add invisible Unicode characters when copy-pasting.
 */
function sanitizeInput(input: string): string {
  return (
    input
      // Remove zero-width characters (common in iOS copy-paste)
      .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, "")
      // Remove other invisible formatting characters
      .replace(/[\u2060\u180E]/g, "")
      // Normalize whitespace
      .trim()
  );
}

/**
 * Extracts a 6-character calendar code from various input formats.
 *
 * Accepts:
 * - Full HTTPS URL (e.g., https://volleymanager.volleyball.ch/calendar/XXXXXX)
 * - webcal:// URL (e.g., webcal://volleymanager.volleyball.ch/calendar/XXXXXX)
 * - Just the 6-character code (e.g., XXXXXX)
 *
 * Handles iOS/Safari quirks:
 * - Removes invisible Unicode characters from copy-paste
 * - Handles URL-encoded characters
 * - Extracts code from URLs with query strings or fragments
 *
 * @param input - User input (URL or code)
 * @returns The extracted 6-character code, or null if invalid format
 */
export function extractCalendarCode(input: string): string | null {
  const sanitized = sanitizeInput(input);

  if (!sanitized) {
    return null;
  }

  // Check if it's already a valid 6-character code
  if (CALENDAR_CODE_PATTERN.test(sanitized)) {
    return sanitized;
  }

  // Try to extract from URL patterns (handles most cases)
  for (const pattern of CALENDAR_URL_PATTERNS) {
    const match = sanitized.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  // Fallback: Try to parse as URL and extract from path
  // This handles URLs with query strings, fragments, or unusual formatting
  try {
    // Handle webcal:// by converting to https:// for URL parsing
    const urlString = sanitized.replace(/^webcal:\/\//i, "https://");
    const url = new URL(urlString);

    // Check if it's a volleymanager URL
    if (!url.hostname.includes("volleymanager.volleyball.ch")) {
      return null;
    }

    // Try to extract the last path segment as the code
    const pathSegments = url.pathname.split("/").filter(Boolean);
    const lastSegment = pathSegments[pathSegments.length - 1];

    if (lastSegment && CALENDAR_CODE_PATTERN.test(lastSegment)) {
      // Verify the path looks like a calendar URL
      const pathLower = url.pathname.toLowerCase();
      if (
        pathLower.includes("/calendar/") ||
        pathLower.includes("/ical/") ||
        pathLower.includes("/referee/")
      ) {
        return lastSegment;
      }
    }
  } catch {
    // URL parsing failed, input is not a valid URL
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
  const calendarUrl = `${API_BASE}/iCal/referee/${code}`;

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
