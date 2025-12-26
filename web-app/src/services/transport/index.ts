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

export { calculateTravelTime, isOjpConfigured } from "./ojp-client";

export { calculateMockTravelTime, mockTransportApi } from "./mock-transport";

export {
  TRAVEL_TIME_CACHE_TTL,
  TRAVEL_TIME_STALE_TIME,
  TRAVEL_TIME_GC_TIME,
  getHallCacheKey,
  hashLocation,
} from "./cache";
