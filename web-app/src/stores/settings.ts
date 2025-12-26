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
}

/** Default max distance in kilometers */
const DEFAULT_MAX_DISTANCE_KM = 50;

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

      setSafeMode: (enabled: boolean) => {
        set({ isSafeModeEnabled: enabled });
      },

      setHomeLocation: (location: UserLocation | null) => {
        set({ homeLocation: location });
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
    }),
    {
      name: "volleykit-settings",
      partialize: (state) => ({
        isSafeModeEnabled: state.isSafeModeEnabled,
        homeLocation: state.homeLocation,
        distanceFilter: state.distanceFilter,
      }),
    },
  ),
);
