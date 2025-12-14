/**
 * Formats a birthday date string for display.
 * Returns the date in a localized format, or empty string if invalid.
 */
export function formatBirthday(birthday: string | undefined | null): string {
  if (!birthday) return "";
  const date = new Date(birthday);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString();
}
