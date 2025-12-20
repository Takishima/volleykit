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

/**
 * Formats a birthday string as DD.MM.YY (Swiss format).
 * Returns empty string if the input is undefined, null, or invalid.
 *
 * @param birthday - ISO date string or date-like string
 * @returns Formatted date as DD.MM.YY or empty string
 */
export function formatDOB(birthday: string | null | undefined): string {
  if (!birthday) return "";
  const date = new Date(birthday);
  if (isNaN(date.getTime())) return "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);
  return `${day}.${month}.${year}`;
}
