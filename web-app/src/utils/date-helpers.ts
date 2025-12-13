/**
 * Date formatting utilities for VolleyKit.
 */

const DATE_TIME_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  weekday: "short",
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
} as const;

/**
 * Formats an ISO datetime string to a localized human-readable format.
 * Returns 'TBD' if the input is undefined or invalid.
 *
 * @param isoString - ISO 8601 datetime string
 * @returns Formatted date string or 'TBD'
 */
export function formatDateTime(isoString?: string): string {
  if (!isoString) return "TBD";
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "TBD";
    return date.toLocaleString(undefined, DATE_TIME_FORMAT_OPTIONS);
  } catch {
    return "TBD";
  }
}
