/**
 * Tests for date helper utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  MS_PER_SECOND,
  MS_PER_MINUTE,
  MS_PER_HOUR,
  MS_PER_DAY,
  SECONDS_PER_MINUTE,
  MINUTES_PER_HOUR,
  HOURS_PER_DAY,
  formatDateTime,
  formatDate,
  formatDOB,
  isDateInPast,
  isDateToday,
  groupByWeek,
  formatRosterEntries,
  getMaxLastNameWidth,
  getSeasonDateRange,
  type WeekGroup,
  type RosterPlayerData,
} from './date-helpers'

describe('Time Conversion Constants', () => {
  it('should have correct MS_PER_SECOND', () => {
    expect(MS_PER_SECOND).toBe(1000)
  })

  it('should have correct SECONDS_PER_MINUTE', () => {
    expect(SECONDS_PER_MINUTE).toBe(60)
  })

  it('should have correct MINUTES_PER_HOUR', () => {
    expect(MINUTES_PER_HOUR).toBe(60)
  })

  it('should have correct HOURS_PER_DAY', () => {
    expect(HOURS_PER_DAY).toBe(24)
  })

  it('should have correct MS_PER_MINUTE', () => {
    expect(MS_PER_MINUTE).toBe(60000)
  })

  it('should have correct MS_PER_HOUR', () => {
    expect(MS_PER_HOUR).toBe(3600000)
  })

  it('should have correct MS_PER_DAY', () => {
    expect(MS_PER_DAY).toBe(86400000)
  })
})

describe('formatDateTime', () => {
  it('should return TBD for undefined input', () => {
    expect(formatDateTime(undefined)).toBe('TBD')
  })

  it('should return TBD for empty string', () => {
    expect(formatDateTime('')).toBe('TBD')
  })

  it('should return TBD for invalid date string', () => {
    expect(formatDateTime('not-a-date')).toBe('TBD')
  })

  it('should format a valid ISO date string', () => {
    const result = formatDateTime('2025-01-15T14:30:00Z')
    // Result varies by locale, so just check it's not TBD and contains expected parts
    expect(result).not.toBe('TBD')
    expect(result).toMatch(/\d/) // Contains numbers
  })

  it('should handle dates with timezone offsets', () => {
    const result = formatDateTime('2025-06-20T10:00:00+02:00')
    expect(result).not.toBe('TBD')
  })
})

describe('formatDate', () => {
  it('should format date with default format (dd.MM.yyyy)', () => {
    expect(formatDate('2025-01-15')).toBe('15.01.2025')
  })

  it('should format date with custom format', () => {
    expect(formatDate('2025-01-15', 'yyyy-MM-dd')).toBe('2025-01-15')
  })

  it('should format date with another custom format', () => {
    expect(formatDate('2025-06-20', 'dd/MM/yy')).toBe('20/06/25')
  })

  it('should return original string for invalid date', () => {
    expect(formatDate('invalid-date')).toBe('invalid-date')
  })

  it('should handle ISO datetime strings', () => {
    expect(formatDate('2025-01-15T14:30:00Z')).toBe('15.01.2025')
  })
})

describe('formatDOB', () => {
  it('should format a valid date as DD.MM.YY', () => {
    expect(formatDOB('2000-05-15')).toBe('15.05.00')
  })

  it('should format a date from a different century', () => {
    expect(formatDOB('1990-12-31')).toBe('31.12.90')
  })

  it('should return empty string for null', () => {
    expect(formatDOB(null)).toBe('')
  })

  it('should return empty string for undefined', () => {
    expect(formatDOB(undefined)).toBe('')
  })

  it('should return empty string for empty string', () => {
    expect(formatDOB('')).toBe('')
  })

  it('should return empty string for invalid date', () => {
    expect(formatDOB('invalid')).toBe('')
  })

  it('should handle ISO datetime strings', () => {
    expect(formatDOB('1985-03-20T00:00:00Z')).toBe('20.03.85')
  })

  it('should pad single-digit day and month', () => {
    expect(formatDOB('2005-01-05')).toBe('05.01.05')
  })
})

describe('isDateInPast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-06-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return true for a date in the past', () => {
    expect(isDateInPast('2025-01-01')).toBe(true)
  })

  it('should return true for a date earlier in the same day', () => {
    expect(isDateInPast('2025-06-15T10:00:00Z')).toBe(true)
  })

  it('should return false for a date in the future', () => {
    expect(isDateInPast('2025-12-31')).toBe(false)
  })

  it('should return false for invalid date', () => {
    expect(isDateInPast('invalid')).toBe(false)
  })
})

describe('isDateToday', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-06-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return true for today', () => {
    expect(isDateToday('2025-06-15')).toBe(true)
  })

  it('should return true for today with time', () => {
    expect(isDateToday('2025-06-15T18:30:00Z')).toBe(true)
  })

  it('should return false for yesterday', () => {
    expect(isDateToday('2025-06-14')).toBe(false)
  })

  it('should return false for tomorrow', () => {
    expect(isDateToday('2025-06-16')).toBe(false)
  })

  it('should return false for invalid date', () => {
    expect(isDateToday('invalid')).toBe(false)
  })
})

describe('groupByWeek', () => {
  interface TestItem {
    id: number
    date: string
  }

  const getDate = (item: TestItem) => item.date

  it('should return empty array for empty input', () => {
    expect(groupByWeek<TestItem>([], getDate)).toEqual([])
  })

  it('should group items in same week together', () => {
    const items: TestItem[] = [
      { id: 1, date: '2025-01-13' }, // Monday
      { id: 2, date: '2025-01-14' }, // Tuesday
      { id: 3, date: '2025-01-15' }, // Wednesday
    ]

    const groups = groupByWeek(items, getDate)
    expect(groups).toHaveLength(1)
    expect(groups[0].items).toHaveLength(3)
    expect(groups[0].week.weekNumber).toBe(3)
  })

  it('should create separate groups for different weeks', () => {
    const items: TestItem[] = [
      { id: 1, date: '2025-01-13' }, // Week 3
      { id: 2, date: '2025-01-20' }, // Week 4
    ]

    const groups = groupByWeek(items, getDate)
    expect(groups).toHaveLength(2)
    expect(groups[0].items).toHaveLength(1)
    expect(groups[1].items).toHaveLength(1)
  })

  it('should handle week boundaries correctly (Monday start)', () => {
    const items: TestItem[] = [
      { id: 1, date: '2025-01-19' }, // Sunday - Week 3
      { id: 2, date: '2025-01-20' }, // Monday - Week 4
    ]

    const groups = groupByWeek(items, getDate)
    expect(groups).toHaveLength(2)
    expect(groups[0].week.weekNumber).toBe(3)
    expect(groups[1].week.weekNumber).toBe(4)
  })

  it('should skip items with invalid dates', () => {
    const items: TestItem[] = [
      { id: 1, date: '2025-01-13' },
      { id: 2, date: 'invalid' },
      { id: 3, date: '2025-01-14' },
    ]

    const groups = groupByWeek(items, getDate)
    expect(groups).toHaveLength(1)
    expect(groups[0].items).toHaveLength(2)
  })

  it('should skip items with null/undefined dates', () => {
    const items = [
      { id: 1, date: '2025-01-13' },
      { id: 2, date: null },
      { id: 3, date: undefined },
    ] as TestItem[]

    const groups = groupByWeek(items, (item) => item.date)
    expect(groups).toHaveLength(1)
    expect(groups[0].items).toHaveLength(1)
  })

  it('should include correct week info', () => {
    const items: TestItem[] = [{ id: 1, date: '2025-01-15' }] // Wednesday of Week 3

    const groups = groupByWeek(items, getDate)
    const week = groups[0].week

    expect(week.key).toBe('2025-W03')
    expect(week.weekNumber).toBe(3)
    expect(week.year).toBe(2025)
    expect(week.weekStart.getDay()).toBe(1) // Monday
    expect(week.weekEnd.getDay()).toBe(0) // Sunday
  })
})

describe('formatRosterEntries', () => {
  it('should return empty map for empty array', () => {
    expect(formatRosterEntries([])).toEqual(new Map())
  })

  it('should format a single player', () => {
    const players: RosterPlayerData[] = [
      { id: '1', firstName: 'John', lastName: 'Smith', birthday: '1990-05-15' },
    ]

    const result = formatRosterEntries(players)
    const entry = result.get('1')

    expect(entry).toBeDefined()
    expect(entry?.lastName).toBe('Smith')
    expect(entry?.firstInitial).toBe('J.')
    expect(entry?.dob).toBe('15.05.90')
    expect(entry?.displayString).toBe('Smith J. 15.05.90')
  })

  it('should use 2 letters for players with same last name and first initial', () => {
    const players: RosterPlayerData[] = [
      { id: '1', firstName: 'John', lastName: 'Smith', birthday: '1990-05-15' },
      { id: '2', firstName: 'Jane', lastName: 'Smith', birthday: '1992-08-20' },
    ]

    const result = formatRosterEntries(players)
    const john = result.get('1')
    const jane = result.get('2')

    expect(john?.firstInitial).toBe('Jo.')
    expect(jane?.firstInitial).toBe('Ja.')
  })

  it('should use 1 letter for players with same last name but different first initials', () => {
    const players: RosterPlayerData[] = [
      { id: '1', firstName: 'John', lastName: 'Smith', birthday: '1990-05-15' },
      { id: '2', firstName: 'Alice', lastName: 'Smith', birthday: '1992-08-20' },
    ]

    const result = formatRosterEntries(players)
    const john = result.get('1')
    const alice = result.get('2')

    expect(john?.firstInitial).toBe('J.')
    expect(alice?.firstInitial).toBe('A.')
  })

  it('should handle players with different last names', () => {
    const players: RosterPlayerData[] = [
      { id: '1', firstName: 'John', lastName: 'Smith', birthday: '1990-05-15' },
      { id: '2', firstName: 'John', lastName: 'Doe', birthday: '1992-08-20' },
    ]

    const result = formatRosterEntries(players)
    const smith = result.get('1')
    const doe = result.get('2')

    expect(smith?.firstInitial).toBe('J.')
    expect(doe?.firstInitial).toBe('J.')
  })

  it('should handle missing first name', () => {
    const players: RosterPlayerData[] = [{ id: '1', lastName: 'Smith', birthday: '1990-05-15' }]

    const result = formatRosterEntries(players)
    const entry = result.get('1')

    expect(entry?.firstInitial).toBe('')
    expect(entry?.displayString).toBe('Smith 15.05.90')
  })

  it('should handle missing birthday', () => {
    const players: RosterPlayerData[] = [{ id: '1', firstName: 'John', lastName: 'Smith' }]

    const result = formatRosterEntries(players)
    const entry = result.get('1')

    expect(entry?.dob).toBe('')
    expect(entry?.displayString).toBe('Smith J.')
  })

  it('should handle null birthday', () => {
    const players: RosterPlayerData[] = [
      { id: '1', firstName: 'John', lastName: 'Smith', birthday: null },
    ]

    const result = formatRosterEntries(players)
    const entry = result.get('1')

    expect(entry?.dob).toBe('')
  })

  it('should handle empty first name', () => {
    const players: RosterPlayerData[] = [
      { id: '1', firstName: '', lastName: 'Smith', birthday: '1990-05-15' },
    ]

    const result = formatRosterEntries(players)
    const entry = result.get('1')

    expect(entry?.firstInitial).toBe('')
  })
})

describe('getMaxLastNameWidth', () => {
  it('should return 0 for empty map', () => {
    expect(getMaxLastNameWidth(new Map())).toBe(0)
  })

  it('should return length of single entry', () => {
    const entries = new Map([
      ['1', { lastName: 'Smith', firstInitial: 'J.', dob: '', displayString: '' }],
    ])

    expect(getMaxLastNameWidth(entries)).toBe(5)
  })

  it('should return length of longest last name', () => {
    const entries = new Map([
      ['1', { lastName: 'Smith', firstInitial: 'J.', dob: '', displayString: '' }],
      ['2', { lastName: 'Doe', firstInitial: 'J.', dob: '', displayString: '' }],
      ['3', { lastName: 'Schwarzenegger', firstInitial: 'A.', dob: '', displayString: '' }],
    ])

    expect(getMaxLastNameWidth(entries)).toBe(14) // 'Schwarzenegger'.length
  })

  it('should handle empty last name', () => {
    const entries = new Map([
      ['1', { lastName: '', firstInitial: 'J.', dob: '', displayString: '' }],
    ])

    expect(getMaxLastNameWidth(entries)).toBe(0)
  })
})

describe('getSeasonDateRange', () => {
  it('should return current season when in October', () => {
    const refDate = new Date(2025, 9, 15) // October 15, 2025
    const result = getSeasonDateRange(refDate)

    expect(result.from.getFullYear()).toBe(2025)
    expect(result.from.getMonth()).toBe(8) // September
    expect(result.to.getFullYear()).toBe(2026)
    expect(result.to.getMonth()).toBe(4) // May
  })

  it('should return current season when in September', () => {
    const refDate = new Date(2025, 8, 1) // September 1, 2025
    const result = getSeasonDateRange(refDate)

    expect(result.from.getFullYear()).toBe(2025)
    expect(result.from.getMonth()).toBe(8) // September
    expect(result.to.getFullYear()).toBe(2026)
    expect(result.to.getMonth()).toBe(4) // May
  })

  it('should return previous season when in January', () => {
    const refDate = new Date(2025, 0, 15) // January 15, 2025
    const result = getSeasonDateRange(refDate)

    expect(result.from.getFullYear()).toBe(2024)
    expect(result.from.getMonth()).toBe(8) // September
    expect(result.to.getFullYear()).toBe(2025)
    expect(result.to.getMonth()).toBe(4) // May
  })

  it('should return previous season when in May', () => {
    const refDate = new Date(2025, 4, 31) // May 31, 2025
    const result = getSeasonDateRange(refDate)

    expect(result.from.getFullYear()).toBe(2024)
    expect(result.from.getMonth()).toBe(8) // September
    expect(result.to.getFullYear()).toBe(2025)
    expect(result.to.getMonth()).toBe(4) // May
  })

  it('should return previous season when in August', () => {
    const refDate = new Date(2025, 7, 15) // August 15, 2025
    const result = getSeasonDateRange(refDate)

    expect(result.from.getFullYear()).toBe(2024)
    expect(result.from.getMonth()).toBe(8) // September
    expect(result.to.getFullYear()).toBe(2025)
    expect(result.to.getMonth()).toBe(4) // May
  })

  it('should return season with correct start date (September 1st)', () => {
    const refDate = new Date(2025, 10, 15) // November 15, 2025
    const result = getSeasonDateRange(refDate)

    expect(result.from.getDate()).toBe(1)
    expect(result.from.getMonth()).toBe(8) // September
  })

  it('should return season with correct end date (May 31st)', () => {
    const refDate = new Date(2025, 10, 15) // November 15, 2025
    const result = getSeasonDateRange(refDate)

    expect(result.to.getDate()).toBe(31)
    expect(result.to.getMonth()).toBe(4) // May
  })

  it('should use current date when no reference date provided', () => {
    const result = getSeasonDateRange()

    // Just verify it returns valid dates
    expect(result.from).toBeInstanceOf(Date)
    expect(result.to).toBeInstanceOf(Date)
    expect(result.to > result.from).toBe(true)
  })
})
