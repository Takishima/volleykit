import { useMemo } from 'react'

import { isTakeableOrOwn } from '@volleykit/shared/utils'
import { useShallow } from 'zustand/react/shallow'

import type { GameExchange } from '@/api/client'
import { features } from '@/common/config/features'
import { useTravelTimeFilter } from '@/common/hooks/useTravelTimeFilter'
import type { TravelMode } from '@/common/services/transport'
import { useDemoStore } from '@/common/stores/demo'
import { useSettingsStore } from '@/common/stores/settings'
import { calculateCarDistanceKm } from '@/common/utils/distance'
import { extractCoordinates } from '@/common/utils/geo-location'
import { useCalendarConflicts } from '@/features/assignments/hooks/useCalendarConflicts'
import {
  hasMinimumGapFromAssignments,
  DEFAULT_SAME_LOCATION_DISTANCE_KM,
} from '@/features/assignments/utils/conflict-detection'

import type { ExchangeStatus } from './useExchanges'

export interface ExchangeWithDistance {
  exchange: GameExchange
  carDistanceKm: number | null
  /**
   * False when the association refuses to hand the entry to the signed-in
   * referee. Own entries read as takeable: they must stay removable.
   */
  takeable: boolean
}

interface UseExchangeFiltersParams {
  data: GameExchange[] | undefined
  statusFilter: ExchangeStatus
  isDemoMode: boolean
  currentUserIdentity: string | undefined
  hideOwnExchanges: boolean
  hideNotTakeableExchanges: boolean
  showDummyData: boolean
  dummyExchanges: ExchangeWithDistance[] | null
}

export function useExchangeFilters({
  data,
  statusFilter,
  isDemoMode,
  currentUserIdentity,
  hideOwnExchanges,
  hideNotTakeableExchanges,
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
      return new Map<
        string,
        { minutes: number | null; travelMode: TravelMode | undefined; isLoading: boolean }
      >()
    return new Map(
      exchangesWithTravelTime.map((e) => [
        e.item.__identity,
        { minutes: e.travelTimeMinutes, travelMode: e.travelMode, isLoading: e.isLoading },
      ])
    )
  }, [exchangesWithTravelTime])

  // Calculate car distance for each exchange from user's home location, and
  // record the server's take-over verdict so the list can mark blocked entries
  // when they are shown rather than hidden.
  const exchangesWithDistance = useMemo((): ExchangeWithDistance[] | null => {
    if (!data) return null

    return data.map((exchange) => {
      const takeable = isTakeableOrOwn(exchange, currentUserIdentity)
      const geoLocation =
        exchange.refereeGame?.game?.hall?.primaryPostalAddress?.geographicalLocation
      const hallCoords = homeLocation ? extractCoordinates(geoLocation) : null

      if (!homeLocation || !hallCoords) {
        return { exchange, carDistanceKm: null, takeable }
      }

      const homeCoords = { latitude: homeLocation.latitude, longitude: homeLocation.longitude }
      const carDistanceKm = calculateCarDistanceKm(homeCoords, hallCoords)

      return { exchange, carDistanceKm, takeable }
    })
  }, [data, homeLocation, currentUserIdentity])

  // Filter exchanges by user's referee level, distance, travel time, game gap, and ownership.
  // Also reports how many entries were hidden because the server refuses to hand
  // them over, so the page can say so instead of claiming the marketplace is empty.
  const { filteredData, notTakeableCount } = useMemo(() => {
    let hiddenCount = 0

    // When tour is active, show ONLY the dummy exchange
    if (showDummyData) {
      return { filteredData: dummyExchanges, notTakeableCount: hiddenCount }
    }

    if (!exchangesWithDistance) return { filteredData: null, notTakeableCount: hiddenCount }

    let result = exchangesWithDistance

    // Hide entries the server refuses to hand over on the "open" tab, unless the
    // referee asked to see them (they then render as blocked). Own entries are
    // kept either way: they carry the same flag but must stay removable.
    // Runs first so the count describes the marketplace rather than whatever
    // the level, distance, travel time and gap filters happened to leave.
    //
    // Mobile gets its number from the shared `useExchanges`, which always hides
    // and counts over the raw entries; web has its own fetch hook and a wrapper
    // type, so it repeats the arithmetic here. Both count the full fetched list,
    // and the predicate itself is shared - keep it that way if either side moves.
    if (hideNotTakeableExchanges && statusFilter === 'open') {
      const takeable = result.filter((entry) => entry.takeable)
      hiddenCount = result.length - takeable.length
      result = takeable
    }

    // Apply level filter (only on "open" tab in demo mode)
    if (
      levelFilterEnabled &&
      statusFilter === 'open' &&
      isDemoMode &&
      userRefereeLevelGradationValue !== null
    ) {
      result = result.filter(({ exchange }) => {
        // The schema passes the field through untouched, so the runtime value can
        // be null even though the generated type only says `string | undefined`.
        const requiredGradationStr = exchange.requiredRefereeLevelGradationValue as
          string | null | undefined
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

    return { filteredData: result, notTakeableCount: hiddenCount }
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
    hideNotTakeableExchanges,
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
    notTakeableCount,
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
