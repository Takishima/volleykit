/**
 * Tests for OJP trip extraction and selection helpers.
 */

import { describe, it, expect } from 'vitest'

import {
  parseDurationToMinutes,
  extractFinalWalkingMinutes,
  calculateActualArrivalTime,
  extractOriginStation,
  extractDestinationStation,
  selectBestTrip,
  type OjpTrip,
} from './ojp-trip-helpers'

// =============================================================================
// Test Helpers
// =============================================================================

function createTrip(overrides: Partial<OjpTrip> = {}): OjpTrip {
  return {
    duration: 'PT1H30M',
    startTime: '2025-03-15T08:00:00Z',
    endTime: '2025-03-15T09:30:00Z',
    transfers: 1,
    leg: [],
    ...overrides,
  }
}

function createTimedLeg(
  boardRef: string,
  boardName: string,
  alightRef: string,
  alightName: string,
  options?: { boardSuffix?: string; alightSuffix?: string }
) {
  return {
    timedLeg: {
      legBoard: {
        stopPointRef: boardRef,
        stopPointName: { text: boardName },
        ...(options?.boardSuffix && { nameSuffix: { text: options.boardSuffix } }),
      },
      legAlight: {
        stopPointRef: alightRef,
        stopPointName: { text: alightName },
        ...(options?.alightSuffix && { nameSuffix: { text: options.alightSuffix } }),
      },
    },
  }
}

function createWalkingLeg(duration: string) {
  return {
    continuousLeg: { duration },
  }
}

// =============================================================================
// parseDurationToMinutes
// =============================================================================

describe('parseDurationToMinutes', () => {
  it('parses hours and minutes', () => {
    expect(parseDurationToMinutes('PT1H30M')).toBe(90)
  })

  it('parses hours only', () => {
    expect(parseDurationToMinutes('PT2H')).toBe(120)
  })

  it('parses minutes only', () => {
    expect(parseDurationToMinutes('PT45M')).toBe(45)
  })

  it('parses seconds and rounds up to next minute', () => {
    expect(parseDurationToMinutes('PT30S')).toBe(1)
  })

  it('parses hours, minutes, and seconds', () => {
    expect(parseDurationToMinutes('PT1H15M30S')).toBe(76)
  })

  it('returns 0 for invalid duration without PT prefix', () => {
    expect(parseDurationToMinutes('1H30M')).toBe(0)
    expect(parseDurationToMinutes('')).toBe(0)
  })

  it('returns 0 for PT with no components', () => {
    expect(parseDurationToMinutes('PT')).toBe(0)
  })

  it('handles zero seconds without rounding up', () => {
    expect(parseDurationToMinutes('PT5M0S')).toBe(5)
  })
})

// =============================================================================
// extractFinalWalkingMinutes
// =============================================================================

describe('extractFinalWalkingMinutes', () => {
  it('returns 0 when trip has no legs', () => {
    expect(extractFinalWalkingMinutes(createTrip())).toBe(0)
  })

  it('returns 0 when trip has no timed legs', () => {
    const trip = createTrip({ leg: [createWalkingLeg('PT10M')] })
    expect(extractFinalWalkingMinutes(trip)).toBe(0)
  })

  it('returns 0 when last leg is a timed leg', () => {
    const trip = createTrip({
      leg: [createTimedLeg('ch:1:sloid:8507000', 'Bern', 'ch:1:sloid:8503000', 'Zürich')],
    })
    expect(extractFinalWalkingMinutes(trip)).toBe(0)
  })

  it('sums walking duration after last timed leg', () => {
    const trip = createTrip({
      leg: [
        createTimedLeg('ch:1:sloid:8507000', 'Bern', 'ch:1:sloid:8503000', 'Zürich'),
        createWalkingLeg('PT5M'),
        createWalkingLeg('PT3M'),
      ],
    })
    expect(extractFinalWalkingMinutes(trip)).toBe(8)
  })

  it('only counts walking after the last timed leg', () => {
    const trip = createTrip({
      leg: [
        createWalkingLeg('PT10M'), // before first timed leg — ignored
        createTimedLeg('ch:1:sloid:8507000', 'Bern', 'ch:1:sloid:8503000', 'Zürich'),
        createWalkingLeg('PT2M'), // between timed legs — ignored (next timed exists)
        createTimedLeg('ch:1:sloid:8503000', 'Zürich', 'ch:1:sloid:8505000', 'Luzern'),
        createWalkingLeg('PT7M'), // after last timed leg — counted
      ],
    })
    expect(extractFinalWalkingMinutes(trip)).toBe(7)
  })
})

// =============================================================================
// calculateActualArrivalTime
// =============================================================================

