/**
 * Hook for filtering exchanges by travel time.
 */

import { useMemo, useCallback } from "react";
import { useQueries } from "@tanstack/react-query";
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
  TRAVEL_TIME_STALE_TIME,
  TRAVEL_TIME_GC_TIME,
  type Coordinates,
  type TravelTimeResult,
} from "@/services/transport";
import type { GameExchange } from "@/api/client";

interface HallInfo {
  id: string;
  coords: Coordinates | null;
  /** Game start time for optimal connection selection */
  gameStartTime: Date | null;
}


interface ExchangeWithTravelTime<T> {
  item: T;
  travelTimeMinutes: number | null;
  isLoading: boolean;
  isError: boolean;
}

/**
 * Extract hall information from a game exchange.
 */
function getHallInfo(exchange: GameExchange): HallInfo | null {
  const hall = exchange.refereeGame?.game?.hall;
  if (!hall?.__identity) return null;

  const geoLocation = hall.primaryPostalAddress?.geographicalLocation;
  const lat = geoLocation?.latitude;
  const lon = geoLocation?.longitude;

  // Extract game start time for optimal connection selection
  const startingDateTime = exchange.refereeGame?.game?.startingDateTime;
  const gameStartTime = startingDateTime ? new Date(startingDateTime) : null;

  return {
    id: hall.__identity,
    coords: lat != null && lon != null ? { latitude: lat, longitude: lon } : null,
    gameStartTime,
  };
}

/**
 * Hook to calculate and filter travel times for a list of exchanges.
 *
 * @param exchanges List of exchanges to calculate travel times for
 * @returns Object with travel time data for each exchange and filter helper
 */
export function useTravelTimeFilter<T extends GameExchange>(exchanges: T[] | null) {
  const isDemoMode = useAuthStore((state) => state.isDemoMode);
  const homeLocation = useSettingsStore((state) => state.homeLocation);
  const transportEnabled = useSettingsStore((state) => state.transportEnabled);
  const travelTimeFilter = useSettingsStore((state) => state.travelTimeFilter);

  // Get unique halls to query
  const hallInfos = useMemo(() => {
    if (!exchanges) return [];

    const seen = new Set<string>();
    const result: (HallInfo & { exchange: T })[] = [];

    for (const exchange of exchanges) {
      const hallInfo = getHallInfo(exchange);
      if (hallInfo && !seen.has(hallInfo.id)) {
        seen.add(hallInfo.id);
        result.push({ ...hallInfo, exchange });
      }
    }

    return result;
  }, [exchanges]);

  // Home location hash for cache key stability
  const homeLocationHash = homeLocation ? hashLocation(homeLocation) : null;

  // Determine day type for caching (based on today)
  const dayType = getDayType();

  // Check if we should fetch travel times
  const canFetch = Boolean(
    transportEnabled &&
      homeLocation &&
      (isDemoMode || isOjpConfigured()),
  );

  // Create queries for each unique hall
  const queries = useQueries({
    queries: hallInfos.map((hallInfo) => ({
      queryKey: queryKeys.travelTime.hall(
        hallInfo.id,
        homeLocationHash ?? "",
        dayType,
      ),
      queryFn: async (): Promise<TravelTimeResult> => {
        if (!homeLocation || !hallInfo.coords) {
          throw new Error("Missing location data");
        }

        // Check localStorage cache first
        const cached = getCachedTravelTime(
          hallInfo.id,
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

        // Calculate target arrival time (game start minus buffer from settings)
        const arrivalBufferMs = travelTimeFilter.arrivalBufferMinutes * 60 * 1000;
        const targetArrivalTime = hallInfo.gameStartTime
          ? new Date(hallInfo.gameStartTime.getTime() - arrivalBufferMs)
          : undefined;

        let result: TravelTimeResult;
        if (isDemoMode) {
          result = await calculateMockTravelTime(fromCoords, hallInfo.coords);
        } else {
          result = await calculateTravelTime(fromCoords, hallInfo.coords, {
            targetArrivalTime,
          });
        }

        // Persist to localStorage
        setCachedTravelTime(hallInfo.id, homeLocationHash ?? "", dayType, result);

        return result;
      },
      enabled: canFetch && hallInfo.coords !== null,
      staleTime: TRAVEL_TIME_STALE_TIME,
      gcTime: TRAVEL_TIME_GC_TIME,
      refetchOnWindowFocus: false,
      retry: 3,
      retryDelay: (attempt: number) => Math.min(1000 * 2 ** attempt, 30000),
    })),
  });

  // Build a map of hall ID -> travel time result
  // Uses explicit ID matching instead of index correlation for robustness
  const travelTimeMap = useMemo(() => {
    const map = new Map<string, { minutes: number | null; isLoading: boolean; isError: boolean }>();

    // Create a lookup from query key to result
    const queryByHallId = new Map<string, typeof queries[number]>();
    queries.forEach((query, index) => {
      const hallInfo = hallInfos[index];
      if (hallInfo) {
        queryByHallId.set(hallInfo.id, query);
      }
    });

    // Build the result map using explicit ID matching
    hallInfos.forEach((hallInfo) => {
      const query = queryByHallId.get(hallInfo.id);
      map.set(hallInfo.id, {
        minutes: query?.data?.durationMinutes ?? null,
        isLoading: query?.isLoading ?? false,
        isError: query?.isError ?? false,
      });
    });

    return map;
  }, [hallInfos, queries]);

  // Enrich exchanges with travel time data
  const exchangesWithTravelTime: ExchangeWithTravelTime<T>[] | null = useMemo(() => {
    if (!exchanges) return null;

    return exchanges.map((exchange) => {
      const hallInfo = getHallInfo(exchange);
      const travelTimeData = hallInfo ? travelTimeMap.get(hallInfo.id) : null;

      return {
        item: exchange,
        travelTimeMinutes: travelTimeData?.minutes ?? null,
        isLoading: travelTimeData?.isLoading ?? false,
        isError: travelTimeData?.isError ?? false,
      };
    });
  }, [exchanges, travelTimeMap]);

  // Filter function that can be applied to exchanges
  const filterByTravelTime = useCallback(
    (exchangeWithTravelTime: ExchangeWithTravelTime<T>): boolean => {
      // If filtering is disabled, include all
      if (!travelTimeFilter.enabled) return true;

      // If no travel time available, include (conservative approach)
      if (exchangeWithTravelTime.travelTimeMinutes === null) return true;

      // Apply the filter
      return exchangeWithTravelTime.travelTimeMinutes <= travelTimeFilter.maxTravelTimeMinutes;
    },
    [travelTimeFilter.enabled, travelTimeFilter.maxTravelTimeMinutes],
  );

  // Get filtered list
  const filteredExchanges = useMemo(() => {
    if (!exchangesWithTravelTime) return null;
    return exchangesWithTravelTime.filter(filterByTravelTime);
  }, [exchangesWithTravelTime, filterByTravelTime]);

  // Check if any travel times are loading
  const isLoadingAny = queries.some((q) => q.isLoading);

  return {
    /** Exchanges enriched with travel time data */
    exchangesWithTravelTime,
    /** Exchanges filtered by travel time (if filter is enabled) */
    filteredExchanges,
    /** Whether any travel time queries are loading */
    isLoading: isLoadingAny,
    /** Filter function to apply manually */
    filterByTravelTime,
    /** Whether travel time filtering is available */
    isAvailable: canFetch,
  };
}
