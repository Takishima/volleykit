/**
 * Hook for generating SBB URLs with station IDs from OJP trip data.
 * Fetches trip data on demand and caches results.
 */

import { useState, useCallback } from "react";
import { useAuthStore } from "@/shared/stores/auth";
import { useSettingsStore } from "@/shared/stores/settings";
import { useActiveAssociationCode } from "@/features/auth/hooks/useActiveAssociation";
import {
  calculateTravelTime,
  calculateMockTravelTime,
  isOjpConfigured,
  hashLocation,
  getDayType,
  getCachedTravelTime,
  setCachedTravelTime,
  type Coordinates,
  type StationInfo,
} from "@/shared/services/transport";
import { generateSbbUrl, calculateArrivalTime, openSbbUrl } from "@/shared/utils/sbb-url";
import type { Locale } from "@/i18n";

interface UseSbbUrlOptions {
  /** Hall coordinates for routing */
  hallCoords: Coordinates | null;
  /** Hall ID for caching */
  hallId: string | undefined;
  /** City name as fallback destination */
  city: string | undefined;
  /** Game start time */
  gameStartTime: string | undefined;
  /** Language for the URL */
  language: Locale;
}

interface UseSbbUrlResult {
  /** Whether trip data is being fetched */
  isLoading: boolean;
  /** Error from fetching trip data */
  error: Error | null;
  /** Cached origin station info (if available) */
  originStation: StationInfo | undefined;
  /** Cached destination station info (if available) */
  destinationStation: StationInfo | undefined;
  /** Open the SBB connection in a new tab, fetching trip data if needed */
  openSbbConnection: () => Promise<void>;
}

/**
 * Hook to generate and open SBB URLs with proper station IDs.
 * Fetches trip data on demand and caches results.
 */
export function useSbbUrl(options: UseSbbUrlOptions): UseSbbUrlResult {
  const { hallCoords, hallId, city, gameStartTime, language } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [originStation, setOriginStation] = useState<StationInfo | undefined>();
  const [destinationStation, setDestinationStation] = useState<StationInfo | undefined>();

  const dataSource = useAuthStore((state) => state.dataSource);
  const isDemoMode = dataSource === "demo";
  const homeLocation = useSettingsStore((state) => state.homeLocation);
  const associationCode = useActiveAssociationCode();
  const arrivalBuffer = useSettingsStore((state) =>
    state.getArrivalBufferForAssociation(associationCode),
  );

  const openSbbConnection = useCallback(async () => {
    if (!city || !gameStartTime) {
      return;
    }

    const gameDate = new Date(gameStartTime);
    const arrivalTime = calculateArrivalTime(gameDate, arrivalBuffer);

    // Get fallback address for origin (used when station lookup fails)
    const originAddress = homeLocation?.source === "geocoded" ? homeLocation.label : undefined;

    // If we already have cached station info, use it directly
    if (originStation && destinationStation) {
      const url = generateSbbUrl({
        destination: city,
        date: gameDate,
        arrivalTime,
        language,
        originStation,
        destinationStation,
        originAddress,
      });
      openSbbUrl(url);
      return;
    }

    // If we can fetch trip data, try to get the station ID
    const canFetchTrip = homeLocation && hallCoords && hallId && (isDemoMode || isOjpConfigured());

    if (canFetchTrip) {
      setIsLoading(true);
      setError(null);

      try {
        const homeLocationHash = hashLocation(homeLocation);
        const dayType = getDayType(gameDate);

        // Check cache first
        let tripResult = getCachedTravelTime(hallId, homeLocationHash, dayType);

        if (!tripResult) {
          // Fetch trip data
          const fromCoords: Coordinates = {
            latitude: homeLocation.latitude,
            longitude: homeLocation.longitude,
          };

          // Prefer real OJP if configured, fall back to mock transport
          if (isOjpConfigured()) {
            tripResult = await calculateTravelTime(fromCoords, hallCoords, {
              targetArrivalTime: arrivalTime,
            });
          } else {
            tripResult = await calculateMockTravelTime(fromCoords, hallCoords, {
              // Use simple "Home" label instead of geocoded address for cleaner SBB URLs
              originLabel: "Home",
              destinationLabel: city,
            });
          }

          // Cache the result
          setCachedTravelTime(hallId, homeLocationHash, dayType, tripResult);
        }

        // Update state with station info for future clicks
        if (tripResult.originStation) {
          setOriginStation(tripResult.originStation);
        }
        if (tripResult.destinationStation) {
          setDestinationStation(tripResult.destinationStation);
        }

        // Generate URL with station IDs
        const url = generateSbbUrl({
          destination: city,
          date: gameDate,
          arrivalTime,
          language,
          originStation: tripResult.originStation,
          destinationStation: tripResult.destinationStation,
          originAddress,
        });
        openSbbUrl(url);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to fetch trip data"));

        // Fall back to URL without station ID but with address
        const url = generateSbbUrl({
          destination: city,
          date: gameDate,
          arrivalTime,
          language,
          originAddress,
        });
        openSbbUrl(url);
      } finally {
        setIsLoading(false);
      }
    } else {
      // No trip data available, use city name and address fallbacks
      const url = generateSbbUrl({
        destination: city,
        date: gameDate,
        arrivalTime,
        language,
        originAddress,
      });
      openSbbUrl(url);
    }
  }, [
    city,
    gameStartTime,
    arrivalBuffer,
    originStation,
    destinationStation,
    language,
    homeLocation,
    hallCoords,
    hallId,
    isDemoMode,
  ]);

  return {
    isLoading,
    error,
    originStation,
    destinationStation,
    openSbbConnection,
  };
}
