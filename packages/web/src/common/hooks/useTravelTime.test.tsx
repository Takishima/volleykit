import type { ReactNode } from 'react'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import type { TravelTimeResult, Coordinates } from '@/common/services/transport'

import { useTravelTime, formatTravelTime, useTravelTimeAvailable } from './useTravelTime'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFunction = (...args: any[]) => any

// Mock the transport service
vi.mock('@/common/services/transport', () => ({
  getOrFetchTravelTime: vi.fn(),
  isOjpConfigured: vi.fn(() => false),
  hashLocation: vi.fn((coords: Coordinates) => `${coords.latitude},${coords.longitude}`),
  getDayType: vi.fn(() => 'weekday'),
  getCachedTravelTime: vi.fn(() => null),
  setCachedTravelTime: vi.fn(),
  removeCachedTravelTime: vi.fn(),
  getTravelModeKey: vi.fn(() => 'publicTransport'),
  DEFAULT_TRAVEL_MODE: 'publicTransport',
  DEFAULT_MAX_BIKE_DISTANCE_KM: 15,
  TRAVEL_TIME_STALE_TIME: 14 * 24 * 60 * 60 * 1000,
  TRAVEL_TIME_GC_TIME: 14 * 24 * 60 * 60 * 1000,
}))

// Mock the stores - using AnyFunction to avoid strict type checking in tests
vi.mock('@/common/stores/auth', () => ({
  useAuthStore: vi.fn((selector: AnyFunction) =>
    selector({ dataSource: 'api', user: null, activeOccupationId: null })
  ),
}))

