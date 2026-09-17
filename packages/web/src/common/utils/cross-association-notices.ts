/**
 * Pure helpers for cross-association game notice keys.
 *
 * A notice key encodes association, local game date and the today/tomorrow
 * relation, so each stage of the reminder can be dismissed independently
 * and stale dismissals can be pruned once the date has passed.
 */

/** Builds the dismissal key for a notice. */
export function buildNoticeKey(
  associationCode: string,
  gameDateKey: string,
  day: 'today' | 'tomorrow'
): string {
  return `${associationCode}:${gameDateKey}:${day}`
}

/** Extracts the local calendar date (yyyy-mm-dd) from an ISO date string. */
export function toLocalDateKey(isoDate: string): string {
  const date = new Date(isoDate)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}
