/**
 * Travel time cache utilities.
 *
 * Swiss public transport schedules are stable within day types:
 * - Weekdays (Mon-Fri): Same schedule
 * - Saturday: Different schedule
 * - Sunday/holidays: Different schedule
 *
 * We use day type in cache keys to reuse calculations across similar days.
 */

import type { Coordinates } from "./types";
import { MS_PER_HOUR, HOURS_PER_DAY } from "@/shared/utils/constants";

/** Day types for Swiss public transport schedules */
export type DayType = "weekday" | "saturday" | "sunday";

/** Cache TTL in days */
const CACHE_TTL_DAYS = 14;

/**
 * Cache TTL: 14 days in milliseconds.
 *
 * Note: Using 14 days instead of 30 to stay within JavaScript's 32-bit
 * signed integer limit for setTimeout (~24.8 days max). Values above
 * ~2.147 billion ms cause silent clamping to 1ms.
 */
export const TRAVEL_TIME_CACHE_TTL = CACHE_TTL_DAYS * HOURS_PER_DAY * MS_PER_HOUR;

/** Cache stale time: 14 days (TanStack Query config) */
export const TRAVEL_TIME_STALE_TIME = TRAVEL_TIME_CACHE_TTL;

/** Garbage collection time: same as TTL */
export const TRAVEL_TIME_GC_TIME = TRAVEL_TIME_CACHE_TTL;

/** LocalStorage key for persisted travel time cache */
export const TRAVEL_TIME_STORAGE_KEY = "volleykit-travel-time-cache";

/**
 * Get the day type for a given date.
 * Swiss public transport uses the same schedules for:
 * - Weekdays (Monday-Friday)
 * - Saturday
 * - Sunday (and holidays, though we don't track holidays)
 *
 * @param date Date to check (defaults to today)
 * @returns Day type: "weekday", "saturday", or "sunday"
 */
export function getDayType(date: Date = new Date()): DayType {
  const day = date.getDay();
  if (day === 0) return "sunday";
  if (day === 6) return "saturday";
  return "weekday";
}

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
