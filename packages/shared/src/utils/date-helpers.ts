/**
 * Date formatting utilities for VolleyKit.
 * Extracted from web-app/src/shared/utils/date-helpers.ts for cross-platform use.
 */

import { parseISO, startOfWeek, endOfWeek, isValid, getISOWeek, getYear, format } from 'date-fns'

// ============================================================================
// Time Conversion Constants
// ============================================================================

/** Milliseconds in one second */
export const MS_PER_SECOND = 1000

/** Seconds in one minute */
export const SECONDS_PER_MINUTE = 60

/** Minutes in one hour */
export const MINUTES_PER_HOUR = 60

/** Hours in one day */
export const HOURS_PER_DAY = 24

/** Milliseconds in one minute */
export const MS_PER_MINUTE = MS_PER_SECOND * SECONDS_PER_MINUTE

/** Milliseconds in one hour */
export const MS_PER_HOUR = MS_PER_MINUTE * MINUTES_PER_HOUR

/** Milliseconds in one day */
export const MS_PER_DAY = MS_PER_HOUR * HOURS_PER_DAY

const DATE_TIME_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  weekday: 'short',
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
} as const

/**
 * Formats an ISO datetime string to a localized human-readable format.
 * Returns 'TBD' if the input is undefined or invalid.
 *
 * @param isoString - ISO 8601 datetime string
 * @returns Formatted date string or 'TBD'
 */
export function formatDateTime(isoString?: string): string {
  if (!isoString) return 'TBD'
  try {
    const date = new Date(isoString)
    if (isNaN(date.getTime())) return 'TBD'
    return date.toLocaleString(undefined, DATE_TIME_FORMAT_OPTIONS)
  } catch {
    return 'TBD'
  }
}

/**
 * Formats an ISO date string with a custom format string.
 */
export const formatDate = (dateString: string, formatString = 'dd.MM.yyyy'): string => {
  const date = parseISO(dateString)
  if (!isValid(date)) return dateString
  return format(date, formatString)
}

/**
 * Formats a birthday string as DD.MM.YY (Swiss format).
 * Returns empty string if the input is undefined, null, or invalid.
 *
 * @param birthday - ISO date string or date-like string
 * @returns Formatted date as DD.MM.YY or empty string
 */
export function formatDOB(birthday: string | null | undefined): string {
  if (!birthday) return ''
  const date = new Date(birthday)
  if (isNaN(date.getTime())) return ''
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = String(date.getFullYear()).slice(-2)
  return `${day}.${month}.${year}`
}

/**
 * Checks if a date is in the past.
 */
export const isDateInPast = (dateString: string): boolean => {
  const date = parseISO(dateString)
  return isValid(date) && date < new Date()
}

/**
 * Checks if a date is today.
 */
export const isDateToday = (dateString: string): boolean => {
  const date = parseISO(dateString)
  if (!isValid(date)) return false
  const today = new Date()
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}

/**
 * Represents a week with its start and end dates.
 */
export interface WeekInfo {
  /** Unique key for the week (e.g., "2025-W05") */
  key: string
  /** Start of week (Monday) */
  weekStart: Date
  /** End of week (Sunday) */
  weekEnd: Date
  /** ISO week number */
  weekNumber: number
  /** Year the week belongs to */
  year: number
}

/**
 * Represents items grouped by week.
 */
export interface WeekGroup<T> {
  week: WeekInfo
  items: T[]
}

/**
 * Groups items by ISO week (Monday-Sunday).
 * Items are expected to already be sorted by date.
 *
 * @param items - Array of items to group
 * @param getDateString - Function to extract the ISO date string from an item
 * @returns Array of week groups with their items
 */
