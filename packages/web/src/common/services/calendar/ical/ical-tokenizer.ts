/**
 * iCal Tokenizer - Low-level iCal parsing utilities
 *
 * Handles RFC 5545 compliant parsing of iCal content:
 * - Line unfolding (continuation lines)
 * - Text unescaping
 * - Property extraction from VEVENT blocks
 * - Date parsing
 * - VEVENT extraction into ICalEvent objects
 */

import { decode as decodePlusCode } from 'pluscodes'

import { extractPlusCodeFromDescription } from './description-parsers'

import type { ICalEvent } from './types'

/**
 * Unfolds multi-line iCal content according to RFC 5545.
 * Lines starting with a space or tab are continuations of the previous line.
 */
export function unfoldLines(content: string): string {
  // Normalize line endings to \r\n (iCal standard)
  const normalized = content.replace(/\r?\n/g, '\r\n')
  // Unfold continuation lines (lines starting with space or tab)
  return normalized.replace(/\r\n[ \t]/g, '')
}

/**
 * Unescapes iCal text values.
 * Handles: \n -> newline, \, -> comma, \\ -> backslash, \; -> semicolon
 *
 * Uses a placeholder approach to prevent double-unescaping vulnerabilities.
 * For example, "\\n" (escaped backslash + n) should become "\n" (backslash + n),
 * not a newline character.
 */
export function unescapeText(text: string): string {
  // Use null character as placeholder for escaped backslashes
  const BACKSLASH_PLACEHOLDER = '\x00'

  return (
    text
      // First, replace escaped backslashes with placeholder to prevent double-unescaping
      .replace(/\\\\/g, BACKSLASH_PLACEHOLDER)
      // Then unescape other sequences
      .replace(/\\n/g, '\n')
      .replace(/\\,/g, ',')
      .replace(/\\;/g, ';')
      // Finally, convert placeholder back to single backslash
      .replaceAll(BACKSLASH_PLACEHOLDER, '\\')
  )
}

/**
 * Extracts a property value from an iCal event block.
 * Handles property parameters (e.g., DTSTART;TZID=...:value)
 */
export function extractProperty(eventBlock: string, propertyName: string): string | null {
  // Split into lines and find the property line
  const lines = eventBlock.split(/\r?\n/)
  const upperPropName = propertyName.toUpperCase()

  for (const line of lines) {
    const upperLine = line.toUpperCase()
    // Check if line starts with property name followed by : or ;
    if (upperLine.startsWith(`${upperPropName}:`) || upperLine.startsWith(`${upperPropName};`)) {
      // Find the colon that separates parameters from value
      const colonIndex = line.indexOf(':')
      if (colonIndex === -1) continue

      const value = line.slice(colonIndex + 1)
      return unescapeText(value.trim())
    }
  }

  return null
}

/**
 * Extracts X-TITLE from X-APPLE-STRUCTURED-LOCATION property.
 * Format: X-APPLE-STRUCTURED-LOCATION;...;X-TITLE=Hall Name:lat;lon
 */
export function extractAppleLocationTitle(eventBlock: string): string | null {
  const lines = eventBlock.split(/\r?\n/)

  for (const line of lines) {
    const upperLine = line.toUpperCase()
    if (upperLine.startsWith('X-APPLE-STRUCTURED-LOCATION')) {
      // Extract X-TITLE parameter value
      // Format: X-TITLE=Hall Name (may contain escaped characters)
      const titleMatch = line.match(/X-TITLE=([^:;]+)/i)
      if (titleMatch?.[1]) {
        return unescapeText(titleMatch[1].trim())
      }
    }
  }

  return null
}

/**
 * Converts an iCal date string to ISO 8601 format.
 * Handles formats:
 * - YYYYMMDDTHHMMSS (local time)
 * - YYYYMMDDTHHMMSSZ (UTC)
 * - YYYYMMDD (date only)
 */
