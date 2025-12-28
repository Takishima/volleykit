import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Source of the user's home location.
 * Designed for extensibility - future routing APIs can use the same location.
 */
export type LocationSource = "geolocation" | "geocoded" | "manual";

/**
 * Swiss-specific location data from geo.admin.ch.
 * Stored for potential future use with Swiss services.
 */
export interface SwissLocationData {
  /** Swiss LV95 X coordinate (easting) */
  lv95X: number;
  /** Swiss LV95 Y coordinate (northing) */
  lv95Y: number;
  /** geo.admin.ch feature ID for potential reverse lookups */
  featureId?: number;
}

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
  /** Swiss-specific data when geocoded via geo.admin.ch */
  swissData?: SwissLocationData;
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

/**
 * Target for SBB timetable links.
 * - 'website': Opens SBB website (works everywhere)
 * - 'app': Opens SBB mobile app (requires app installed)
 */
export type SbbLinkTarget = "website" | "app";

/** Default arrival buffer for SV (Swiss Volley national) - 60 minutes */
export const DEFAULT_ARRIVAL_BUFFER_SV_MINUTES = 60;

/** Default arrival buffer for regional associations - 45 minutes */
export const DEFAULT_ARRIVAL_BUFFER_REGIONAL_MINUTES = 45;

/** Minimum allowed arrival buffer in minutes */
export const MIN_ARRIVAL_BUFFER_MINUTES = 0;

/** Maximum allowed arrival buffer in minutes (3 hours) */
export const MAX_ARRIVAL_BUFFER_MINUTES = 180;

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

  // SBB link target settings (per-association)
  sbbLinkTargetByAssociation: Record<string, SbbLinkTarget>;
  setSbbLinkTargetForAssociation: (associationCode: string, target: SbbLinkTarget) => void;
  getSbbLinkTargetForAssociation: (associationCode: string | undefined) => SbbLinkTarget;

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
 * Demo mode default location: Bern (central Switzerland).
 * Provides a central location in Switzerland to showcase distance filtering.
 */
export const DEMO_HOME_LOCATION: UserLocation = {
  latitude: 46.949,
  longitude: 7.4474,
  label: "Bern",
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
      sbbLinkTargetByAssociation: {},

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

      setSbbLinkTargetForAssociation: (associationCode: string, target: SbbLinkTarget) => {
        set((state) => ({
          sbbLinkTargetByAssociation: {
            ...state.sbbLinkTargetByAssociation,
            [associationCode]: target,
          },
        }));
      },

      getSbbLinkTargetForAssociation: (associationCode: string | undefined) => {
        const state = get();
        const targetMap = state.sbbLinkTargetByAssociation ?? {};
        if (associationCode && targetMap[associationCode] !== undefined) {
          return targetMap[associationCode];
        }
        // Default to website (works everywhere)
        return "website";
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
          sbbLinkTargetByAssociation: {},
        });
      },
    }),
    {
      name: "volleykit-settings",
      version: 1,
      partialize: (state) => ({
        isSafeModeEnabled: state.isSafeModeEnabled,
        homeLocation: state.homeLocation,
        distanceFilter: state.distanceFilter,
        transportEnabled: state.transportEnabled,
        transportEnabledByAssociation: state.transportEnabledByAssociation,
        travelTimeFilter: state.travelTimeFilter,
        levelFilterEnabled: state.levelFilterEnabled,
        sbbLinkTargetByAssociation: state.sbbLinkTargetByAssociation,
      }),
      merge: (persisted, current) => {
        // Defensively merge persisted data with current defaults.
        // This prevents data loss when the schema changes or data is corrupted.
        const persistedState = persisted as Partial<SettingsState> | undefined;

        return {
          ...current,
          // Preserve safe mode setting
          isSafeModeEnabled: persistedState?.isSafeModeEnabled ?? current.isSafeModeEnabled,
          // Preserve home location - critical user data
          homeLocation: persistedState?.homeLocation ?? current.homeLocation,
          // Merge distance filter with defaults for any missing fields
          distanceFilter: {
            ...current.distanceFilter,
            ...(persistedState?.distanceFilter ?? {}),
          },
          // Preserve transport settings
          transportEnabled: persistedState?.transportEnabled ?? current.transportEnabled,
          transportEnabledByAssociation:
            persistedState?.transportEnabledByAssociation ?? current.transportEnabledByAssociation,
          // Merge travel time filter with defaults for any missing fields
          travelTimeFilter: {
            ...current.travelTimeFilter,
            ...(persistedState?.travelTimeFilter ?? {}),
          },
          // Preserve level filter
          levelFilterEnabled: persistedState?.levelFilterEnabled ?? current.levelFilterEnabled,
        };
      },
    },
  ),
);