export function groupByWeek<T>(
  items: T[],
  getDateString: (item: T) => string | undefined | null
): WeekGroup<T>[] {
  const groups: WeekGroup<T>[] = []
  let currentGroup: WeekGroup<T> | null = null

  for (const item of items) {
    const dateString = getDateString(item)
    if (!dateString) continue

    const date = parseISO(dateString)
    if (!isValid(date)) continue

    const weekStart = startOfWeek(date, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(date, { weekStartsOn: 1 })
    const weekNumber = getISOWeek(date)
    const year = getYear(weekStart)
    const weekKey = `${year}-W${String(weekNumber).padStart(2, '0')}`

    if (!currentGroup || currentGroup.week.key !== weekKey) {
      currentGroup = {
        week: {
          key: weekKey,
          weekStart,
          weekEnd,
          weekNumber,
          year,
        },
        items: [],
      }
      groups.push(currentGroup)
    }

    currentGroup.items.push(item)
  }

  return groups
}

/**
 * Player data for roster formatting.
 */
export interface RosterPlayerData {
  id: string
  firstName?: string
  lastName?: string
  birthday?: string | null
}

/**
 * Formatted player entry with abbreviated first name.
 */
export interface FormattedRosterEntry {
  lastName: string
  firstInitial: string
  dob: string
  displayString: string
}

/**
 * Computes the minimum number of first name letters needed to distinguish
 * players with the same last name.
 */
function computeInitialLengths(players: RosterPlayerData[]): Map<string, number> {
  const result = new Map<string, number>()

  for (const player of players) {
    result.set(player.id, 1)
  }

  if (players.length <= 1) {
    return result
  }

  const byFirstLetter = new Map<string, RosterPlayerData[]>()
  for (const player of players) {
    const firstLetter = (player.firstName ?? '').charAt(0).toUpperCase()
    const existing = byFirstLetter.get(firstLetter) ?? []
    existing.push(player)
    byFirstLetter.set(firstLetter, existing)
  }

  for (const group of byFirstLetter.values()) {
    if (group.length > 1) {
      for (const player of group) {
        result.set(player.id, 2)
      }
    }
  }

  return result
}

/**
 * Formats player roster entries with abbreviated first names and DOB.
 * Uses 1 letter for first name by default, 2 letters if there are duplicate
 * last names with the same first initial.
 *
 * Format: "LastName X. dd.mm.yy" or "LastName Xy. dd.mm.yy" for duplicates
 *
 * @param players - Array of players to format
 * @returns Map of player ID to formatted entry data
 */
export function formatRosterEntries(
  players: RosterPlayerData[]
): Map<string, FormattedRosterEntry> {
  const result = new Map<string, FormattedRosterEntry>()

  const byLastName = new Map<string, RosterPlayerData[]>()
  for (const player of players) {
    const lastName = (player.lastName ?? '').toLowerCase()
    const existing = byLastName.get(lastName) ?? []
    existing.push(player)
    byLastName.set(lastName, existing)
  }

  const initialLengths = new Map<string, number>()
  for (const group of byLastName.values()) {
    const groupLengths = computeInitialLengths(group)
    for (const [id, length] of groupLengths) {
      initialLengths.set(id, length)
    }
  }

  for (const player of players) {
    const lastName = player.lastName ?? ''
    const firstName = player.firstName ?? ''
    const initialLength = initialLengths.get(player.id) ?? 1
    const firstInitial =
      firstName.length > 0
        ? firstName.slice(0, initialLength).charAt(0).toUpperCase() +
          firstName.slice(1, initialLength).toLowerCase() +
          '.'
        : ''
    const dob = formatDOB(player.birthday)

    const displayString = [lastName, firstInitial, dob].filter(Boolean).join(' ')

    result.set(player.id, {
      lastName,
      firstInitial,
      dob,
      displayString,
    })
  }

  return result
}

/**
 * Calculates the maximum last name width from formatted roster entries.
 * Used for column alignment in player lists.
 *
 * @param entries - Map of formatted roster entries
 * @returns Maximum last name character length
 */
export function getMaxLastNameWidth(entries: Map<string, FormattedRosterEntry>): number {
  let maxLen = 0
  for (const entry of entries.values()) {
    if (entry.lastName.length > maxLen) {
      maxLen = entry.lastName.length
    }
  }
  return maxLen
}

// Volleyball season months (0-indexed): September = 8, May = 4
const SEASON_START_MONTH = 8
const SEASON_END_MONTH = 4

/**
 * Calculate the current volleyball season date range.
 * A season runs from beginning of September to end of May of the following year.
 *
 * @param referenceDate - Date to calculate season for (defaults to current date)
 * @returns Object with season start and end dates
 */
export function getSeasonDateRange(referenceDate: Date = new Date()): {
  from: Date
  to: Date
} {
  const currentMonth = referenceDate.getMonth()
  const currentYear = referenceDate.getFullYear()

  let seasonStartYear: number
  let seasonEndYear: number

  if (currentMonth >= SEASON_START_MONTH) {
    seasonStartYear = currentYear
    seasonEndYear = currentYear + 1
  } else {
    seasonStartYear = currentYear - 1
    seasonEndYear = currentYear
  }

  const seasonStart = new Date(seasonStartYear, SEASON_START_MONTH, 1)
  const seasonEnd = new Date(seasonEndYear, SEASON_END_MONTH + 1, 0)

  return { from: seasonStart, to: seasonEnd }
}