vi.mock('@/common/stores/settings', () => ({
  useSettingsStore: vi.fn((selector: AnyFunction) =>
    selector({
      homeLocation: null,
      transportEnabled: false,
      isTransportEnabledForAssociation: () => false,
    })
  ),
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useTravelTime', () => {
  const mockHallCoords: Coordinates = { latitude: 46.948, longitude: 7.4474 }
  const mockHomeLocation = {
    latitude: 47.3769,
    longitude: 8.5417,
    label: 'Zürich HB',
    source: 'geocoded' as const,
  }

  const mockTravelTimeResult: TravelTimeResult = {
    durationMinutes: 75,
    departureTime: '2024-01-15T09:00:00Z',
    arrivalTime: '2024-01-15T10:15:00Z',
    transfers: 2,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('query enabling conditions', () => {
    it('does not fetch when transport is disabled', async () => {
      const { getOrFetchTravelTime } = await import('@/common/services/transport')
      const { useSettingsStore } = await import('@/common/stores/settings')

      vi.mocked(useSettingsStore).mockImplementation((selector: AnyFunction) =>
        selector({
          homeLocation: mockHomeLocation,
          transportEnabled: false,
          isTransportEnabledForAssociation: () => false,
        })
      )

      const { result } = renderHook(() => useTravelTime('hall-1', mockHallCoords), {
        wrapper: createWrapper(),
      })

      expect(result.current.isLoading).toBe(false)
      expect(result.current.data).toBeUndefined()
      expect(getOrFetchTravelTime).not.toHaveBeenCalled()
    })

    it('does not fetch when home location is not set', async () => {
      const { getOrFetchTravelTime } = await import('@/common/services/transport')
      const { useSettingsStore } = await import('@/common/stores/settings')

      vi.mocked(useSettingsStore).mockImplementation((selector: AnyFunction) =>
        selector({
          homeLocation: null,
          transportEnabled: true,
          isTransportEnabledForAssociation: () => true,
        })
      )

      const { result } = renderHook(() => useTravelTime('hall-1', mockHallCoords), {
        wrapper: createWrapper(),
      })

      expect(result.current.isLoading).toBe(false)
      expect(result.current.data).toBeUndefined()
      expect(getOrFetchTravelTime).not.toHaveBeenCalled()
    })

    it('does not fetch when hall coordinates are null', async () => {
      const { getOrFetchTravelTime } = await import('@/common/services/transport')
      const { useSettingsStore } = await import('@/common/stores/settings')

      vi.mocked(useSettingsStore).mockImplementation((selector: AnyFunction) =>
        selector({
          homeLocation: mockHomeLocation,
          transportEnabled: true,
          isTransportEnabledForAssociation: () => true,
        })
      )

      const { result } = renderHook(() => useTravelTime('hall-1', null), {
        wrapper: createWrapper(),
      })

      expect(result.current.isLoading).toBe(false)
      expect(result.current.data).toBeUndefined()
      expect(getOrFetchTravelTime).not.toHaveBeenCalled()
    })

    it('does not fetch when hall ID is undefined', async () => {
      const { getOrFetchTravelTime } = await import('@/common/services/transport')
      const { useSettingsStore } = await import('@/common/stores/settings')

      vi.mocked(useSettingsStore).mockImplementation((selector: AnyFunction) =>
        selector({
          homeLocation: mockHomeLocation,
          transportEnabled: true,
          isTransportEnabledForAssociation: () => true,
        })
      )

      const { result } = renderHook(() => useTravelTime(undefined, mockHallCoords), {
        wrapper: createWrapper(),
      })

      expect(result.current.isLoading).toBe(false)
      expect(result.current.data).toBeUndefined()
      expect(getOrFetchTravelTime).not.toHaveBeenCalled()
    })
  })

  describe('demo mode', () => {
    it('uses mock transport in demo mode', async () => {
      const { getOrFetchTravelTime } = await import('@/common/services/transport')
      const { useAuthStore } = await import('@/common/stores/auth')
      const { useSettingsStore } = await import('@/common/stores/settings')

      vi.mocked(useAuthStore).mockImplementation((selector: AnyFunction) =>
        selector({ dataSource: 'demo', user: null, activeOccupationId: null })
      )

      vi.mocked(useSettingsStore).mockImplementation((selector: AnyFunction) =>
        selector({
          homeLocation: mockHomeLocation,
          transportEnabled: true,
          isTransportEnabledForAssociation: () => true,
        })
      )

      vi.mocked(getOrFetchTravelTime).mockResolvedValue(mockTravelTimeResult)

      const { result } = renderHook(() => useTravelTime('hall-1', mockHallCoords), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.data).toBeDefined()
      })

      expect(getOrFetchTravelTime).toHaveBeenCalledWith(
        expect.objectContaining({
          from: { latitude: mockHomeLocation.latitude, longitude: mockHomeLocation.longitude },
          to: mockHallCoords,
          travelMode: 'publicTransport',
          maxBikeDistanceKm: 15,
          useMock: true,
        })
      )
      expect(result.current.data?.durationMinutes).toBe(75)
    })
  })

  describe('production mode with OJP API', () => {
    it('uses real transport API when OJP is configured', async () => {
      const { getOrFetchTravelTime, isOjpConfigured } = await import('@/common/services/transport')
      const { useAuthStore } = await import('@/common/stores/auth')
      const { useSettingsStore } = await import('@/common/stores/settings')

      vi.mocked(useAuthStore).mockImplementation((selector: AnyFunction) =>
        selector({ dataSource: 'api' })
      )

      vi.mocked(useSettingsStore).mockImplementation((selector: AnyFunction) =>
        selector({
          homeLocation: mockHomeLocation,
          transportEnabled: true,
          isTransportEnabledForAssociation: () => true,
        })
      )

      vi.mocked(isOjpConfigured).mockReturnValue(true)
      vi.mocked(getOrFetchTravelTime).mockResolvedValue(mockTravelTimeResult)

      const { result } = renderHook(() => useTravelTime('hall-1', mockHallCoords), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.data).toBeDefined()
      })

      expect(getOrFetchTravelTime).toHaveBeenCalledWith(
        expect.objectContaining({
          from: { latitude: mockHomeLocation.latitude, longitude: mockHomeLocation.longitude },
          to: mockHallCoords,
          targetArrivalTime: undefined,
          travelMode: 'publicTransport',
          maxBikeDistanceKm: 15,
          useMock: false,
        })
      )
      expect(result.current.data?.durationMinutes).toBe(75)
    })

    it('does not fetch when OJP API is not configured and not in demo mode', async () => {
      const { getOrFetchTravelTime, isOjpConfigured } = await import('@/common/services/transport')
      const { useAuthStore } = await import('@/common/stores/auth')
      const { useSettingsStore } = await import('@/common/stores/settings')

      vi.mocked(useAuthStore).mockImplementation((selector: AnyFunction) =>
        selector({ dataSource: 'api' })
      )

      vi.mocked(useSettingsStore).mockImplementation((selector: AnyFunction) =>
        selector({
          homeLocation: mockHomeLocation,
          transportEnabled: true,
          isTransportEnabledForAssociation: () => true,
        })
      )

      vi.mocked(isOjpConfigured).mockReturnValue(false)

      const { result } = renderHook(() => useTravelTime('hall-1', mockHallCoords), {
        wrapper: createWrapper(),
      })

      expect(result.current.isLoading).toBe(false)
      expect(result.current.data).toBeUndefined()
      expect(getOrFetchTravelTime).not.toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('handles API errors gracefully', async () => {
      const { getOrFetchTravelTime } = await import('@/common/services/transport')
      const { useAuthStore } = await import('@/common/stores/auth')
      const { useSettingsStore } = await import('@/common/stores/settings')

      vi.mocked(useAuthStore).mockImplementation((selector: AnyFunction) =>
        selector({ dataSource: 'demo', user: null, activeOccupationId: null })
      )

      vi.mocked(useSettingsStore).mockImplementation((selector: AnyFunction) =>
        selector({
          homeLocation: mockHomeLocation,
          transportEnabled: true,
          isTransportEnabledForAssociation: () => true,
        })
      )

      vi.mocked(getOrFetchTravelTime).mockRejectedValue(new Error('API error'))

      const { result } = renderHook(() => useTravelTime('hall-1', mockHallCoords), {
        wrapper: createWrapper(),
      })

      // QueryClient is configured with retry: false, so error surfaces immediately
      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error?.message).toBe('API error')
    })
  })
})

