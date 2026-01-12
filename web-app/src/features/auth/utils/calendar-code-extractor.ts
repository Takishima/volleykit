/**
 * Calendar code extraction from VolleyManager HTML pages.
 *
 * The calendar code (6 alphanumeric characters) is embedded in the HTML of
 * the calendar settings page and other pages. It's used to construct the
 * public iCal URL: /iCal/referee/{code}
 *
 * This code is unique per referee (not per association), so it can be used
 * to fetch ALL assignments across ALL associations the referee belongs to.
 */

import { logger } from '@/shared/utils/logger'

/** Calendar codes are exactly 6 alphanumeric characters */
const CALENDAR_CODE_PATTERN = /^[a-zA-Z0-9]{6}$/

/**
 * Regex patterns to extract calendar code from HTML.
 *
 * The code appears in various formats:
 * - In iCal URLs: /iCal/referee/XXXXXX or /indoor/iCal/referee/XXXXXX
 * - In webcal:// links: webcal://volleymanager.volleyball.ch/iCal/referee/XXXXXX
 * - In Vue components as props or data
 */
const CALENDAR_URL_PATTERNS = [
  // Direct iCal path: /iCal/referee/XXXXXX or /indoor/iCal/referee/XXXXXX
  /\/i[Cc]al\/referee\/([a-zA-Z0-9]{6})(?:["'\s<]|$)/,
  // Full URL with domain: https://volleymanager.volleyball.ch/iCal/referee/XXXXXX
  /volleymanager\.volleyball\.ch\/(?:indoor\/)?i[Cc]al\/referee\/([a-zA-Z0-9]{6})/,
  // webcal:// protocol link
  /webcal:\/\/[^"'\s]*\/i[Cc]al\/referee\/([a-zA-Z0-9]{6})/,
  // In href attribute: href="...iCal/referee/XXXXXX..."
  /href=["'][^"']*\/i[Cc]al\/referee\/([a-zA-Z0-9]{6})[^"']*["']/,
  // Calendar/sportmanager paths
  /\/calendar\/(?:ical\/)?([a-zA-Z0-9]{6})(?:["'\s<]|$)/,
  /\/sportmanager\.volleyball\/calendar\/ical\/([a-zA-Z0-9]{6})/,
]

/**
 * Vue component patterns for calendar hash property.
 * The calendar settings page may have the hash in a Vue component prop.
 */
const VUE_HASH_PATTERNS = [
  // :ical-hash="..." or icalHash="..."
  /:?[iI][cC][aA][lL]-?[hH][aA][sS][hH]=["']([a-zA-Z0-9]{6})["']/,
  // :hash="..." prop (when in calendar context)
  /:hash=["']([a-zA-Z0-9]{6})["']/,
  // JSON property "iCalHash": "XXXXXX"
  /"i[Cc]al[Hh]ash"\s*:\s*["']([a-zA-Z0-9]{6})["']/,
  // JSON property "hash": "XXXXXX" (in calendar context)
  /"hash"\s*:\s*["']([a-zA-Z0-9]{6})["']/,
  // JSON property "calendarCode": "XXXXXX"
  /"calendar[Cc]ode"\s*:\s*["']([a-zA-Z0-9]{6})["']/,
  // JSON property "uniqueId": "XXXXXX" (in dashboard active party data)
  /"uniqueId"\s*:\s*\\?"([a-zA-Z0-9]{6})\\?"/,
  // HTML-encoded uniqueId: &quot;uniqueId&quot;:&quot;XXXXXX&quot;
  /&quot;uniqueId&quot;:&quot;([a-zA-Z0-9]{6})&quot;/,
]

/**
 * Extracts the calendar code from HTML content.
 *
 * Searches for calendar URLs and Vue component props that contain the
 * 6-character calendar code.
 *
 * @param html - The HTML content to search
 * @returns The 6-character calendar code, or null if not found
 */
export function extractCalendarCodeFromHtml(html: string): string | null {
  if (!html) {
    return null
  }

  // Try URL patterns first (most reliable)
  for (const pattern of CALENDAR_URL_PATTERNS) {
    const match = html.match(pattern)
    if (match?.[1] && CALENDAR_CODE_PATTERN.test(match[1])) {
      logger.info('Extracted calendar code from URL pattern')
      return match[1]
    }
  }

  // Try Vue component patterns
  for (const pattern of VUE_HASH_PATTERNS) {
    const match = html.match(pattern)
    if (match?.[1] && CALENDAR_CODE_PATTERN.test(match[1])) {
      logger.info('Extracted calendar code from Vue/JSON pattern')
      return match[1]
    }
  }

  return null
}

/**
 * Validates a calendar code format.
 *
 * @param code - The code to validate
 * @returns true if the code matches the expected format
 */
export function isValidCalendarCode(code: string): boolean {
  return CALENDAR_CODE_PATTERN.test(code)
}

/**
 * Constructs the iCal URL for a given calendar code.
 *
 * @param code - The 6-character calendar code
 * @param proxyUrl - Optional proxy URL prefix (defaults to env variable)
 * @returns The full iCal URL
 */
export function getCalendarUrl(code: string, proxyUrl?: string): string {
  const baseUrl = proxyUrl ?? import.meta.env.VITE_API_PROXY_URL ?? ''
  return `${baseUrl}/iCal/referee/${code}`
}