describe('calculateActualArrivalTime', () => {
  it('returns endTime when no final walking', () => {
    const trip = createTrip({ endTime: '2025-03-15T09:30:00Z' })
    expect(calculateActualArrivalTime(trip)).toBe('2025-03-15T09:30:00Z')
  })

  it('adds final walking time to endTime', () => {
    const trip = createTrip({
      endTime: '2025-03-15T09:30:00.000Z',
      leg: [
        createTimedLeg('ch:1:sloid:8507000', 'Bern', 'ch:1:sloid:8503000', 'Zürich'),
        createWalkingLeg('PT10M'),
      ],
    })
    const result = calculateActualArrivalTime(trip)
    expect(new Date(result).getTime()).toBe(new Date('2025-03-15T09:40:00.000Z').getTime())
  })
})

// =============================================================================
// extractOriginStation / extractDestinationStation
// =============================================================================

describe('extractOriginStation', () => {
  it('returns undefined for trip with no timed legs', () => {
    expect(extractOriginStation(createTrip())).toBeUndefined()
  })

  it('extracts origin station from first timed leg', () => {
    const trip = createTrip({
      leg: [
        createWalkingLeg('PT5M'),
        createTimedLeg('ch:1:sloid:8507000', 'Bern', 'ch:1:sloid:8503000', 'Zürich'),
      ],
    })
    const station = extractOriginStation(trip)
    expect(station).toEqual({ id: '8507000', name: 'Bern' })
  })

  it('includes cleaned suffix in station name', () => {
    const trip = createTrip({
      leg: [
        createTimedLeg('ch:1:sloid:8500218', 'Schönenwerd', 'ch:1:sloid:8503000', 'Zürich', {
          boardSuffix: 'SO, Bahnhof',
        }),
      ],
    })
    const station = extractOriginStation(trip)
    expect(station?.name).toBe('Schönenwerd SO, Bahnhof')
  })

  it('filters accessibility keywords from suffix', () => {
    const trip = createTrip({
      leg: [
        createTimedLeg('ch:1:sloid:8507000', 'Bern', 'ch:1:sloid:8503000', 'Zürich', {
          boardSuffix: 'PLATFORM_ACCESSIBLE',
        }),
      ],
    })
    const station = extractOriginStation(trip)
    expect(station?.name).toBe('Bern')
  })
})

describe('extractDestinationStation', () => {
  it('returns undefined for trip with no timed legs', () => {
    expect(extractDestinationStation(createTrip())).toBeUndefined()
  })

  it('extracts destination station from last timed leg', () => {
    const trip = createTrip({
      leg: [
        createTimedLeg('ch:1:sloid:8507000', 'Bern', 'ch:1:sloid:8503000', 'Zürich'),
        createTimedLeg('ch:1:sloid:8503000', 'Zürich', 'ch:1:sloid:8505000', 'Luzern'),
      ],
    })
    const station = extractDestinationStation(trip)
    expect(station).toEqual({ id: '8505000', name: 'Luzern' })
  })

  it('returns undefined for plain numeric ref without sloid prefix', () => {
    const trip = createTrip({
      leg: [createTimedLeg('ch:1:sloid:8507000', 'Bern', '8503000', 'Zürich')],
    })
    const station = extractDestinationStation(trip)
    expect(station).toEqual({ id: '8503000', name: 'Zürich' })
  })
})

// =============================================================================
// selectBestTrip
// =============================================================================

describe('selectBestTrip', () => {
  const earlyTrip = createTrip({
    startTime: '2025-03-15T07:00:00Z',
    endTime: '2025-03-15T08:30:00Z',
    transfers: 2,
  })
  const optimalTrip = createTrip({
    startTime: '2025-03-15T08:00:00Z',
    endTime: '2025-03-15T09:00:00Z',
    transfers: 1,
  })
  const lateTrip = createTrip({
    startTime: '2025-03-15T09:00:00Z',
    endTime: '2025-03-15T10:30:00Z',
    transfers: 0,
  })

  it('returns first trip when no target arrival time', () => {
    const result = selectBestTrip([earlyTrip, optimalTrip, lateTrip])
    expect(result).toBe(earlyTrip)
  })

  it('selects on-time trip with fewer transfers', () => {
    const target = new Date('2025-03-15T09:30:00Z')
    const result = selectBestTrip([earlyTrip, optimalTrip, lateTrip], target)
    // Both earlyTrip and optimalTrip arrive on time; optimalTrip has fewer transfers
    expect(result).toBe(optimalTrip)
  })

  it('prefers arrival closest to target time among same transfers', () => {
    const sameTransfersEarly = createTrip({
      endTime: '2025-03-15T08:00:00Z',
      transfers: 1,
    })
    const sameTransfersLater = createTrip({
      endTime: '2025-03-15T09:00:00Z',
      transfers: 1,
    })
    const target = new Date('2025-03-15T09:30:00Z')
    const result = selectBestTrip([sameTransfersEarly, sameTransfersLater], target)
    // Prefer later arrival (closer to target) with same transfers
    expect(result).toBe(sameTransfersLater)
  })

  it('falls back to first trip when all arrive late', () => {
    const target = new Date('2025-03-15T07:00:00Z')
    const result = selectBestTrip([earlyTrip, optimalTrip, lateTrip], target)
    expect(result).toBe(earlyTrip)
  })
})
