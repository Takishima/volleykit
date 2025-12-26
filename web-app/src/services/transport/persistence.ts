/**
 * Travel time cache persistence to localStorage.
 *
 * Persists travel time results to survive browser sessions.
 * Uses a dedicated storage key to avoid polluting other cached data.
 */

import { TRAVEL_TIME_STORAGE_KEY, TRAVEL_TIME_CACHE_TTL } from "./cache";
import type { TravelTimeResult } from "./types";
import type { DayType } from "./cache";
import { logger } from "@/utils/logger";

interface CachedTravelTime {
  result: TravelTimeResult;
  timestamp: number;
}

/**
 * Cache structure with version for future migrations.
 * When changing the cache format, increment version and add migration logic
 * in loadCache() to handle upgrading old cache data.
 */
interface TravelTimeCache {
  version: 1;
  entries: Record<string, CachedTravelTime>;
}

/**
 * Build a cache key from the route parameters.
 */
export function buildCacheKey(
  hallId: string,
  homeLocationHash: string,
  dayType: DayType,
): string {
  return `${hallId}:${homeLocationHash}:${dayType}`;
}

/**
 * Load the travel time cache from localStorage.
 */
function loadCache(): TravelTimeCache {
  try {
    const stored = localStorage.getItem(TRAVEL_TIME_STORAGE_KEY);
    if (!stored) {
      return { version: 1, entries: {} };
    }

    const parsed = JSON.parse(stored) as TravelTimeCache;

    // Validate structure
    if (parsed.version !== 1 || typeof parsed.entries !== "object") {
      return { version: 1, entries: {} };
    }

    return parsed;
  } catch {
    return { version: 1, entries: {} };
  }
}

/**
 * Save the travel time cache to localStorage.
 */
function saveCache(cache: TravelTimeCache): void {
  try {
    localStorage.setItem(TRAVEL_TIME_STORAGE_KEY, JSON.stringify(cache));
  } catch (error) {
    // localStorage might be full or disabled - log for debugging but don't fail
    if (error instanceof DOMException && error.name === "QuotaExceededError") {
      logger.warn("Travel time cache: localStorage quota exceeded");
    }
  }
}

/**
 * Get a cached travel time result.
 *
 * @param hallId Sports hall ID
 * @param homeLocationHash Hashed home location coordinates
 * @param dayType Day type (weekday/saturday/sunday)
 * @returns Cached result if valid, null otherwise
 */
export function getCachedTravelTime(
  hallId: string,
  homeLocationHash: string,
  dayType: DayType,
): TravelTimeResult | null {
  const cache = loadCache();
  const key = buildCacheKey(hallId, homeLocationHash, dayType);
  const entry = cache.entries[key];

  if (!entry) {
    return null;
  }

  // Check if entry has expired
  const age = Date.now() - entry.timestamp;
  if (age > TRAVEL_TIME_CACHE_TTL) {
    // Entry expired, remove it
    delete cache.entries[key];
    saveCache(cache);
    return null;
  }

  return entry.result;
}

/**
 * Store a travel time result in the persistent cache.
 *
 * @param hallId Sports hall ID
 * @param homeLocationHash Hashed home location coordinates
 * @param dayType Day type (weekday/saturday/sunday)
 * @param result Travel time result to cache
 */
export function setCachedTravelTime(
  hallId: string,
  homeLocationHash: string,
  dayType: DayType,
  result: TravelTimeResult,
): void {
  const cache = loadCache();
  const key = buildCacheKey(hallId, homeLocationHash, dayType);

  cache.entries[key] = {
    result,
    timestamp: Date.now(),
  };

  // Clean up expired entries while we're at it
  const now = Date.now();
  for (const [entryKey, entry] of Object.entries(cache.entries)) {
    if (now - entry.timestamp > TRAVEL_TIME_CACHE_TTL) {
      delete cache.entries[entryKey];
    }
  }

  saveCache(cache);
}

/**
 * Remove a specific travel time from the cache.
 *
 * @param hallId Sports hall ID
 * @param homeLocationHash Hashed home location coordinates
 * @param dayType Day type (weekday/saturday/sunday)
 */
export function removeCachedTravelTime(
  hallId: string,
  homeLocationHash: string,
  dayType: DayType,
): void {
  const cache = loadCache();
  const key = buildCacheKey(hallId, homeLocationHash, dayType);
  delete cache.entries[key];
  saveCache(cache);
}

/**
 * Clear all cached travel times.
 */
export function clearTravelTimeCache(): void {
  try {
    localStorage.removeItem(TRAVEL_TIME_STORAGE_KEY);
  } catch {
    // Ignore errors
  }
}

/**
 * Get cache statistics for display in settings.
 */
export function getTravelTimeCacheStats(): {
  entryCount: number;
  oldestEntryAge: number | null;
} {
  const cache = loadCache();
  const entries = Object.values(cache.entries);

  if (entries.length === 0) {
    return { entryCount: 0, oldestEntryAge: null };
  }

  const now = Date.now();
  const oldestTimestamp = Math.min(...entries.map((e) => e.timestamp));

  return {
    entryCount: entries.length,
    oldestEntryAge: now - oldestTimestamp,
  };
}