describe('formatTravelTime', () => {
  it('formats minutes less than 60', () => {
    expect(formatTravelTime(15)).toBe("15'")
    expect(formatTravelTime(45)).toBe("45'")
    expect(formatTravelTime(59)).toBe("59'")
  })

  it('formats exact hours', () => {
    expect(formatTravelTime(60)).toBe('1h')
    expect(formatTravelTime(120)).toBe('2h')
    expect(formatTravelTime(180)).toBe('3h')
  })

  it('formats hours and minutes', () => {
    expect(formatTravelTime(75)).toBe("1h15'")
    expect(formatTravelTime(90)).toBe("1h30'")
    expect(formatTravelTime(145)).toBe("2h25'")
  })

  it('handles edge cases', () => {
    expect(formatTravelTime(0)).toBe("0'")
    expect(formatTravelTime(1)).toBe("1'")
    expect(formatTravelTime(61)).toBe("1h1'")
  })
})

describe('useTravelTimeAvailable', () => {
  it('returns true in demo mode', async () => {
    const { useAuthStore } = await import('@/common/stores/auth')
    const { isOjpConfigured } = await import('@/common/services/transport')

    vi.mocked(useAuthStore).mockImplementation((selector: AnyFunction) =>
      selector({ dataSource: 'demo', user: null, activeOccupationId: null })
    )
    vi.mocked(isOjpConfigured).mockReturnValue(false)

    const { result } = renderHook(() => useTravelTimeAvailable())

    expect(result.current).toBe(true)
  })

  it('returns true when OJP is configured', async () => {
    const { useAuthStore } = await import('@/common/stores/auth')
    const { isOjpConfigured } = await import('@/common/services/transport')

    vi.mocked(useAuthStore).mockImplementation((selector: AnyFunction) =>
      selector({ dataSource: 'api' })
    )
    vi.mocked(isOjpConfigured).mockReturnValue(true)

    const { result } = renderHook(() => useTravelTimeAvailable())

    expect(result.current).toBe(true)
  })

  it('returns false when not in demo mode and OJP not configured', async () => {
    const { useAuthStore } = await import('@/common/stores/auth')
    const { isOjpConfigured } = await import('@/common/services/transport')

    vi.mocked(useAuthStore).mockImplementation((selector: AnyFunction) =>
      selector({ dataSource: 'api' })
    )
    vi.mocked(isOjpConfigured).mockReturnValue(false)

    const { result } = renderHook(() => useTravelTimeAvailable())

    expect(result.current).toBe(false)
  })
})

describe('day type caching', () => {
  const mockHallCoords: Coordinates = { latitude: 46.948, longitude: 7.4474 }
  const mockHomeLocation = {
    latitude: 47.3769,
    longitude: 8.5417,
    label: 'Zürich HB',
    source: 'geocoded' as const,
  }

  const mockTravelTimeResult: TravelTimeResult = {
    durationMinutes: 75,
    departureTime: '2024-01-15T09:00:00Z',
    arrivalTime: '2024-01-15T10:15:00Z',
    transfers: 2,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses getDayType to determine cache key', async () => {
    const { getDayType, getOrFetchTravelTime } = await import('@/common/services/transport')
    const { useAuthStore } = await import('@/common/stores/auth')
    const { useSettingsStore } = await import('@/common/stores/settings')

    vi.mocked(useAuthStore).mockImplementation((selector: AnyFunction) =>
      selector({ dataSource: 'demo', user: null, activeOccupationId: null })
    )

    vi.mocked(useSettingsStore).mockImplementation((selector: AnyFunction) =>
      selector({
        homeLocation: mockHomeLocation,
        transportEnabled: true,
        isTransportEnabledForAssociation: () => true,
      })
    )

    vi.mocked(getDayType).mockReturnValue('saturday')
    vi.mocked(getOrFetchTravelTime).mockResolvedValue(mockTravelTimeResult)

    const { result } = renderHook(() => useTravelTime('hall-1', mockHallCoords), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.data).toBeDefined()
    })

    expect(getDayType).toHaveBeenCalled()
    expect(result.current.dayType).toBe('saturday')
  })

  it('accepts date option for day type calculation', async () => {
    const { getDayType, getOrFetchTravelTime } = await import('@/common/services/transport')
    const { useAuthStore } = await import('@/common/stores/auth')
    const { useSettingsStore } = await import('@/common/stores/settings')

    vi.mocked(useAuthStore).mockImplementation((selector: AnyFunction) =>
      selector({ dataSource: 'demo', user: null, activeOccupationId: null })
    )

    vi.mocked(useSettingsStore).mockImplementation((selector: AnyFunction) =>
      selector({
        homeLocation: mockHomeLocation,
        transportEnabled: true,
        isTransportEnabledForAssociation: () => true,
      })
    )

    vi.mocked(getDayType).mockReturnValue('sunday')
    vi.mocked(getOrFetchTravelTime).mockResolvedValue(mockTravelTimeResult)

    const testDate = new Date('2024-01-14') // A Sunday

    const { result } = renderHook(
      () => useTravelTime('hall-1', mockHallCoords, { date: testDate }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.data).toBeDefined()
    })

    expect(getDayType).toHaveBeenCalledWith(testDate)
  })
})

