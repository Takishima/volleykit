/**
 * Public transport routing service.
 * Provides travel time calculations using Swiss public transport via OJP 2.0.
 */

export type {
  TravelTimeResult,
  TravelTimeOptions,
  Coordinates,
  StationInfo,
  TravelMode,
  BikeLegs,
} from './types'

export {
  TransportApiError,
  DEFAULT_TRAVEL_MODE,
  DEFAULT_MAX_BIKE_DISTANCE_KM,
  MIN_MAX_BIKE_DISTANCE_KM,
  MAX_MAX_BIKE_DISTANCE_KM,
} from './types'

export {
  adaptTripForEbikeTrain,
  selectBestEbikeTrainTrip,
  EBIKE_AVERAGE_SPEED_KMH,
} from './ebike-trip-adapter'

export type { EbikeTrainAdaptation } from './ebike-trip-adapter'

export {
  calculateTravelTime,
  isOjpConfigured,
  selectBestTrip,
  extractOriginStation,
  extractDestinationStation,
} from './ojp-client'

export type { OjpTrip } from './ojp-client'

export { calculateMockTravelTime } from './mock-transport'

export type { DayType } from './cache'

export {
  TRAVEL_TIME_CACHE_TTL,
  TRAVEL_TIME_STALE_TIME,
  TRAVEL_TIME_GC_TIME,
  TRAVEL_TIME_STORAGE_KEY,
  getHallCacheKey,
  hashLocation,
  getDayType,
  getTravelModeKey,
} from './cache'

export {
  getCachedTravelTime,
  setCachedTravelTime,
  removeCachedTravelTime,
  clearTravelTimeCache,
  getTravelTimeCacheStats,
  buildCacheKey,
} from './persistence'
