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
  /** Minutes before game start to arrive (buffer time) - legacy global setting */
  arrivalBufferMinutes: number;
  /** Per-association arrival buffer minutes (association code -> minutes) */
  arrivalBufferByAssociation: Record<string, number>;
  /** Timestamp when cache was last invalidated (home location change) */
  cacheInvalidatedAt: number | null;
}

/** Default arrival buffer for SV (Swiss Volley national) - 60 minutes */
export const DEFAULT_ARRIVAL_BUFFER_SV_MINUTES = 60;

/** Default arrival buffer for regional associations - 45 minutes */
export const DEFAULT_ARRIVAL_BUFFER_REGIONAL_MINUTES = 45;

/**
 * Get the default arrival buffer for an association.
 * SV (Swiss Volley national) defaults to 60 minutes, others to 45 minutes.
 */
export function getDefaultArrivalBuffer(associationCode: string | undefined): number {
  if (associationCode === "SV") {
    return DEFAULT_ARRIVAL_BUFFER_SV_MINUTES;
  }
  return DEFAULT_ARRIVAL_BUFFER_REGIONAL_MINUTES;
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

  // Transport feature toggle (legacy global setting)
  transportEnabled: boolean;
  setTransportEnabled: (enabled: boolean) => void;

  // Per-association transport enabled settings
  transportEnabledByAssociation: Record<string, boolean>;
  setTransportEnabledForAssociation: (associationCode: string, enabled: boolean) => void;
  isTransportEnabledForAssociation: (associationCode: string | undefined) => boolean;

  // Travel time filter settings
  travelTimeFilter: TravelTimeFilter;
  setTravelTimeFilterEnabled: (enabled: boolean) => void;
  setMaxTravelTimeMinutes: (minutes: number) => void;
  setArrivalBufferMinutes: (minutes: number) => void;
  setArrivalBufferForAssociation: (associationCode: string, minutes: number) => void;
  getArrivalBufferForAssociation: (associationCode: string | undefined) => number;
  invalidateTravelTimeCache: () => void;

  // Level filter (demo mode only)
  levelFilterEnabled: boolean;
  setLevelFilterEnabled: (enabled: boolean) => void;

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
    (set, get) => ({
      isSafeModeEnabled: true,
      homeLocation: null,
      distanceFilter: {
        enabled: false,
        maxDistanceKm: DEFAULT_MAX_DISTANCE_KM,
      },
      transportEnabled: false,
      transportEnabledByAssociation: {},
      travelTimeFilter: {
        enabled: false,
        maxTravelTimeMinutes: DEFAULT_MAX_TRAVEL_TIME_MINUTES,
        arrivalBufferMinutes: DEFAULT_ARRIVAL_BUFFER_MINUTES,
        arrivalBufferByAssociation: {},
        cacheInvalidatedAt: null,
      },
      levelFilterEnabled: false,

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

      setTransportEnabledForAssociation: (associationCode: string, enabled: boolean) => {
        set((state) => ({
          transportEnabledByAssociation: {
            ...state.transportEnabledByAssociation,
            [associationCode]: enabled,
          },
        }));
      },

      isTransportEnabledForAssociation: (associationCode: string | undefined) => {
        const state = get();
        // Handle migration: if per-association setting exists, use it
        // Otherwise fall back to global transportEnabled for backwards compatibility
        const enabledMap = state.transportEnabledByAssociation ?? {};
        if (associationCode && enabledMap[associationCode] !== undefined) {
          return enabledMap[associationCode];
        }
        // Fall back to global setting for migration
        return state.transportEnabled;
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

      setArrivalBufferForAssociation: (associationCode: string, minutes: number) => {
        set((state) => ({
          travelTimeFilter: {
            ...state.travelTimeFilter,
            arrivalBufferByAssociation: {
              ...state.travelTimeFilter.arrivalBufferByAssociation,
              [associationCode]: minutes,
            },
          },
        }));
      },

      getArrivalBufferForAssociation: (associationCode: string | undefined) => {
        const state = get();
        // Handle migration from old storage (arrivalBufferByAssociation might not exist)
        const bufferMap = state.travelTimeFilter.arrivalBufferByAssociation ?? {};
        if (associationCode && bufferMap[associationCode] !== undefined) {
          return bufferMap[associationCode];
        }
        return getDefaultArrivalBuffer(associationCode);
      },

      invalidateTravelTimeCache: () => {
        set((state) => ({
          travelTimeFilter: {
            ...state.travelTimeFilter,
            cacheInvalidatedAt: Date.now(),
          },
        }));
      },

      setLevelFilterEnabled: (enabled: boolean) => {
        set({ levelFilterEnabled: enabled });
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
          transportEnabledByAssociation: {},
          travelTimeFilter: {
            enabled: false,
            maxTravelTimeMinutes: DEFAULT_MAX_TRAVEL_TIME_MINUTES,
            arrivalBufferMinutes: DEFAULT_ARRIVAL_BUFFER_MINUTES,
            arrivalBufferByAssociation: {},
            cacheInvalidatedAt: null,
          },
          levelFilterEnabled: false,
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
        transportEnabledByAssociation: state.transportEnabledByAssociation,
        travelTimeFilter: state.travelTimeFilter,
        levelFilterEnabled: state.levelFilterEnabled,
      }),
    },
  ),
);
