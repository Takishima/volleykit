import { describe, it, expect } from 'vitest'

import { getDayType, hashLocation, getHallCacheKey } from './cache'

describe('getDayType', () => {
  it("returns 'weekday' for Monday", () => {
    const monday = new Date('2024-01-15') // Monday
    expect(getDayType(monday)).toBe('weekday')
  })

  it("returns 'weekday' for Friday", () => {
    const friday = new Date('2024-01-19') // Friday
    expect(getDayType(friday)).toBe('weekday')
  })

  it("returns 'saturday' for Saturday", () => {
    const saturday = new Date('2024-01-20') // Saturday
    expect(getDayType(saturday)).toBe('saturday')
  })

  it("returns 'sunday' for Sunday", () => {
    const sunday = new Date('2024-01-21') // Sunday
    expect(getDayType(sunday)).toBe('sunday')
  })

  it('returns weekday for all weekdays (Mon-Fri)', () => {
    // Jan 15-19, 2024 are Mon-Fri
    const weekdays = [
      new Date('2024-01-15'), // Mon
      new Date('2024-01-16'), // Tue
      new Date('2024-01-17'), // Wed
      new Date('2024-01-18'), // Thu
      new Date('2024-01-19'), // Fri
    ]

    weekdays.forEach((day) => {
      expect(getDayType(day)).toBe('weekday')
    })
  })
})

describe('hashLocation', () => {
  it('rounds coordinates to 3 decimal places', () => {
    const coords = { latitude: 47.37686, longitude: 8.541694 }
    const hash = hashLocation(coords)
    expect(hash).toBe('47.377,8.542')
  })

  it('handles negative coordinates', () => {
    const coords = { latitude: -33.8688, longitude: 151.2093 }
    const hash = hashLocation(coords)
    expect(hash).toBe('-33.869,151.209')
  })

  it('produces same hash for nearby locations (~100m precision)', () => {
    const location1 = { latitude: 47.3768, longitude: 8.5416 }
    const location2 = { latitude: 47.3769, longitude: 8.5417 } // ~10m away

    expect(hashLocation(location1)).toBe(hashLocation(location2))
  })

  it('produces different hashes for distant locations', () => {
    const zurich = { latitude: 47.3769, longitude: 8.5417 }
    const bern = { latitude: 46.948, longitude: 7.4474 }

    expect(hashLocation(zurich)).not.toBe(hashLocation(bern))
  })
})

describe('getHallCacheKey', () => {
  it('returns hallId when provided', () => {
    const result = getHallCacheKey('hall-123', {
      latitude: 47.3769,
      longitude: 8.5417,
    })
    expect(result).toBe('hall-123')
  })

  it('returns coordinate hash when no hallId', () => {
    const coords = { latitude: 47.3769, longitude: 8.5417 }
    const result = getHallCacheKey(undefined, coords)
    expect(result).toBe('coords:47.377,8.542')
  })

  it('returns null when neither hallId nor coords provided', () => {
    const result = getHallCacheKey(undefined, null)
    expect(result).toBeNull()
  })

  it('prefers hallId over coordinates', () => {
    const coords = { latitude: 47.3769, longitude: 8.5417 }
    const result = getHallCacheKey('hall-456', coords)
    expect(result).toBe('hall-456')
  })
})
