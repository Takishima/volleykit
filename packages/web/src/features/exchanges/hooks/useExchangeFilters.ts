import { useMemo } from 'react'

import { useShallow } from 'zustand/react/shallow'

import type { GameExchange } from '@/api/client'
import { features } from '@/common/config/features'
import { useTravelTimeFilter } from '@/common/hooks/useTravelTimeFilter'
import { useDemoStore } from '@/common/stores/demo'
import { useSettingsStore } from '@/common/stores/settings'
import { calculateCarDistanceKm } from '@/common/utils/distance'
import { extractCoordinates } from '@/common/utils/geo-location'
import {
  useCalendarConflicts,
  hasMinimumGapFromAssignments,
  DEFAULT_SAME_LOCATION_DISTANCE_KM,
} from '@/features/assignments'

import type { ExchangeStatus } from './useExchanges'

export interface ExchangeWithDistance {
  exchange: GameExchange
  carDistanceKm: number | null
}

interface UseExchangeFiltersParams {
  data: GameExchange[] | undefined
  statusFilter: ExchangeStatus
  isDemoMode: boolean
  currentUserIdentity: string | undefined
  hideOwnExchanges: boolean
  showDummyData: boolean
  dummyExchanges: ExchangeWithDistance[] | null
}

export function useExchangeFilters({
  data,
  statusFilter,
  isDemoMode,
  currentUserIdentity,
  hideOwnExchanges,
  showDummyData,
  dummyExchanges,
}: UseExchangeFiltersParams) {
  const { userRefereeLevelGradationValue } = useDemoStore(
    useShallow((state) => ({
      userRefereeLevelGradationValue: state.userRefereeLevelGradationValue,
    }))
  )
  const { homeLocation, distanceFilter, travelTimeFilter, levelFilterEnabled, gameGapFilter } =
    useSettingsStore(
      useShallow((state) => ({
        homeLocation: state.homeLocation,
        distanceFilter: state.distanceFilter,
        travelTimeFilter: state.travelTimeFilter,
        levelFilterEnabled: state.levelFilterEnabled,
        gameGapFilter: state.gameGapFilter,
      }))
    )

  // Get calendar assignments for game gap filtering
  const { assignments: calendarAssignments, hasCalendarCode } = useCalendarConflicts()

  // Get travel time data for exchanges
  const { exchangesWithTravelTime, isAvailable: isTravelTimeAvailable } = useTravelTimeFilter(
    data ?? null
  )

  // Build travel time lookup map once for both filtering and rendering
  const travelTimeMap = useMemo(() => {
    if (!exchangesWithTravelTime)
      return new Map<string, { minutes: number | null; isLoading: boolean }>()
    return new Map(
      exchangesWithTravelTime.map((e) => [
        e.item.__identity,
        { minutes: e.travelTimeMinutes, isLoading: e.isLoading },
      ])
    )
  }, [exchangesWithTravelTime])

  // Calculate car distance for each exchange from user's home location
  const exchangesWithDistance = useMemo(() => {
    if (!data) return null
    if (!homeLocation) return data.map((e) => ({ exchange: e, carDistanceKm: null }))

    return data.map((exchange) => {
      const geoLocation =
        exchange.refereeGame?.game?.hall?.primaryPostalAddress?.geographicalLocation
      const hallCoords = extractCoordinates(geoLocation)

      if (!hallCoords) {
        return { exchange, carDistanceKm: null }
      }

      const homeCoords = { latitude: homeLocation.latitude, longitude: homeLocation.longitude }
      const carDistanceKm = calculateCarDistanceKm(homeCoords, hallCoords)

      return { exchange, carDistanceKm }
    })
  }, [data, homeLocation])

  // Filter exchanges by user's referee level, distance, travel time, game gap, and ownership
  const filteredData = useMemo(() => {
    // When tour is active, show ONLY the dummy exchange
    if (showDummyData) {
      return dummyExchanges
    }

    if (!exchangesWithDistance) return null

    let result = exchangesWithDistance

    // Apply level filter (only on "open" tab in demo mode)
    if (
      levelFilterEnabled &&
      statusFilter === 'open' &&
      isDemoMode &&
      userRefereeLevelGradationValue !== null
    ) {
      result = result.filter(({ exchange }) => {
        const requiredGradationStr = exchange.requiredRefereeLevelGradationValue
        // If no gradation value, show the exchange (conservative approach)
        if (requiredGradationStr === undefined || requiredGradationStr === null) {
          return true
        }
        // Parse string to number for comparison (API returns string)
        const requiredGradation = Number(requiredGradationStr)
        if (isNaN(requiredGradation)) {
          return true
        }
        // User can officiate if their level meets or exceeds required level
        // Lower gradation = higher level, so user.gradation <= required.gradation
        return userRefereeLevelGradationValue <= requiredGradation
      })
    }

    // Apply distance filter (only on "open" tab when home location is set)
    if (distanceFilter.enabled && statusFilter === 'open' && homeLocation) {
      result = result.filter(({ carDistanceKm }) => {
        // If no distance available, include the exchange (conservative)
        if (carDistanceKm === null) return true
        return carDistanceKm <= distanceFilter.maxDistanceKm
      })
    }

    // Apply travel time filter (only on "open" tab when transport is available)
    if (
      travelTimeFilter.enabled &&
      statusFilter === 'open' &&
      isTravelTimeAvailable &&
      travelTimeMap.size > 0
    ) {
      result = result.filter(({ exchange }) => {
        const travelTimeData = travelTimeMap.get(exchange.__identity)
        // If no travel time available, include the exchange (conservative)
        if (travelTimeData?.minutes === null || travelTimeData?.minutes === undefined) return true
        return travelTimeData.minutes <= travelTimeFilter.maxTravelTimeMinutes
      })
    }

    // Apply game gap filter (only on "open" tab when calendar data is available)
    if (
      gameGapFilter.enabled &&
      statusFilter === 'open' &&
      hasCalendarCode &&
      calendarAssignments.length > 0
    ) {
      result = result.filter(({ exchange }) => {
        const gameStartTime = exchange.refereeGame?.game?.startingDateTime
        const geoLocation =
          exchange.refereeGame?.game?.hall?.primaryPostalAddress?.geographicalLocation
        const venueCoordinates = extractCoordinates(geoLocation)

        return hasMinimumGapFromAssignments(gameStartTime, calendarAssignments, {
          minGapMinutes: gameGapFilter.minGapMinutes,
          venueCoordinates,
          sameLocationDistanceKm: DEFAULT_SAME_LOCATION_DISTANCE_KM,
        })
      })
    }

    // Hide user's own exchanges in "open" tab when filter is enabled
    if (hideOwnExchanges && statusFilter === 'open' && currentUserIdentity) {
      result = result.filter(
        ({ exchange }) => exchange.submittedByPerson?.__identity !== currentUserIdentity
      )
    }

    return result
  }, [
    showDummyData,
    dummyExchanges,
    exchangesWithDistance,
    levelFilterEnabled,
    statusFilter,
    isDemoMode,
    userRefereeLevelGradationValue,
    distanceFilter.enabled,
    distanceFilter.maxDistanceKm,
    homeLocation,
    travelTimeFilter.enabled,
    travelTimeFilter.maxTravelTimeMinutes,
    isTravelTimeAvailable,
    travelTimeMap,
    hideOwnExchanges,
    currentUserIdentity,
    gameGapFilter.enabled,
    gameGapFilter.minGapMinutes,
    hasCalendarCode,
    calendarAssignments,
  ])

  // Determine if filters are available
  const isTravelTimeFilterAvailable = features.transport && isTravelTimeAvailable
  const isGameGapFilterAvailable = hasCalendarCode && calendarAssignments.length > 0

  return {
    filteredData,
    travelTimeMap,
    homeLocation,
    isTravelTimeFilterAvailable,
    isGameGapFilterAvailable,
    distanceFilter,
    travelTimeFilter,
    gameGapFilter,
    levelFilterEnabled,
  }
}
