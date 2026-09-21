/**
 * Cache-through travel time fetch shared by all travel-time call sites
 * (useTravelTime, useTravelTimeFilter, useSbbUrl).
 *
 * Encapsulates: localStorage cache check → OJP or mock calculation →
 * localStorage cache write, keyed by hall, home location, day type and
 * travel mode.
 */

import { getTravelModeKey } from './cache'
import { calculateMockTravelTime } from './mock-transport'
import { calculateTravelTime } from './ojp-client'
import { getCachedTravelTime, setCachedTravelTime } from './persistence'

import type { DayType } from './cache'
import type { Coordinates, TravelMode, TravelTimeResult } from './types'

export interface GetOrFetchTravelTimeParams {
  /** Sports hall ID (cache key component) */
  hallId: string
  /** Origin coordinates (user's home location) */
  from: Coordinates
  /** Destination coordinates (sports hall) */
  to: Coordinates
  /** Hashed home location (cache key component) */
  homeLocationHash: string
  /** Day type (cache key component) */
  dayType: DayType
  /** Selected travel mode */
  travelMode: TravelMode
  /** Maximum cycling distance for the e-bike + train mode (km) */
  maxBikeDistanceKm: number
  /** Target arrival time for connection selection */
  targetArrivalTime?: Date
  /** Use the demo-mode mock instead of the OJP API */
  useMock: boolean
  /** Origin label for mock station names */
  originLabel?: string
  /** Destination label for mock station names */
  destinationLabel?: string
}

/**
 * Return the cached travel time for the route, or calculate and cache it.
 */
export async function getOrFetchTravelTime(
  params: GetOrFetchTravelTimeParams
): Promise<TravelTimeResult> {
  const {
    hallId,
    from,
    to,
    homeLocationHash,
    dayType,
    travelMode,
    maxBikeDistanceKm,
    targetArrivalTime,
    useMock,
    originLabel,
    destinationLabel,
  } = params

  const travelModeKey = getTravelModeKey(travelMode, maxBikeDistanceKm)

  const cached = getCachedTravelTime(hallId, homeLocationHash, dayType, travelModeKey)
  if (cached) {
    return cached
  }

  const result = useMock
    ? await calculateMockTravelTime(from, to, {
        travelMode,
        maxBikeDistanceKm,
        originLabel,
        destinationLabel,
      })
    : await calculateTravelTime(from, to, {
        targetArrivalTime,
        travelMode,
        maxBikeDistanceKm,
      })

  setCachedTravelTime(hallId, homeLocationHash, dayType, result, travelModeKey)

  return result
}
