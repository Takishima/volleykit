import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import type { GameExchange } from '@/api/client'
import type { SettingsState } from '@/common/stores/settings/types'
import { createMockExchange } from '@/test/exchange-factory'

import { useExchangeFilters } from './useExchangeFilters'

const mockActiveAssociation = vi.fn<() => string | undefined>(() => 'SV')
vi.mock('@/common/hooks/useActiveAssociation', () => ({
  useActiveAssociationCode: () => mockActiveAssociation(),
}))

vi.mock('@/common/stores/demo', () => ({
  useDemoStore: (selector: (state: unknown) => unknown) =>
    selector({ userRefereeLevelGradationValue: null }),
}))

type TravelTimeEntry = { item: GameExchange; travelTimeMinutes: number | null }
let travelTimes: TravelTimeEntry[] | null = null
vi.mock('@/common/hooks/useTravelTimeFilter', () => ({
  useTravelTimeFilter: () => ({
    exchangesWithTravelTime: travelTimes?.map((e) => ({
      ...e,
      travelMode: 'publicTransport',
      isLoading: false,
    })),
    isAvailable: travelTimes !== null,
  }),
}))

vi.mock('@/features/assignments/hooks/useCalendarConflicts', () => ({
  useCalendarConflicts: () => ({ assignments: [], hasCalendarCode: false }),
}))

let settingsState: Partial<SettingsState>
vi.mock('@/common/stores/settings', () => ({
  useSettingsStore: (selector: (state: Partial<SettingsState>) => unknown) =>
    selector(settingsState),
}))

// Bern (home) to Zurich (hall) is roughly 95 km by straight line, ~115 km by car.
const HOME = { latitude: 46.948, longitude: 7.4474, label: 'Bern', source: 'geocoded' as const }
const ZURICH_HALL = { latitude: 47.3769, longitude: 8.5417 }

function exchangeAt(id: string, geographicalLocation: { latitude: number; longitude: number }) {
  return createMockExchange({
    __identity: id,
    refereeGame: {
      game: {
        hall: { name: id, primaryPostalAddress: { geographicalLocation } },
      },
    },
  })
}

function renderFilters(data: GameExchange[]) {
  return renderHook(() =>
    useExchangeFilters({
      data,
      statusFilter: 'open',
      isDemoMode: false,
      currentUserIdentity: 'me',
      hideOwnExchanges: false,
      hideNotTakeableExchanges: false,
      showDummyData: false,
      dummyExchanges: null,
    })
  )
}

describe('useExchangeFilters per-association thresholds', () => {
  beforeEach(() => {
    mockActiveAssociation.mockReturnValue('SV')
    travelTimes = null
    settingsState = {
      homeLocation: HOME,
      distanceFilter: { enabled: true, maxDistanceKm: 200 },
      distanceFilterByAssociation: { SV: { enabled: true, maxDistanceKm: 50 } },
      travelTimeFilter: {
        enabled: false,
        maxTravelTimeMinutes: 120,
        maxTravelTimeByAssociation: {},
        arrivalBufferMinutes: 30,
        arrivalBufferByAssociation: {},
        cacheInvalidatedAt: null,
        sbbDestinationType: 'address',
        travelMode: 'publicTransport',
        maxBikeDistanceKm: 15,
      },
      levelFilterEnabled: false,
      gameGapFilter: { enabled: false, minGapMinutes: 120 },
    }
  })

  it('filters with the active association override, not the global value', () => {
    const { result } = renderFilters([exchangeAt('zurich', ZURICH_HALL)])

    // 50 km override for SV hides the ~115 km trip even though the global limit is 200 km
    expect(result.current.filteredData).toEqual([])
  })

  it('falls back to the global value for associations without an override', () => {
    mockActiveAssociation.mockReturnValue('SVRZ')

    const { result } = renderFilters([exchangeAt('zurich', ZURICH_HALL)])

    expect(result.current.filteredData?.map((e) => e.exchange.__identity)).toEqual(['zurich'])
  })

  describe('travel time', () => {
    beforeEach(() => {
      settingsState.distanceFilter = { enabled: false, maxDistanceKm: 200 }
      settingsState.travelTimeFilter = {
        ...settingsState.travelTimeFilter!,
        enabled: true,
        maxTravelTimeMinutes: 120,
        maxTravelTimeByAssociation: { SV: 60 },
      }
    })

    it('filters with the active association override, not the global value', () => {
      const exchange = exchangeAt('zurich', ZURICH_HALL)
      travelTimes = [{ item: exchange, travelTimeMinutes: 90 }]

      const { result } = renderFilters([exchange])

      // 60 min override for SV hides the 90 min trip even though the global limit is 120 min
      expect(result.current.filteredData).toEqual([])
    })

    it('falls back to the global value for associations without an override', () => {
      mockActiveAssociation.mockReturnValue('SVRZ')
      const exchange = exchangeAt('zurich', ZURICH_HALL)
      travelTimes = [{ item: exchange, travelTimeMinutes: 90 }]

      const { result } = renderFilters([exchange])

      expect(result.current.filteredData?.map((e) => e.exchange.__identity)).toEqual(['zurich'])
    })
  })
})
