/**
 * Hook for filtering exchanges by travel time.
 */

import { useMemo, useCallback } from 'react'

import { useQueries } from '@tanstack/react-query'

import type { GameExchange } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import { useActiveAssociationCode } from '@/features/auth/hooks/useActiveAssociation'
import {
  calculateTravelTime,
  calculateMockTravelTime,
  isOjpConfigured,
  hashLocation,
  getDayType,
  getCachedTravelTime,
  setCachedTravelTime,
  TRAVEL_TIME_STALE_TIME,
  TRAVEL_TIME_GC_TIME,
  type Coordinates,
  type TravelTimeResult,
} from '@/shared/services/transport'
import { useAuthStore } from '@/shared/stores/auth'
import { useSettingsStore, getDefaultArrivalBuffer } from '@/shared/stores/settings'
import { MS_PER_SECOND, MS_PER_MINUTE } from '@/shared/utils/constants'
import { extractCoordinates } from '@/shared/utils/geo-location'

/** Maximum retry delay in seconds for failed travel time queries */
const MAX_RETRY_DELAY_SECONDS = 30

interface HallInfo {
  id: string
  coords: Coordinates | null
  /** Game start time for optimal connection selection */
  gameStartTime: Date | null
}

interface ExchangeWithTravelTime<T> {
  item: T
  travelTimeMinutes: number | null
  isLoading: boolean
  isError: boolean
}

/**
 * Extract hall information from a game exchange.
 */
function getHallInfo(exchange: GameExchange): HallInfo | null {
  const hall = exchange.refereeGame?.game?.hall
  if (!hall?.__identity) return null

  const geoLocation = hall.primaryPostalAddress?.geographicalLocation
  const coords = extractCoordinates(geoLocation)

  // Extract game start time for optimal connection selection
  const startingDateTime = exchange.refereeGame?.game?.startingDateTime
  const gameStartTime = startingDateTime ? new Date(startingDateTime) : null

  return {
    id: hall.__identity,
    coords,
    gameStartTime,
  }
}

/**
 * Hook to calculate and filter travel times for a list of exchanges.
 *
 * @param exchanges List of exchanges to calculate travel times for
 * @returns Object with travel time data for each exchange and filter helper
 */