export function parseICalDate(icalDate: string): string {
  // Remove any parameters (e.g., TZID)
  const dateStr = icalDate.includes(':') ? icalDate.split(':').pop()! : icalDate

  // Handle date-only format (YYYYMMDD)
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers -- iCal date format positions
  if (dateStr.length === 8) {
    /* eslint-disable @typescript-eslint/no-magic-numbers -- iCal date format: YYYY (0-4), MM (4-6), DD (6-8) */
    const year = dateStr.slice(0, 4)
    const month = dateStr.slice(4, 6)
    const day = dateStr.slice(6, 8)
    /* eslint-enable @typescript-eslint/no-magic-numbers */
    return `${year}-${month}-${day}`
  }

  // Handle datetime format (YYYYMMDDTHHMMSS or YYYYMMDDTHHMMSSZ)
  const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/.exec(dateStr)
  if (match) {
    const [, year, month, day, hour, minute, second, utc] = match
    const iso = `${year}-${month}-${day}T${hour}:${minute}:${second}`
    return utc ? `${iso}Z` : iso
  }

  // Return as-is if format is unrecognized
  return icalDate
}

/**
 * Parses raw iCal (.ics) content into an array of ICalEvent objects.
 *
 * This function handles:
 * - Multi-line field unfolding (lines starting with space/tab are continuations)
 * - Escaped characters in text fields (\n, \,, \\, etc.)
 * - Extraction of standard VEVENT properties
 *
 * @param icsContent - Raw iCal file content as a string
 * @returns Array of parsed ICalEvent objects
 *
 * @example
 * ```typescript
 * const events = parseICalFeed(icsFileContent);
 * console.log(events[0].uid); // "referee-convocation-for-game-392936"
 * ```
 */
export function parseICalFeed(icsContent: string): ICalEvent[] {
  if (!icsContent || typeof icsContent !== 'string') {
    return []
  }

  const unfolded = unfoldLines(icsContent)
  const events: ICalEvent[] = []

  // Split into VEVENT blocks
  const eventBlocks = unfolded.split(/BEGIN:VEVENT/i).slice(1)

  for (const block of eventBlocks) {
    // Find the end of the event
    const endIndex = block.search(/END:VEVENT/i)
    if (endIndex === -1) continue

    const eventContent = block.slice(0, endIndex)

    // Extract required properties
    const uid = extractProperty(eventContent, 'UID')
    const summary = extractProperty(eventContent, 'SUMMARY')
    const dtstart = extractProperty(eventContent, 'DTSTART')
    const dtend = extractProperty(eventContent, 'DTEND')

    // Skip events without required fields
    if (!uid || !summary || !dtstart) continue

    // Extract optional properties
    const description = extractProperty(eventContent, 'DESCRIPTION') ?? ''
    const location = extractProperty(eventContent, 'LOCATION')
    const geoStr = extractProperty(eventContent, 'GEO')
    const appleLocationTitle = extractAppleLocationTitle(eventContent)

    // Parse GEO coordinates
    let geo: ICalEvent['geo'] = null
    if (geoStr) {
      const geoParts = geoStr.split(';')
      const latStr = geoParts[0]
      const lonStr = geoParts[1]
      if (latStr !== undefined && lonStr !== undefined) {
        const latitude = parseFloat(latStr)
        const longitude = parseFloat(lonStr)
        if (!isNaN(latitude) && !isNaN(longitude)) {
          geo = { latitude, longitude }
        }
      }
    }

    // Extract Plus Code from Google Maps URL in description
    const plusCode = extractPlusCodeFromDescription(description)

    // If we have a Plus Code but no GEO coordinates, decode the Plus Code
    if (plusCode && !geo) {
      const decoded = decodePlusCode(plusCode)
      if (decoded) {
        geo = { latitude: decoded.latitude, longitude: decoded.longitude }
      }
    }

    events.push({
      uid,
      summary,
      description,
      dtstart: parseICalDate(dtstart),
      dtend: dtend ? parseICalDate(dtend) : parseICalDate(dtstart),
      location,
      appleLocationTitle,
      geo,
      plusCode,
    })
  }

  return events
}
