import { describe, it, expect, vi, beforeEach } from 'vitest'

import { getOrFetchTravelTime } from './travel-time-fetcher'

import type { GetOrFetchTravelTimeParams } from './travel-time-fetcher'
import type { TravelTimeResult } from './types'

vi.mock('./ojp-client', () => ({
  calculateTravelTime: vi.fn(),
}))

vi.mock('./mock-transport', () => ({
  calculateMockTravelTime: vi.fn(),
}))

vi.mock('./persistence', () => ({
  getCachedTravelTime: vi.fn(() => null),
  setCachedTravelTime: vi.fn(),
}))

const mockResult: TravelTimeResult = {
  durationMinutes: 45,
  departureTime: '2026-01-10T10:00:00Z',
  arrivalTime: '2026-01-10T10:45:00Z',
  transfers: 1,
}

function makeParams(
  overrides: Partial<GetOrFetchTravelTimeParams> = {}
): GetOrFetchTravelTimeParams {
  return {
    hallId: 'hall-1',
    from: { latitude: 47.38, longitude: 8.48 },
    to: { latitude: 46.95, longitude: 7.44 },
    homeLocationHash: '47.38,8.48',
    dayType: 'weekday',
    travelMode: 'publicTransport',
    maxBikeDistanceKm: 15,
    useMock: false,
    ...overrides,
  }
}

describe('getOrFetchTravelTime', () => {
  beforeEach(() => {
    // Reset implementations too - a mockReturnValue from a previous test
    // (e.g. the cache hit) must not leak into the cache-miss tests
    vi.resetAllMocks()
  })

  it('returns the cached result without calculating', async () => {
    const { getCachedTravelTime } = await import('./persistence')
    const { calculateTravelTime } = await import('./ojp-client')
    vi.mocked(getCachedTravelTime).mockReturnValue(mockResult)

    const result = await getOrFetchTravelTime(makeParams())

    expect(result).toBe(mockResult)
    expect(getCachedTravelTime).toHaveBeenCalledWith(
      'hall-1',
      '47.38,8.48',
      'weekday',
      'publicTransport'
    )
    expect(calculateTravelTime).not.toHaveBeenCalled()
  })

  it('calculates via OJP and persists on cache miss', async () => {
    const { setCachedTravelTime } = await import('./persistence')
    const { calculateTravelTime } = await import('./ojp-client')
    vi.mocked(calculateTravelTime).mockResolvedValue(mockResult)

    const targetArrivalTime = new Date('2026-01-10T12:00:00Z')
    const result = await getOrFetchTravelTime(makeParams({ targetArrivalTime }))

    expect(result).toBe(mockResult)
    expect(calculateTravelTime).toHaveBeenCalledWith(
      { latitude: 47.38, longitude: 8.48 },
      { latitude: 46.95, longitude: 7.44 },
      { targetArrivalTime, travelMode: 'publicTransport', maxBikeDistanceKm: 15 }
    )
    expect(setCachedTravelTime).toHaveBeenCalledWith(
      'hall-1',
      '47.38,8.48',
      'weekday',
      mockResult,
      'publicTransport'
    )
  })

  it('uses the mock calculator when useMock is set', async () => {
    const { calculateMockTravelTime } = await import('./mock-transport')
    const { calculateTravelTime } = await import('./ojp-client')
    vi.mocked(calculateMockTravelTime).mockResolvedValue(mockResult)

    const result = await getOrFetchTravelTime(
      makeParams({ useMock: true, originLabel: 'Home', destinationLabel: 'Zurich' })
    )

    expect(result).toBe(mockResult)
    expect(calculateTravelTime).not.toHaveBeenCalled()
    expect(calculateMockTravelTime).toHaveBeenCalledWith(
      { latitude: 47.38, longitude: 8.48 },
      { latitude: 46.95, longitude: 7.44 },
      {
        travelMode: 'publicTransport',
        maxBikeDistanceKm: 15,
        originLabel: 'Home',
        destinationLabel: 'Zurich',
      }
    )
  })

  it('keys the cache by travel mode and cycling distance limit', async () => {
    const { getCachedTravelTime, setCachedTravelTime } = await import('./persistence')
    const { calculateTravelTime } = await import('./ojp-client')
    vi.mocked(calculateTravelTime).mockResolvedValue(mockResult)

    await getOrFetchTravelTime(makeParams({ travelMode: 'ebikeTrain', maxBikeDistanceKm: 10 }))

    expect(getCachedTravelTime).toHaveBeenCalledWith(
      'hall-1',
      '47.38,8.48',
      'weekday',
      'ebikeTrain-10'
    )
    expect(setCachedTravelTime).toHaveBeenCalledWith(
      'hall-1',
      '47.38,8.48',
      'weekday',
      mockResult,
      'ebikeTrain-10'
    )
  })
})
