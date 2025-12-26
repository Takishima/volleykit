/**
 * Travel time cache utilities.
 */

import type { Coordinates } from "./types";

/** Cache TTL: 7 days in milliseconds */
export const TRAVEL_TIME_CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

/** Cache stale time: 7 days (TanStack Query config) */
export const TRAVEL_TIME_STALE_TIME = TRAVEL_TIME_CACHE_TTL;

/** Garbage collection time: same as TTL */
export const TRAVEL_TIME_GC_TIME = TRAVEL_TIME_CACHE_TTL;

/**
 * Hash a location to create a cache key component.
 * Rounds to ~100m precision to avoid cache misses from GPS drift.
 *
 * @param coords Coordinates to hash
 * @returns String hash suitable for use in cache keys
 */
export function hashLocation(coords: Coordinates): string {
  // Round to 3 decimal places (~100m precision)
  const lat = Math.round(coords.latitude * 1000) / 1000;
  const lon = Math.round(coords.longitude * 1000) / 1000;
  return `${lat},${lon}`;
}

/**
 * Get a unique ID for a sports hall from API data.
 * Falls back to coordinate-based hash if no ID is available.
 *
 * @param hallId Optional hall ID from API
 * @param hallCoords Hall coordinates as fallback
 * @returns Unique identifier for the hall
 */
export function getHallCacheKey(
  hallId: string | undefined,
  hallCoords: Coordinates | null,
): string | null {
  if (hallId) {
    return hallId;
  }

  if (hallCoords) {
    return `coords:${hashLocation(hallCoords)}`;
  }

  return null;
}
