import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  getCachedTravelTime,
  setCachedTravelTime,
  removeCachedTravelTime,
  clearTravelTimeCache,
  getTravelTimeCacheStats,
  buildCacheKey,
} from "./persistence";
import { TRAVEL_TIME_STORAGE_KEY, TRAVEL_TIME_CACHE_TTL } from "./cache";
import type { TravelTimeResult } from "./types";

describe("persistence", () => {
  const mockResult: TravelTimeResult = {
    durationMinutes: 45,
    departureTime: "2024-01-15T09:00:00Z",
    arrivalTime: "2024-01-15T09:45:00Z",
    transfers: 1,
  };

  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T10:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("buildCacheKey", () => {
    it("builds key from hallId, homeLocationHash, and dayType", () => {
      const key = buildCacheKey("hall-123", "47.377,8.542", "weekday");
      expect(key).toBe("hall-123:47.377,8.542:weekday");
    });

    it("builds different keys for different day types", () => {
      const weekdayKey = buildCacheKey("hall-123", "47.377,8.542", "weekday");
      const saturdayKey = buildCacheKey("hall-123", "47.377,8.542", "saturday");
      const sundayKey = buildCacheKey("hall-123", "47.377,8.542", "sunday");

      expect(weekdayKey).not.toBe(saturdayKey);
      expect(saturdayKey).not.toBe(sundayKey);
      expect(weekdayKey).not.toBe(sundayKey);
    });
  });

  describe("setCachedTravelTime and getCachedTravelTime", () => {
    it("stores and retrieves travel time result", () => {
      setCachedTravelTime("hall-123", "47.377,8.542", "weekday", mockResult);
      const cached = getCachedTravelTime("hall-123", "47.377,8.542", "weekday");

      expect(cached).toEqual(mockResult);
    });

    it("returns null for non-existent entries", () => {
      const cached = getCachedTravelTime("nonexistent", "47.377,8.542", "weekday");
      expect(cached).toBeNull();
    });

    it("stores different results for different day types", () => {
      const weekdayResult = { ...mockResult, durationMinutes: 45 };
      const saturdayResult = { ...mockResult, durationMinutes: 60 };

      setCachedTravelTime("hall-123", "47.377,8.542", "weekday", weekdayResult);
      setCachedTravelTime("hall-123", "47.377,8.542", "saturday", saturdayResult);

      expect(
        getCachedTravelTime("hall-123", "47.377,8.542", "weekday")?.durationMinutes,
      ).toBe(45);
      expect(
        getCachedTravelTime("hall-123", "47.377,8.542", "saturday")?.durationMinutes,
      ).toBe(60);
    });

    it("returns null for expired entries", () => {
      setCachedTravelTime("hall-123", "47.377,8.542", "weekday", mockResult);

      // Advance time past TTL
      vi.advanceTimersByTime(TRAVEL_TIME_CACHE_TTL + 1000);

      const cached = getCachedTravelTime("hall-123", "47.377,8.542", "weekday");
      expect(cached).toBeNull();
    });

    it("returns valid entries before TTL expires", () => {
      setCachedTravelTime("hall-123", "47.377,8.542", "weekday", mockResult);

      // Advance time to just before TTL
      vi.advanceTimersByTime(TRAVEL_TIME_CACHE_TTL - 1000);

      const cached = getCachedTravelTime("hall-123", "47.377,8.542", "weekday");
      expect(cached).toEqual(mockResult);
    });
  });

  describe("removeCachedTravelTime", () => {
    it("removes a specific cached entry", () => {
      setCachedTravelTime("hall-123", "47.377,8.542", "weekday", mockResult);
      setCachedTravelTime("hall-456", "47.377,8.542", "weekday", mockResult);

      removeCachedTravelTime("hall-123", "47.377,8.542", "weekday");

      expect(getCachedTravelTime("hall-123", "47.377,8.542", "weekday")).toBeNull();
      expect(getCachedTravelTime("hall-456", "47.377,8.542", "weekday")).toEqual(
        mockResult,
      );
    });
  });

  describe("clearTravelTimeCache", () => {
    it("removes all cached entries", () => {
      setCachedTravelTime("hall-123", "47.377,8.542", "weekday", mockResult);
      setCachedTravelTime("hall-456", "47.377,8.542", "saturday", mockResult);

      clearTravelTimeCache();

      expect(getCachedTravelTime("hall-123", "47.377,8.542", "weekday")).toBeNull();
      expect(getCachedTravelTime("hall-456", "47.377,8.542", "saturday")).toBeNull();
    });
  });

  describe("getTravelTimeCacheStats", () => {
    it("returns zero entries for empty cache", () => {
      const stats = getTravelTimeCacheStats();
      expect(stats.entryCount).toBe(0);
      expect(stats.oldestEntryAge).toBeNull();
    });

    it("returns correct entry count", () => {
      setCachedTravelTime("hall-123", "47.377,8.542", "weekday", mockResult);
      setCachedTravelTime("hall-456", "47.377,8.542", "saturday", mockResult);
      setCachedTravelTime("hall-789", "47.377,8.542", "sunday", mockResult);

      const stats = getTravelTimeCacheStats();
      expect(stats.entryCount).toBe(3);
    });

    it("returns oldest entry age", () => {
      setCachedTravelTime("hall-123", "47.377,8.542", "weekday", mockResult);

      vi.advanceTimersByTime(5000);

      setCachedTravelTime("hall-456", "47.377,8.542", "saturday", mockResult);

      const stats = getTravelTimeCacheStats();
      expect(stats.oldestEntryAge).toBe(5000);
    });
  });

  describe("error handling", () => {
    it("handles corrupted localStorage data gracefully", () => {
      localStorage.setItem(TRAVEL_TIME_STORAGE_KEY, "invalid json");

      const cached = getCachedTravelTime("hall-123", "47.377,8.542", "weekday");
      expect(cached).toBeNull();
    });

    it("handles invalid cache structure gracefully", () => {
      localStorage.setItem(
        TRAVEL_TIME_STORAGE_KEY,
        JSON.stringify({ invalid: "structure" }),
      );

      const cached = getCachedTravelTime("hall-123", "47.377,8.542", "weekday");
      expect(cached).toBeNull();
    });

    it("invalidates old cache versions", () => {
      // Simulate old v1 cache with dirty station names
      const oldCache = {
        version: 1,
        entries: {
          "hall-123:47.377,8.542:weekday": {
            result: {
              ...mockResult,
              destinationStation: {
                id: "8502113",
                name: "Aarau PLATFORM_NOT_WHEELCHAIR_ACCESSIBLE",
              },
            },
            timestamp: Date.now(),
          },
        },
      };
      localStorage.setItem(TRAVEL_TIME_STORAGE_KEY, JSON.stringify(oldCache));

      // Old cache should be invalidated due to version mismatch
      const cached = getCachedTravelTime("hall-123", "47.377,8.542", "weekday");
      expect(cached).toBeNull();
    });
  });
});
