/**
 * Public transport routing service.
 * Provides travel time calculations using Swiss public transport via OJP 2.0.
 */

export type {
  TravelTimeResult,
  TravelTimeOptions,
  Coordinates,
  TransportConfig,
} from "./types";

export { TransportApiError } from "./types";

export { calculateTravelTime, isOjpConfigured, selectBestTrip } from "./ojp-client";

export type { OjpTrip } from "./ojp-client";

export { calculateMockTravelTime, mockTransportApi } from "./mock-transport";

export type { DayType } from "./cache";

export {
  TRAVEL_TIME_CACHE_TTL,
  TRAVEL_TIME_STALE_TIME,
  TRAVEL_TIME_GC_TIME,
  TRAVEL_TIME_STORAGE_KEY,
  getHallCacheKey,
  hashLocation,
  getDayType,
} from "./cache";

export {
  getCachedTravelTime,
  setCachedTravelTime,
  removeCachedTravelTime,
  clearTravelTimeCache,
  getTravelTimeCacheStats,
  buildCacheKey,
} from "./persistence";
