/**
 * Date formatting utilities for mobile app.
 */

/**
 * Locale mapping from i18n language codes to locale identifiers.
 */
const LOCALE_MAP: Record<string, string> = {
  de: 'de-CH',
  en: 'en-GB',
  fr: 'fr-CH',
  it: 'it-CH',
}

/**
 * Format an ISO date string to a localized display format.
 *
 * @param isoDate - ISO date string or null/undefined
 * @param locale - i18n locale code (de, en, fr, it)
 * @returns Formatted date string or empty string if no date
 */
export function formatDate(isoDate: string | null | undefined, locale: string = 'de'): string {
  if (!isoDate) return ''
  const date = new Date(isoDate)
  const localeId = LOCALE_MAP[locale] ?? LOCALE_MAP['de']
  return date.toLocaleDateString(localeId, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/**
 * Format an ISO date string to a localized date and time format.
 *
 * @param isoDate - ISO date string or null/undefined
 * @param locale - i18n locale code (de, en, fr, it)
 * @returns Formatted date and time string or empty string if no date
 */
export function formatDateTime(isoDate: string | null | undefined, locale: string = 'de'): string {
  if (!isoDate) return ''
  const date = new Date(isoDate)
  const localeId = LOCALE_MAP[locale] ?? LOCALE_MAP['de']
  return date.toLocaleString(localeId, {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
