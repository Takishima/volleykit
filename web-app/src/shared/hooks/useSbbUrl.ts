/**
 * Hook for generating SBB URLs with station IDs from OJP trip data.
 * Fetches trip data on demand and caches results.
 */

import { useState, useCallback } from 'react'

import { useActiveAssociationCode } from '@/features/auth/hooks/useActiveAssociation'
import type { Locale } from '@/i18n'
import {
  calculateTravelTime,
  calculateMockTravelTime,
  isOjpConfigured,
  hashLocation,
  getDayType,
  getCachedTravelTime,
  setCachedTravelTime,
  type Coordinates,
  type StationInfo,
  type TravelTimeResult,
} from '@/shared/services/transport'
import { useAuthStore } from '@/shared/stores/auth'
import {
  useSettingsStore,
  type SbbDestinationType,
  type UserLocation,
} from '@/shared/stores/settings'
import {
  generateSbbUrl,
  calculateArrivalTime,
  openSbbUrl,
  type SbbUrlParams,
} from '@/shared/utils/sbb-url'

/** Milliseconds per minute for time calculations */
const MS_PER_MINUTE = 60000

interface UseSbbUrlOptions {
  /** Hall coordinates for routing */
  hallCoords: Coordinates | null
  /** Hall ID for caching */
  hallId: string | undefined
  /** City name as fallback destination */
  city: string | undefined
  /** Full hall address for final destination (e.g., "Sporthalle, Hauptstrasse 1, 8000 Zürich") */
  hallAddress: string | null | undefined
  /** Game start time */
  gameStartTime: string | undefined
  /** Language for the URL */
  language: Locale
}

interface UseSbbUrlResult {
  /** Whether trip data is being fetched */
  isLoading: boolean
  /** Error from fetching trip data */
  error: Error | null
  /** Cached origin station info (if available) */
  originStation: StationInfo | undefined
  /** Cached destination station info (if available) */
  destinationStation: StationInfo | undefined
  /** Open the SBB connection in a new tab, fetching trip data if needed */
  openSbbConnection: () => Promise<void>
}

/**
 * Calculate arrival time, adjusting for walking time when routing to station only.
 */
function getAdjustedArrivalTime(
  gameDate: Date,
  arrivalBuffer: number,
  routeToStation: boolean,
  walkingMinutes: number
): Date {
  const baseArrivalTime = calculateArrivalTime(gameDate, arrivalBuffer)
  if (routeToStation && walkingMinutes > 0) {
    return new Date(baseArrivalTime.getTime() - walkingMinutes * MS_PER_MINUTE)
  }
  return baseArrivalTime
}

/**
 * Build SBB URL parameters from context.
 */
function buildSbbUrlParams(
  city: string,
  gameDate: Date,
  arrivalTime: Date,
  language: Locale,
  originAddress: string | undefined,
  destAddress: string | undefined,
  originStation?: StationInfo,
  destinationStation?: StationInfo
): SbbUrlParams {
  return {
    destination: city,
    date: gameDate,
    arrivalTime,
    language,
    originStation,
    destinationStation,
    originAddress,
    destinationAddress: destAddress,
  }
}

/**
 * Fetch or retrieve cached trip data.
 */
async function fetchTripData(
  homeLocation: UserLocation,
  hallCoords: Coordinates,
  hallId: string,
  gameDate: Date,
  city: string,
  arrivalTime: Date
): Promise<TravelTimeResult> {
  const homeLocationHash = hashLocation(homeLocation)
  const dayType = getDayType(gameDate)

  // Check cache first
  const cachedResult = getCachedTravelTime(hallId, homeLocationHash, dayType)
  if (cachedResult) {
    return cachedResult
  }

  // Fetch trip data
  const fromCoords: Coordinates = {
    latitude: homeLocation.latitude,
    longitude: homeLocation.longitude,
  }

  let tripResult: TravelTimeResult
  if (isOjpConfigured()) {
    tripResult = await calculateTravelTime(fromCoords, hallCoords, {
      targetArrivalTime: arrivalTime,
    })
  } else {
    tripResult = await calculateMockTravelTime(fromCoords, hallCoords, {
      originLabel: 'Home',
      destinationLabel: city,
    })
  }

  // Cache the result
  setCachedTravelTime(hallId, homeLocationHash, dayType, tripResult)
  return tripResult
}

