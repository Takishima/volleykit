/**
 * Hook for fetching travel time to a sports hall using Swiss public transport.
 *
 * Travel times are cached by day type (weekday/saturday/sunday) since Swiss
 * public transport schedules are consistent within each day type.
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useAuthStore } from "@/stores/auth";
import { useSettingsStore } from "@/stores/settings";
import { queryKeys } from "@/api/queryKeys";
import {
  calculateTravelTime,
  calculateMockTravelTime,
  isOjpConfigured,
  hashLocation,
  getDayType,
  getCachedTravelTime,
  setCachedTravelTime,
  removeCachedTravelTime,
  TRAVEL_TIME_STALE_TIME,
  TRAVEL_TIME_GC_TIME,
  type Coordinates,
  type TravelTimeResult,
  type DayType,
} from "@/services/transport";

interface UseTravelTimeOptions {
  /** Date for the journey (used to determine day type). Defaults to today. */
  date?: Date;
  /** Target arrival time - selects connection arriving closest to this time without being late */
  targetArrivalTime?: Date;
}

/**
 * Hook to fetch travel time from user's home location to a sports hall.
 * Caches results by day type (weekday/saturday/sunday) for efficiency.
 *
 * @param hallId Unique identifier for the sports hall (used for caching)
 * @param hallCoords Coordinates of the sports hall
 * @param options Optional configuration including journey date
 * @returns TanStack Query result with travel time data and refresh function
 */
export function useTravelTime(
  hallId: string | undefined,
  hallCoords: Coordinates | null,
  options: UseTravelTimeOptions = {},
) {
  const { date, targetArrivalTime } = options;
  const isDemoMode = useAuthStore((state) => state.isDemoMode);
  const homeLocation = useSettingsStore((state) => state.homeLocation);
  const transportEnabled = useSettingsStore((state) => state.transportEnabled);
  const queryClient = useQueryClient();

  // Create a hash of home location for cache key stability
  const homeLocationHash = homeLocation ? hashLocation(homeLocation) : null;

  // Determine day type for cache key (weekday/saturday/sunday)
  const dayType: DayType = getDayType(date);

  // Determine if we should fetch travel time
  const shouldFetch = Boolean(
    transportEnabled &&
      homeLocation &&
      hallCoords &&
      hallId &&
      (isDemoMode || isOjpConfigured()),
  );

  const queryKey = queryKeys.travelTime.hall(
    hallId ?? "",
    homeLocationHash ?? "",
    dayType,
  );

  const query = useQuery<TravelTimeResult>({
    queryKey,
    queryFn: async () => {
      if (!homeLocation || !hallCoords || !hallId) {
        throw new Error("Missing home location or hall coordinates");
      }

      // Check localStorage cache first (survives browser sessions)
      const cached = getCachedTravelTime(
        hallId,
        homeLocationHash ?? "",
        dayType,
      );
      if (cached) {
        return cached;
      }

      const fromCoords: Coordinates = {
        latitude: homeLocation.latitude,
        longitude: homeLocation.longitude,
      };

      // Use mock transport in demo mode, real API otherwise
      let result: TravelTimeResult;
      if (isDemoMode) {
        result = await calculateMockTravelTime(fromCoords, hallCoords);
      } else {
        result = await calculateTravelTime(fromCoords, hallCoords, {
          targetArrivalTime,
        });
      }

      // Persist successful result to localStorage
      setCachedTravelTime(hallId, homeLocationHash ?? "", dayType, result);

      return result;
    },
    enabled: shouldFetch,

    // Long stale time - travel times don't change frequently
    staleTime: TRAVEL_TIME_STALE_TIME,
    gcTime: TRAVEL_TIME_GC_TIME,

    // Don't refetch on window focus since travel times are stable
    refetchOnWindowFocus: false,

    // Use TanStack Query defaults for retry (3 retries with exponential backoff)
    // Not setting retry here allows tests to override via QueryClient defaults
  });

  // Function to manually refresh travel time (invalidates both caches)
  const refresh = useCallback(() => {
    if (hallId && homeLocationHash) {
      // Remove from localStorage first
      removeCachedTravelTime(hallId, homeLocationHash, dayType);
    }
    // Then invalidate TanStack Query cache to trigger refetch
    queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey, hallId, homeLocationHash, dayType]);

  return {
    ...query,
    refresh,
    dayType,
  };
}

/**
 * Format travel time duration for display.
 *
 * @param minutes Travel time in minutes
 * @returns Formatted string like "45'" or "1h15'"
 */
export function formatTravelTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}'`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h${remainingMinutes}'`;
}

/**
 * Check if travel time feature is available.
 * Returns true if either demo mode is active or OJP API is configured.
 */
export function useTravelTimeAvailable(): boolean {
  const isDemoMode = useAuthStore((state) => state.isDemoMode);
  return isDemoMode || isOjpConfigured();
}
