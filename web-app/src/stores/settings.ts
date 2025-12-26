import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Source of the user's home location.
 * Designed for extensibility - future routing APIs can use the same location.
 */
export type LocationSource = "geolocation" | "geocoded" | "manual";

/**
 * User's home location for distance filtering.
 * This structure supports future extension to public transport routing.
 */
export interface UserLocation {
  latitude: number;
  longitude: number;
  /** Display label: address or "Current location" */
  label: string;
  /** How the location was obtained */
  source: LocationSource;
}

/**
 * Distance filter configuration for exchanges.
 * Extensible for future travel time filtering.
 */
export interface DistanceFilter {
  enabled: boolean;
  maxDistanceKm: number;
}

/**
 * Travel time filter configuration for exchanges.
 * Uses Swiss public transport travel times.
 */
export interface TravelTimeFilter {
  /** Whether travel time filtering is active */
  enabled: boolean;
  /** Maximum travel time in minutes */
  maxTravelTimeMinutes: number;
  /** Minutes before game start to arrive (buffer time) */
  arrivalBufferMinutes: number;
  /** Timestamp when cache was last invalidated (home location change) */
  cacheInvalidatedAt: number | null;
}

interface SettingsState {
  // Safe mode
  isSafeModeEnabled: boolean;
  setSafeMode: (enabled: boolean) => void;

  // Home location for distance filtering
  homeLocation: UserLocation | null;
  setHomeLocation: (location: UserLocation | null) => void;

  // Distance filter settings
  distanceFilter: DistanceFilter;
  setDistanceFilterEnabled: (enabled: boolean) => void;
  setMaxDistanceKm: (km: number) => void;

  // Transport feature toggle
  transportEnabled: boolean;
  setTransportEnabled: (enabled: boolean) => void;

  // Travel time filter settings
  travelTimeFilter: TravelTimeFilter;
  setTravelTimeFilterEnabled: (enabled: boolean) => void;
  setMaxTravelTimeMinutes: (minutes: number) => void;
  setArrivalBufferMinutes: (minutes: number) => void;
  invalidateTravelTimeCache: () => void;

  // Reset all settings to defaults (keeps safe mode)
  resetLocationSettings: () => void;
}

/** Default max distance in kilometers */
const DEFAULT_MAX_DISTANCE_KM = 50;

/** Default max travel time in minutes (2 hours) */
const DEFAULT_MAX_TRAVEL_TIME_MINUTES = 120;

/** Default arrival buffer (minutes before game start) */
const DEFAULT_ARRIVAL_BUFFER_MINUTES = 30;

/**
 * Demo mode default location: Zurich main station area.
 * Provides a central location in Switzerland to showcase distance filtering.
 */
export const DEMO_HOME_LOCATION: UserLocation = {
  latitude: 47.3769,
  longitude: 8.5417,
  label: "Zürich HB",
  source: "geocoded",
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      isSafeModeEnabled: true,
      homeLocation: null,
      distanceFilter: {
        enabled: false,
        maxDistanceKm: DEFAULT_MAX_DISTANCE_KM,
      },
      transportEnabled: false,
      travelTimeFilter: {
        enabled: false,
        maxTravelTimeMinutes: DEFAULT_MAX_TRAVEL_TIME_MINUTES,
        arrivalBufferMinutes: DEFAULT_ARRIVAL_BUFFER_MINUTES,
        cacheInvalidatedAt: null,
      },

      setSafeMode: (enabled: boolean) => {
        set({ isSafeModeEnabled: enabled });
      },

      setHomeLocation: (location: UserLocation | null) => {
        // When home location changes, invalidate travel time cache
        set((state) => ({
          homeLocation: location,
          travelTimeFilter: {
            ...state.travelTimeFilter,
            cacheInvalidatedAt: Date.now(),
          },
        }));
      },

      setDistanceFilterEnabled: (enabled: boolean) => {
        set((state) => ({
          distanceFilter: { ...state.distanceFilter, enabled },
        }));
      },

      setMaxDistanceKm: (km: number) => {
        set((state) => ({
          distanceFilter: { ...state.distanceFilter, maxDistanceKm: km },
        }));
      },

      setTransportEnabled: (enabled: boolean) => {
        set({ transportEnabled: enabled });
      },

      setTravelTimeFilterEnabled: (enabled: boolean) => {
        set((state) => ({
          travelTimeFilter: { ...state.travelTimeFilter, enabled },
        }));
      },

      setMaxTravelTimeMinutes: (minutes: number) => {
        set((state) => ({
          travelTimeFilter: { ...state.travelTimeFilter, maxTravelTimeMinutes: minutes },
        }));
      },

      setArrivalBufferMinutes: (minutes: number) => {
        set((state) => ({
          travelTimeFilter: { ...state.travelTimeFilter, arrivalBufferMinutes: minutes },
        }));
      },

      invalidateTravelTimeCache: () => {
        set((state) => ({
          travelTimeFilter: {
            ...state.travelTimeFilter,
            cacheInvalidatedAt: Date.now(),
          },
        }));
      },

      resetLocationSettings: () => {
        // Reset all location-related settings to defaults
        // Keeps safe mode and language preferences unchanged
        set({
          homeLocation: null,
          distanceFilter: {
            enabled: false,
            maxDistanceKm: DEFAULT_MAX_DISTANCE_KM,
          },
          transportEnabled: false,
          travelTimeFilter: {
            enabled: false,
            maxTravelTimeMinutes: DEFAULT_MAX_TRAVEL_TIME_MINUTES,
            arrivalBufferMinutes: DEFAULT_ARRIVAL_BUFFER_MINUTES,
            cacheInvalidatedAt: null,
          },
        });
      },
    }),
    {
      name: "volleykit-settings",
      partialize: (state) => ({
        isSafeModeEnabled: state.isSafeModeEnabled,
        homeLocation: state.homeLocation,
        distanceFilter: state.distanceFilter,
        transportEnabled: state.transportEnabled,
        travelTimeFilter: state.travelTimeFilter,
      }),
    },
  ),
);