describe('localStorage persistence', () => {
  const mockHallCoords: Coordinates = { latitude: 46.948, longitude: 7.4474 }
  const mockHomeLocation = {
    latitude: 47.3769,
    longitude: 8.5417,
    label: 'Zürich HB',
    source: 'geocoded' as const,
  }

  const mockTravelTimeResult: TravelTimeResult = {
    durationMinutes: 75,
    departureTime: '2024-01-15T09:00:00Z',
    arrivalTime: '2024-01-15T10:15:00Z',
    transfers: 2,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('delegates fetching (cache check, calculation, persistence) to getOrFetchTravelTime', async () => {
    const { getOrFetchTravelTime, getDayType } = await import('@/common/services/transport')
    const { useAuthStore } = await import('@/common/stores/auth')
    const { useSettingsStore } = await import('@/common/stores/settings')

    vi.mocked(useAuthStore).mockImplementation((selector: AnyFunction) =>
      selector({ dataSource: 'demo', user: null, activeOccupationId: null })
    )

    vi.mocked(useSettingsStore).mockImplementation((selector: AnyFunction) =>
      selector({
        homeLocation: mockHomeLocation,
        transportEnabled: true,
        isTransportEnabledForAssociation: () => true,
      })
    )

    vi.mocked(getDayType).mockReturnValue('weekday')
    vi.mocked(getOrFetchTravelTime).mockResolvedValue(mockTravelTimeResult)

    const { result } = renderHook(() => useTravelTime('hall-1', mockHallCoords), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.data).toBeDefined()
    })

    expect(getOrFetchTravelTime).toHaveBeenCalledWith(
      expect.objectContaining({
        hallId: 'hall-1',
        from: { latitude: mockHomeLocation.latitude, longitude: mockHomeLocation.longitude },
        to: mockHallCoords,
        dayType: 'weekday',
        travelMode: 'publicTransport',
        maxBikeDistanceKm: 15,
      })
    )
    expect(result.current.data?.durationMinutes).toBe(75)
  })

  it('provides refresh function that clears cache', async () => {
    const { getCachedTravelTime, removeCachedTravelTime, getOrFetchTravelTime, getDayType } =
      await import('@/common/services/transport')
    const { useAuthStore } = await import('@/common/stores/auth')
    const { useSettingsStore } = await import('@/common/stores/settings')

    vi.mocked(useAuthStore).mockImplementation((selector: AnyFunction) =>
      selector({ dataSource: 'demo', user: null, activeOccupationId: null })
    )

    vi.mocked(useSettingsStore).mockImplementation((selector: AnyFunction) =>
      selector({
        homeLocation: mockHomeLocation,
        transportEnabled: true,
        isTransportEnabledForAssociation: () => true,
      })
    )

    // Set up mocks
    vi.mocked(getDayType).mockReturnValue('weekday')
    vi.mocked(getCachedTravelTime).mockReturnValue(null)
    vi.mocked(getOrFetchTravelTime).mockResolvedValue(mockTravelTimeResult)

    const { result } = renderHook(() => useTravelTime('hall-1', mockHallCoords), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.data).toBeDefined()
    })

    // Call refresh
    result.current.refresh()

    // Should remove from localStorage with the day type
    expect(removeCachedTravelTime).toHaveBeenCalledWith(
      'hall-1',
      expect.any(String),
      expect.stringMatching(/^(weekday|saturday|sunday)$/),
      'publicTransport'
    )
  })
})
