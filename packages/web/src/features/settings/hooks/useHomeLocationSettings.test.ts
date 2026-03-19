import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { getGeolocationErrorMessage, useHomeLocationSettings } from './useHomeLocationSettings'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFunction = (...args: any[]) => any

// Mock dependencies
vi.mock('@/shared/stores/settings', () => ({
  useSettingsStore: vi.fn(),
}))

vi.mock('@/shared/hooks/useGeolocation', () => ({
  useGeolocation: vi.fn(),
}))

vi.mock('@/shared/hooks/useCombinedGeocode', () => ({
  useCombinedGeocode: vi.fn(),
}))

vi.mock('@/shared/hooks/useDebouncedValue', () => ({
  useDebouncedValue: vi.fn((value: string) => value),
}))

const mockT = vi.fn((key: string) => key)

async function getSettingsStore() {
  const { useSettingsStore } = await import('@/shared/stores/settings')
  return useSettingsStore
}

async function getGeolocation() {
  const { useGeolocation } = await import('@/shared/hooks/useGeolocation')
  return useGeolocation
}

async function getGeocode() {
  const { useCombinedGeocode } = await import('@/shared/hooks/useCombinedGeocode')
  return useCombinedGeocode
}

async function getDebouncedValue() {
  const { useDebouncedValue } = await import('@/shared/hooks/useDebouncedValue')
  return useDebouncedValue
}

describe('getGeolocationErrorMessage', () => {
  it('returns permission denied message for permission_denied error', () => {
    const result = getGeolocationErrorMessage('permission_denied', mockT)
    expect(mockT).toHaveBeenCalledWith('settings.homeLocation.errorPermissionDenied')
    expect(result).toBe('settings.homeLocation.errorPermissionDenied')
  })

  it('returns position unavailable message for position_unavailable error', () => {
    const result = getGeolocationErrorMessage('position_unavailable', mockT)
    expect(mockT).toHaveBeenCalledWith('settings.homeLocation.errorPositionUnavailable')
    expect(result).toBe('settings.homeLocation.errorPositionUnavailable')
  })

  it('returns timeout message for timeout error', () => {
    const result = getGeolocationErrorMessage('timeout', mockT)
    expect(mockT).toHaveBeenCalledWith('settings.homeLocation.errorTimeout')
    expect(result).toBe('settings.homeLocation.errorTimeout')
  })

  it('returns unknown error message for unrecognized errors', () => {
    const result = getGeolocationErrorMessage('some_other_error', mockT)
    expect(mockT).toHaveBeenCalledWith('settings.homeLocation.errorUnknown')
    expect(result).toBe('settings.homeLocation.errorUnknown')
  })
})