export function useTravelTimeFilter<T extends GameExchange>(exchanges: T[] | null) {
  const dataSource = useAuthStore((state) => state.dataSource)
  const isDemoMode = dataSource === 'demo'
  const homeLocation = useSettingsStore((state) => state.homeLocation)
  const transportEnabled = useSettingsStore((state) => state.transportEnabled)
  const transportEnabledByAssociation = useSettingsStore(
    (state) => state.transportEnabledByAssociation
  )
  // Select individual properties to prevent infinite re-renders from object reference changes
  const travelTimeFilterEnabled = useSettingsStore((state) => state.travelTimeFilter.enabled)
  const maxTravelTimeMinutes = useSettingsStore(
    (state) => state.travelTimeFilter.maxTravelTimeMinutes
  )
  const arrivalBufferByAssociation = useSettingsStore(
    (state) => state.travelTimeFilter.arrivalBufferByAssociation
  )
  const associationCode = useActiveAssociationCode()

  // Check if transport is enabled for current association
  // Use per-association setting if available, otherwise fall back to global
  const isTransportEnabled = useMemo(() => {
    const enabledMap = transportEnabledByAssociation ?? {}
    if (associationCode && enabledMap[associationCode] !== undefined) {
      return enabledMap[associationCode]
    }
    return transportEnabled
  }, [associationCode, transportEnabledByAssociation, transportEnabled])

  // Get arrival buffer for current association
  const arrivalBufferMinutes = useMemo(() => {
    const bufferMap = arrivalBufferByAssociation ?? {}
    if (associationCode && bufferMap[associationCode] !== undefined) {
      return bufferMap[associationCode]
    }
    return getDefaultArrivalBuffer(associationCode)
  }, [associationCode, arrivalBufferByAssociation])

  // Get unique halls to query
  const hallInfos = useMemo(() => {
    if (!exchanges) return []

    const seen = new Set<string>()
    const result: (HallInfo & { exchange: T })[] = []

    for (const exchange of exchanges) {
      const hallInfo = getHallInfo(exchange)
      if (hallInfo && !seen.has(hallInfo.id)) {
        seen.add(hallInfo.id)
        result.push({ ...hallInfo, exchange })
      }
    }

    return result
  }, [exchanges])

  // Home location hash for cache key stability
  const homeLocationHash = homeLocation ? hashLocation(homeLocation) : null

  // Determine day type for caching (based on today)
  const dayType = getDayType()

  // Check if we should fetch travel times
  const canFetch = Boolean(isTransportEnabled && homeLocation && (isDemoMode || isOjpConfigured()))

  // Create queries for each unique hall
  const queries = useQueries({
    queries: hallInfos.map((hallInfo) => ({
      queryKey: queryKeys.travelTime.hall(hallInfo.id, homeLocationHash ?? '', dayType),
      queryFn: async (): Promise<TravelTimeResult> => {
        if (!homeLocation || !hallInfo.coords) {
          throw new Error('Missing location data')
        }

        // Check localStorage cache first
        const cached = getCachedTravelTime(hallInfo.id, homeLocationHash ?? '', dayType)
        if (cached) {
          return cached
        }

        const fromCoords: Coordinates = {
          latitude: homeLocation.latitude,
          longitude: homeLocation.longitude,
        }

        // Calculate target arrival time (game start minus buffer from settings)
        const arrivalBufferMs = arrivalBufferMinutes * MS_PER_MINUTE
        const targetArrivalTime = hallInfo.gameStartTime
          ? new Date(hallInfo.gameStartTime.getTime() - arrivalBufferMs)
          : undefined

        let result: TravelTimeResult
        if (isDemoMode) {
          result = await calculateMockTravelTime(fromCoords, hallInfo.coords)
        } else {
          result = await calculateTravelTime(fromCoords, hallInfo.coords, {
            targetArrivalTime,
          })
        }

        // Persist to localStorage
        setCachedTravelTime(hallInfo.id, homeLocationHash ?? '', dayType, result)

        return result
      },
      enabled: canFetch && hallInfo.coords !== null,
      staleTime: TRAVEL_TIME_STALE_TIME,
      gcTime: TRAVEL_TIME_GC_TIME,
      refetchOnWindowFocus: false,
      retry: 3,
      retryDelay: (attempt: number) =>
        Math.min(MS_PER_SECOND * 2 ** attempt, MAX_RETRY_DELAY_SECONDS * MS_PER_SECOND),
    })),
  })

  // Build a map of hall ID -> travel time result
  // Uses explicit ID matching instead of index correlation for robustness
  const travelTimeMap = useMemo(() => {
    const map = new Map<string, { minutes: number | null; isLoading: boolean; isError: boolean }>()

    // Create a lookup from query key to result
    const queryByHallId = new Map<string, (typeof queries)[number]>()
    queries.forEach((query, index) => {
      const hallInfo = hallInfos[index]
      if (hallInfo) {
        queryByHallId.set(hallInfo.id, query)
      }
    })

    // Build the result map using explicit ID matching
    hallInfos.forEach((hallInfo) => {
      const query = queryByHallId.get(hallInfo.id)
      map.set(hallInfo.id, {
        minutes: query?.data?.durationMinutes ?? null,
        isLoading: query?.isLoading ?? false,
        isError: query?.isError ?? false,
      })
    })

    return map
  }, [hallInfos, queries])

  // Enrich exchanges with travel time data
  const exchangesWithTravelTime: ExchangeWithTravelTime<T>[] | null = useMemo(() => {
    if (!exchanges) return null

    return exchanges.map((exchange) => {
      const hallInfo = getHallInfo(exchange)
      const travelTimeData = hallInfo ? travelTimeMap.get(hallInfo.id) : null

      return {
        item: exchange,
        travelTimeMinutes: travelTimeData?.minutes ?? null,
        isLoading: travelTimeData?.isLoading ?? false,
        isError: travelTimeData?.isError ?? false,
      }
    })
  }, [exchanges, travelTimeMap])

  // Filter function that can be applied to exchanges
  const filterByTravelTime = useCallback(
    (exchangeWithTravelTime: ExchangeWithTravelTime<T>): boolean => {
      // If filtering is disabled, include all
      if (!travelTimeFilterEnabled) return true

      // If no travel time available, include (conservative approach)
      if (exchangeWithTravelTime.travelTimeMinutes === null) return true

      // Apply the filter
      return exchangeWithTravelTime.travelTimeMinutes <= maxTravelTimeMinutes
    },
    [travelTimeFilterEnabled, maxTravelTimeMinutes]
  )

  // Get filtered list
  const filteredExchanges = useMemo(() => {
    if (!exchangesWithTravelTime) return null
    return exchangesWithTravelTime.filter(filterByTravelTime)
  }, [exchangesWithTravelTime, filterByTravelTime])

  // Check if any travel times are loading
  const isLoadingAny = queries.some((q) => q.isLoading)

  return {
    /** Exchanges enriched with travel time data */
    exchangesWithTravelTime,
    /** Exchanges filtered by travel time (if filter is enabled) */
    filteredExchanges,
    /** Whether any travel time queries are loading */
    isLoading: isLoadingAny,
    /** Filter function to apply manually */
    filterByTravelTime,
    /** Whether travel time filtering is available */
    isAvailable: canFetch,
  }
}
