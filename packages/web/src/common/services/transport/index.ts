/**
 * Public transport routing service.
 * Provides travel time calculations using Swiss public transport via OJP 2.0.
 */

export type { TravelTimeResult, Coordinates, StationInfo, TravelMode } from './types'

export {
  DEFAULT_TRAVEL_MODE,
  DEFAULT_MAX_BIKE_DISTANCE_KM,
  MIN_MAX_BIKE_DISTANCE_KM,
  MAX_MAX_BIKE_DISTANCE_KM,
} from './types'

export { isOjpConfigured } from './ojp-client'

export { getOrFetchTravelTime } from './travel-time-fetcher'

export {
  TRAVEL_TIME_STALE_TIME,
  TRAVEL_TIME_GC_TIME,
  hashLocation,
  getDayType,
  getTravelModeKey,
} from './cache'

export { clearTravelTimeCache, getTravelTimeCacheStats } from './persistence'
