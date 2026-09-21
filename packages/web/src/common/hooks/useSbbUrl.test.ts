import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { useSbbUrl } from './useSbbUrl'

// Mock stores - simple mocks that return fixed values
vi.mock('@/common/stores/auth', () => ({
  useAuthStore: vi.fn((selector: (state: { dataSource: string }) => unknown) =>
    selector({ dataSource: 'demo' })
  ),
}))

vi.mock('@/common/stores/settings', () => ({
  useSettingsStore: vi.fn((selector: (state: unknown) => unknown) =>
    selector({
      homeLocation: {
        latitude: 47.3769,
        longitude: 8.5417,
        label: 'Zurich, Switzerland',
        source: 'geocoded',
      },
      getArrivalBufferForAssociation: () => 30,
      travelTimeFilter: {
        sbbDestinationType: 'address',
      },
    })
  ),
}))

vi.mock('@/common/hooks/useActiveAssociation', () => ({
  useActiveAssociationCode: () => 'test-assoc',
}))

// Mock transport services
const mockGetOrFetchTravelTime = vi.fn()

vi.mock('@/common/services/transport', () => ({
  getOrFetchTravelTime: (...args: unknown[]) => mockGetOrFetchTravelTime(...args),
  isOjpConfigured: () => false, // Always use mock transport
  hashLocation: () => 'location-hash',
  getDayType: () => 'weekday',
  getTravelModeKey: () => 'publicTransport',
  DEFAULT_TRAVEL_MODE: 'publicTransport',
  DEFAULT_MAX_BIKE_DISTANCE_KM: 15,
}))

// Mock SBB URL utils
const mockGenerateSbbUrl = vi.fn()
const mockOpenSbbUrl = vi.fn()

vi.mock('@/common/utils/sbb-url', () => ({
  generateSbbUrl: (...args: unknown[]) => mockGenerateSbbUrl(...args),
  calculateArrivalTime: (date: Date, buffer: number) => {
    const arrival = new Date(date)
    arrival.setMinutes(arrival.getMinutes() - buffer)
    return arrival
  },
  openSbbUrl: (...args: unknown[]) => mockOpenSbbUrl(...args),
}))

