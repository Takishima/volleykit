/**
 * Hook for fetching travel time to a sports hall using Swiss public transport.
 */

import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth";
import { useSettingsStore } from "@/stores/settings";
import { queryKeys } from "@/api/queryKeys";
import {
  calculateTravelTime,
  calculateMockTravelTime,
  isOjpConfigured,
  hashLocation,
  TRAVEL_TIME_STALE_TIME,
  TRAVEL_TIME_GC_TIME,
  type Coordinates,
  type TravelTimeResult,
} from "@/services/transport";

/**
 * Hook to fetch travel time from user's home location to a sports hall.
 *
 * @param hallId Unique identifier for the sports hall (used for caching)
 * @param hallCoords Coordinates of the sports hall
 * @returns TanStack Query result with travel time data
 */
export function useTravelTime(
  hallId: string | undefined,
  hallCoords: Coordinates | null,
) {
  const isDemoMode = useAuthStore((state) => state.isDemoMode);
  const homeLocation = useSettingsStore((state) => state.homeLocation);
  const transportEnabled = useSettingsStore((state) => state.transportEnabled);

  // Create a hash of home location for cache key stability
  const homeLocationHash = homeLocation ? hashLocation(homeLocation) : null;

  // Determine if we should fetch travel time
  const shouldFetch = Boolean(
    transportEnabled &&
    homeLocation &&
    hallCoords &&
    hallId &&
    (isDemoMode || isOjpConfigured()),
  );

  return useQuery<TravelTimeResult>({
    queryKey: queryKeys.travelTime.hall(hallId ?? "", homeLocationHash ?? ""),
    queryFn: async () => {
      if (!homeLocation || !hallCoords) {
        throw new Error("Missing home location or hall coordinates");
      }

      const fromCoords: Coordinates = {
        latitude: homeLocation.latitude,
        longitude: homeLocation.longitude,
      };

      // Use mock transport in demo mode, real API otherwise
      if (isDemoMode) {
        return calculateMockTravelTime(fromCoords, hallCoords);
      }

      return calculateTravelTime(fromCoords, hallCoords);
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
}

/**
 * Format travel time duration for display.
 *
 * @param minutes Travel time in minutes
 * @returns Formatted string like "45m" or "1h 15m"
 */
export function formatTravelTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Check if travel time feature is available.
 * Returns true if either demo mode is active or OJP API is configured.
 */
export function useTravelTimeAvailable(): boolean {
  const isDemoMode = useAuthStore((state) => state.isDemoMode);
  return isDemoMode || isOjpConfigured();
}