/**
 * Hook to generate and open SBB URLs with proper station IDs.
 * Fetches trip data on demand and caches results.
 */
export function useSbbUrl(options: UseSbbUrlOptions): UseSbbUrlResult {
  const { hallCoords, hallId, city, hallAddress, gameStartTime, language } = options

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [originStation, setOriginStation] = useState<StationInfo | undefined>()
  const [destinationStation, setDestinationStation] = useState<StationInfo | undefined>()
  const [finalWalkingMinutes, setFinalWalkingMinutes] = useState<number>(0)

  const dataSource = useAuthStore((state) => state.dataSource)
  const isDemoMode = dataSource === 'demo'
  const homeLocation = useSettingsStore((state) => state.homeLocation)
  const associationCode = useActiveAssociationCode()
  const arrivalBuffer = useSettingsStore((state) =>
    state.getArrivalBufferForAssociation(associationCode)
  )
  const sbbDestinationType = useSettingsStore(
    (state) => state.travelTimeFilter.sbbDestinationType ?? 'address'
  ) as SbbDestinationType

  const openSbbConnection = useCallback(async () => {
    if (!city || !gameStartTime) {
      return
    }

    const gameDate = new Date(gameStartTime)
    const routeToStation = sbbDestinationType === 'station'
    const destAddress = routeToStation ? undefined : (hallAddress ?? undefined)
    const originAddress = homeLocation?.source === 'geocoded' ? homeLocation.label : undefined
    const arrivalTime = getAdjustedArrivalTime(
      gameDate,
      arrivalBuffer,
      routeToStation,
      finalWalkingMinutes
    )

    // If we already have cached station info, use it directly
    if (originStation && destinationStation) {
      const params = buildSbbUrlParams(
        city,
        gameDate,
        arrivalTime,
        language,
        originAddress,
        destAddress,
        originStation,
        destinationStation
      )
      openSbbUrl(generateSbbUrl(params))
      return
    }

    // Check if we can fetch trip data
    const canFetchTrip = homeLocation && hallCoords && hallId && (isDemoMode || isOjpConfigured())

    if (!canFetchTrip) {
      // No trip data available, use city name and address fallbacks
      const params = buildSbbUrlParams(
        city,
        gameDate,
        arrivalTime,
        language,
        originAddress,
        destAddress
      )
      openSbbUrl(generateSbbUrl(params))
      return
    }

    // Fetch trip data
    setIsLoading(true)
    setError(null)

    try {
      const tripResult = await fetchTripData(
        homeLocation,
        hallCoords,
        hallId,
        gameDate,
        city,
        arrivalTime
      )

      // Update state with station info for future clicks
      if (tripResult.originStation) setOriginStation(tripResult.originStation)
      if (tripResult.destinationStation) setDestinationStation(tripResult.destinationStation)
      if (tripResult.finalWalkingMinutes !== undefined)
        setFinalWalkingMinutes(tripResult.finalWalkingMinutes)

      // Recalculate arrival time with actual walking minutes if routing to station
      const walkingMinutes = tripResult.finalWalkingMinutes ?? 0
      const urlArrivalTime = getAdjustedArrivalTime(
        gameDate,
        arrivalBuffer,
        routeToStation,
        walkingMinutes
      )

      const params = buildSbbUrlParams(
        city,
        gameDate,
        urlArrivalTime,
        language,
        originAddress,
        destAddress,
        tripResult.originStation,
        tripResult.destinationStation
      )
      openSbbUrl(generateSbbUrl(params))
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch trip data'))
      // Fall back to URL without station ID
      const params = buildSbbUrlParams(
        city,
        gameDate,
        arrivalTime,
        language,
        originAddress,
        destAddress
      )
      openSbbUrl(generateSbbUrl(params))
    } finally {
      setIsLoading(false)
    }
  }, [
    city,
    hallAddress,
    gameStartTime,
    arrivalBuffer,
    originStation,
    destinationStation,
    finalWalkingMinutes,
    sbbDestinationType,
    language,
    homeLocation,
    hallCoords,
    hallId,
    isDemoMode,
  ])

  return {
    isLoading,
    error,
    originStation,
    destinationStation,
    openSbbConnection,
  }
}