describe('useSbbUrl', () => {
  const defaultOptions = {
    hallCoords: { latitude: 47.38, longitude: 8.54 },
    hallId: 'hall-123',
    city: 'Zurich',
    hallAddress: 'Sporthalle Zurich, Sportstrasse 1, 8000 Zürich',
    gameStartTime: '2024-03-15T14:00:00',
    language: 'de' as const,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockGenerateSbbUrl.mockReturnValue('https://sbb.ch/test')
  })

  it('returns initial state', () => {
    const { result } = renderHook(() => useSbbUrl(defaultOptions))

    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.originStation).toBeUndefined()
    expect(result.current.destinationStation).toBeUndefined()
    expect(typeof result.current.openSbbConnection).toBe('function')
  })

  it('does nothing when city is missing', async () => {
    const { result } = renderHook(() => useSbbUrl({ ...defaultOptions, city: undefined }))

    await act(async () => {
      await result.current.openSbbConnection()
    })

    expect(mockOpenSbbUrl).not.toHaveBeenCalled()
  })

  it('does nothing when gameStartTime is missing', async () => {
    const { result } = renderHook(() => useSbbUrl({ ...defaultOptions, gameStartTime: undefined }))

    await act(async () => {
      await result.current.openSbbConnection()
    })

    expect(mockOpenSbbUrl).not.toHaveBeenCalled()
  })

  it('uses cached trip result when available', async () => {
    // Caching lives inside getOrFetchTravelTime (see travel-time-fetcher.test);
    // the hook simply consumes whatever it resolves.
    const cachedResult = {
      travelTimeMinutes: 45,
      originStation: { id: 'origin-123', name: 'Zurich HB' },
      destinationStation: { id: 'dest-456', name: 'Basel SBB' },
    }
    mockGetOrFetchTravelTime.mockResolvedValue(cachedResult)

    const { result } = renderHook(() => useSbbUrl(defaultOptions))

    await act(async () => {
      await result.current.openSbbConnection()
    })

    expect(mockGetOrFetchTravelTime).toHaveBeenCalledTimes(1)
    expect(mockOpenSbbUrl).toHaveBeenCalled()
  })

  it('fetches trip data when not cached', async () => {
    mockGetOrFetchTravelTime.mockResolvedValue({
      travelTimeMinutes: 30,
      originStation: { id: 'mock-origin', name: 'Mock Origin' },
      destinationStation: { id: 'mock-dest', name: 'Mock Dest' },
    })

    const { result } = renderHook(() => useSbbUrl(defaultOptions))

    await act(async () => {
      await result.current.openSbbConnection()
    })

    expect(mockGetOrFetchTravelTime).toHaveBeenCalled()
    expect(mockOpenSbbUrl).toHaveBeenCalled()
  })

  it('stores station info after successful fetch', async () => {
    const tripResult = {
      travelTimeMinutes: 30,
      originStation: { id: 'origin-id', name: 'Origin Station' },
      destinationStation: { id: 'dest-id', name: 'Dest Station' },
    }
    mockGetOrFetchTravelTime.mockResolvedValue(tripResult)

    const { result } = renderHook(() => useSbbUrl(defaultOptions))

    await act(async () => {
      await result.current.openSbbConnection()
    })

    expect(result.current.originStation).toEqual(tripResult.originStation)
    expect(result.current.destinationStation).toEqual(tripResult.destinationStation)
  })

  it('requests the trip with the shared travel-mode parameters', async () => {
    const tripResult = {
      travelTimeMinutes: 30,
      originStation: { id: 's1', name: 'S1' },
      destinationStation: { id: 's2', name: 'S2' },
    }
    mockGetOrFetchTravelTime.mockResolvedValue(tripResult)

    const { result } = renderHook(() => useSbbUrl(defaultOptions))

    await act(async () => {
      await result.current.openSbbConnection()
    })

    // Same params (incl. travel mode) as the travel time hooks, so the SBB
    // link shares their cache namespace instead of double-fetching
    expect(mockGetOrFetchTravelTime).toHaveBeenCalledWith(
      expect.objectContaining({
        hallId: defaultOptions.hallId,
        travelMode: 'publicTransport',
        maxBikeDistanceKm: 15,
        useMock: true,
      })
    )
  })

  it('handles fetch error gracefully and opens URL with fallback', async () => {
    mockGetOrFetchTravelTime.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useSbbUrl(defaultOptions))

    await act(async () => {
      await result.current.openSbbConnection()
    })

    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.isLoading).toBe(false)
    // Should still open URL with fallback
    expect(mockOpenSbbUrl).toHaveBeenCalled()
  })

  it('converts non-Error exceptions to Error', async () => {
    mockGetOrFetchTravelTime.mockRejectedValue('string error')

    const { result } = renderHook(() => useSbbUrl(defaultOptions))

    await act(async () => {
      await result.current.openSbbConnection()
    })

    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.error?.message).toBe('Failed to fetch trip data')
  })

  it('generates URL with station info', async () => {
    const tripResult = {
      travelTimeMinutes: 30,
      originStation: { id: 'origin-id', name: 'Origin Station' },
      destinationStation: { id: 'dest-id', name: 'Dest Station' },
    }
    mockGetOrFetchTravelTime.mockResolvedValue(tripResult)

    const { result } = renderHook(() => useSbbUrl(defaultOptions))

    await act(async () => {
      await result.current.openSbbConnection()
    })

    expect(mockGenerateSbbUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        destination: 'Zurich',
        language: 'de',
        originStation: tripResult.originStation,
        destinationStation: tripResult.destinationStation,
      })
    )
  })

  it('passes hall address as destination address', async () => {
    const tripResult = {
      travelTimeMinutes: 30,
      originStation: { id: 'origin-id', name: 'Origin Station' },
      destinationStation: { id: 'dest-id', name: 'Dest Station' },
    }
    mockGetOrFetchTravelTime.mockResolvedValue(tripResult)

    const { result } = renderHook(() => useSbbUrl(defaultOptions))

    await act(async () => {
      await result.current.openSbbConnection()
    })

    expect(mockGenerateSbbUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        destinationAddress: 'Sporthalle Zurich, Sportstrasse 1, 8000 Zürich',
      })
    )
  })

  it('handles null hall address', async () => {
    const tripResult = {
      travelTimeMinutes: 30,
      originStation: { id: 'origin-id', name: 'Origin Station' },
      destinationStation: { id: 'dest-id', name: 'Dest Station' },
    }
    mockGetOrFetchTravelTime.mockResolvedValue(tripResult)

    const { result } = renderHook(() => useSbbUrl({ ...defaultOptions, hallAddress: null }))

    await act(async () => {
      await result.current.openSbbConnection()
    })

    expect(mockGenerateSbbUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        destinationAddress: undefined,
      })
    )
  })

  // Keep last in this file: it overrides the settings-store mock implementation
  it('subtracts the cycling egress from the arrival time when routing to the station in e-bike mode', async () => {
    const { useSettingsStore } = await import('@/common/stores/settings')
    vi.mocked(useSettingsStore).mockImplementation((selector: (state: unknown) => unknown) =>
      selector({
        homeLocation: {
          latitude: 47.3769,
          longitude: 8.5417,
          label: 'Zurich, Switzerland',
          source: 'geocoded',
        },
        getArrivalBufferForAssociation: () => 30,
        travelTimeFilter: {
          sbbDestinationType: 'station',
          travelMode: 'ebikeTrain',
          maxBikeDistanceKm: 15,
        },
      })
    )

    mockGetOrFetchTravelTime.mockResolvedValue({
      durationMinutes: 80,
      transfers: 0,
      originStation: { id: 'origin-id', name: 'Origin Station' },
      destinationStation: { id: 'dest-id', name: 'Dest Station' },
      finalWalkingMinutes: 0,
      travelMode: 'ebikeTrain',
      bikeLegs: {
        toStationMinutes: 10,
        toStationKm: 4,
        fromStationMinutes: 27,
        fromStationKm: 11,
      },
    })

    const { result } = renderHook(() => useSbbUrl(defaultOptions))

    await act(async () => {
      await result.current.openSbbConnection()
    })

    // Game 14:00, buffer 30 min, cycling egress 27 min -> station arrival 13:03
    const expectedArrival = new Date(defaultOptions.gameStartTime)
    expectedArrival.setMinutes(expectedArrival.getMinutes() - 30 - 27)

    expect(mockGenerateSbbUrl).toHaveBeenCalledWith(
      expect.objectContaining({ arrivalTime: expectedArrival })
    )
  })
})