describe('useHomeLocationSettings', () => {
  const mockSetHomeLocation = vi.fn()
  const mockRequestLocation = vi.fn()
  const mockGeocodeSearch = vi.fn()
  const mockGeocodeClear = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  async function setupMocks(
    options: {
      homeLocation?: { latitude: number; longitude: number; label: string } | null
      geoLoading?: boolean
      geoError?: string | null
      geoSupported?: boolean
      geocodeResults?: Array<{ latitude: number; longitude: number; displayName: string }>
      geocodeLoading?: boolean
      geocodeError?: string | null
    } = {}
  ) {
    const useSettingsStore = await getSettingsStore()
    const useGeolocation = await getGeolocation()
    const useCombinedGeocode = await getGeocode()

    vi.mocked(useSettingsStore).mockImplementation((selector: AnyFunction) =>
      selector({
        homeLocation: options.homeLocation ?? null,
        setHomeLocation: mockSetHomeLocation,
      })
    )

    vi.mocked(useGeolocation).mockReturnValue({
      position: null,
      isLoading: options.geoLoading ?? false,
      error: options.geoError ?? null,
      isSupported: options.geoSupported ?? true,
      requestLocation: mockRequestLocation,
      clear: vi.fn(),
    })

    vi.mocked(useCombinedGeocode).mockReturnValue({
      results: (options.geocodeResults ?? []).map((r, i) => ({
        ...r,
        id: i + 1,
        source: 'swiss' as const,
      })),
      isLoading: options.geocodeLoading ?? false,
      error: options.geocodeError ?? null,
      search: mockGeocodeSearch,
      clear: mockGeocodeClear,
    })
  }

  it('returns initial state with no home location', async () => {
    await setupMocks()

    const { result } = renderHook(() => useHomeLocationSettings({ t: mockT }))

    expect(result.current.homeLocation).toBeNull()
    expect(result.current.addressQuery).toBe('')
    expect(result.current.geoSupported).toBe(true)
    expect(result.current.geoLoading).toBe(false)
    expect(result.current.geoError).toBeNull()
  })

  it('returns existing home location from store', async () => {
    const location = { latitude: 47.38, longitude: 8.54, label: 'Zurich' }
    await setupMocks({ homeLocation: location })

    const { result } = renderHook(() => useHomeLocationSettings({ t: mockT }))

    expect(result.current.homeLocation).toEqual(location)
  })

  it('provides geolocation loading state', async () => {
    await setupMocks({ geoLoading: true })

    const { result } = renderHook(() => useHomeLocationSettings({ t: mockT }))

    expect(result.current.geoLoading).toBe(true)
  })

  it('provides geolocation error state', async () => {
    await setupMocks({ geoError: 'permission_denied' })

    const { result } = renderHook(() => useHomeLocationSettings({ t: mockT }))

    expect(result.current.geoError).toBe('permission_denied')
  })

  it('provides geolocation support state', async () => {
    await setupMocks({ geoSupported: false })

    const { result } = renderHook(() => useHomeLocationSettings({ t: mockT }))

    expect(result.current.geoSupported).toBe(false)
  })

  it('handles address input change', async () => {
    await setupMocks()

    const { result } = renderHook(() => useHomeLocationSettings({ t: mockT }))

    act(() => {
      result.current.handleAddressChange({
        target: { value: 'Zurich' },
      } as React.ChangeEvent<HTMLInputElement>)
    })

    expect(result.current.addressQuery).toBe('Zurich')
  })

  it('clears home location', async () => {
    const location = { latitude: 47.38, longitude: 8.54, label: 'Zurich' }
    await setupMocks({ homeLocation: location })

    const { result } = renderHook(() => useHomeLocationSettings({ t: mockT }))

    act(() => {
      result.current.handleClearLocation()
    })

    expect(mockSetHomeLocation).toHaveBeenCalledWith(null)
  })

  it('selects geocoded location', async () => {
    await setupMocks({
      geocodeResults: [{ latitude: 47.38, longitude: 8.54, displayName: 'Zurich, Switzerland' }],
    })

    const { result } = renderHook(() => useHomeLocationSettings({ t: mockT }))

    act(() => {
      result.current.handleSelectGeocodedLocation({
        latitude: 47.38,
        longitude: 8.54,
        displayName: 'Zurich, Switzerland',
      })
    })

    expect(mockSetHomeLocation).toHaveBeenCalledWith({
      latitude: 47.38,
      longitude: 8.54,
      label: 'Zurich, Switzerland',
      source: 'geocoded',
    })
    expect(mockGeocodeClear).toHaveBeenCalled()
  })

  it('triggers geocode search when debounced query meets minimum length', async () => {
    const useDebouncedValue = await getDebouncedValue()
    vi.mocked(useDebouncedValue).mockReturnValue('Zur')
    await setupMocks()

    renderHook(() => useHomeLocationSettings({ t: mockT }))

    await waitFor(() => {
      expect(mockGeocodeSearch).toHaveBeenCalledWith('Zur')
    })
  })

  it('clears geocode results when query is too short', async () => {
    const useDebouncedValue = await getDebouncedValue()
    vi.mocked(useDebouncedValue).mockReturnValue('Zu')
    await setupMocks()

    renderHook(() => useHomeLocationSettings({ t: mockT }))

    await waitFor(() => {
      expect(mockGeocodeClear).toHaveBeenCalled()
    })
  })

  it('exposes requestLocation function', async () => {
    await setupMocks()

    const { result } = renderHook(() => useHomeLocationSettings({ t: mockT }))

    expect(result.current.requestLocation).toBe(mockRequestLocation)
  })

  it('provides minimum search length constant', async () => {
    await setupMocks()

    const { result } = renderHook(() => useHomeLocationSettings({ t: mockT }))

    expect(result.current.minSearchLength).toBe(3)
  })

  it('provides geocode results', async () => {
    const inputResults = [
      { latitude: 47.38, longitude: 8.54, displayName: 'Zurich' },
      { latitude: 46.95, longitude: 7.45, displayName: 'Bern' },
    ]
    await setupMocks({ geocodeResults: inputResults })

    const { result } = renderHook(() => useHomeLocationSettings({ t: mockT }))

    // Results include id and source added by the mock
    expect(result.current.geocodeResults).toHaveLength(2)
    expect(result.current.geocodeResults[0]).toMatchObject({
      latitude: 47.38,
      longitude: 8.54,
      displayName: 'Zurich',
    })
    expect(result.current.geocodeResults[1]).toMatchObject({
      latitude: 46.95,
      longitude: 7.45,
      displayName: 'Bern',
    })
  })

  it('provides geocode loading state', async () => {
    await setupMocks({ geocodeLoading: true })

    const { result } = renderHook(() => useHomeLocationSettings({ t: mockT }))

    expect(result.current.geocodeLoading).toBe(true)
  })

  it('provides geocode error state', async () => {
    await setupMocks({ geocodeError: 'Network error' })

    const { result } = renderHook(() => useHomeLocationSettings({ t: mockT }))

    expect(result.current.geocodeError).toBe('Network error')
  })
})
