/**
 * Settings store - Platform-agnostic user preferences.
 *
 * This store manages user preferences without platform-specific storage.
 * Platform adapters handle persistence (localStorage, AsyncStorage, etc.).
 *
 * Extracted from web-app/src/shared/stores/settings.ts
 */

import { create } from 'zustand';

import type { Language } from '../i18n/types';

/**
 * Source of the user's home location.
 */
export type LocationSource = 'geolocation' | 'geocoded' | 'manual';

/**
 * User's home location for distance/travel time filtering.
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
 */
export interface DistanceFilter {
  enabled: boolean;
  maxDistanceKm: number;
}

/**
 * Travel time filter configuration for exchanges.
 */
export interface TravelTimeFilter {
  enabled: boolean;
  maxTravelTimeMinutes: number;
  /** Minutes before game start to arrive (buffer time) */
  arrivalBufferMinutes: number;
}

/**
 * Notification settings for game reminders.
 */
export interface NotificationSettings {
  enabled: boolean;
  /** Selected reminder times before games */
  reminderTimes: ('1h' | '2h' | '1d')[];
}

/**
 * Departure reminder buffer options in minutes.
 */
export type DepartureReminderBuffer = 5 | 10 | 15 | 20 | 30;

/** Default max distance in kilometers */
export const DEFAULT_MAX_DISTANCE_KM = 50;

/** Default max travel time in minutes (2 hours) */
export const DEFAULT_MAX_TRAVEL_TIME_MINUTES = 120;

/** Default arrival buffer (minutes before game start) */
export const DEFAULT_ARRIVAL_BUFFER_MINUTES = 30;

/** Default notification settings */
export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: false,
  reminderTimes: ['1h'],
};

/**
 * Settings state interface.
 */
export interface SettingsState {
  // === Global settings ===

  /** UI language */
  language: Language;

  // === Location settings ===

  /** User's home location for filtering */
  homeLocation: UserLocation | null;
  /** Distance filter settings */
  distanceFilter: DistanceFilter;
  /** Travel time filter settings */
  travelTimeFilter: TravelTimeFilter;

  // === Notification settings ===

  /** Game reminder notification settings */
  notificationSettings: NotificationSettings;

  // === Mobile-specific settings ===

  /** Biometric authentication enabled */
  biometricEnabled: boolean;
  /** Calendar sync enabled */
  calendarSyncEnabled: boolean;
  /** Selected calendar ID for sync */
  selectedCalendarId: string | null;
  /** Smart Departure Reminder enabled */
  departureReminderEnabled: boolean;
  /** Buffer time for departure reminder */
  departureReminderBufferMinutes: DepartureReminderBuffer;

  // === Actions ===

  setLanguage: (language: Language) => void;
  setHomeLocation: (location: UserLocation | null) => void;
  setDistanceFilterEnabled: (enabled: boolean) => void;
  setMaxDistanceKm: (km: number) => void;
  setTravelTimeFilterEnabled: (enabled: boolean) => void;
  setMaxTravelTimeMinutes: (minutes: number) => void;
  setArrivalBufferMinutes: (minutes: number) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setNotificationReminderTimes: (times: ('1h' | '2h' | '1d')[]) => void;
  setBiometricEnabled: (enabled: boolean) => void;
  setCalendarSyncEnabled: (enabled: boolean) => void;
  setSelectedCalendarId: (id: string | null) => void;
  setDepartureReminderEnabled: (enabled: boolean) => void;
  setDepartureReminderBufferMinutes: (minutes: DepartureReminderBuffer) => void;
  /** Reset all settings to defaults */
  reset: () => void;
}

/**
 * Initial settings state.
 */
const initialState = {
  language: 'de' as Language,
  homeLocation: null as UserLocation | null,
  distanceFilter: {
    enabled: false,
    maxDistanceKm: DEFAULT_MAX_DISTANCE_KM,
  },
  travelTimeFilter: {
    enabled: false,
    maxTravelTimeMinutes: DEFAULT_MAX_TRAVEL_TIME_MINUTES,
    arrivalBufferMinutes: DEFAULT_ARRIVAL_BUFFER_MINUTES,
  },
  notificationSettings: { ...DEFAULT_NOTIFICATION_SETTINGS },
  biometricEnabled: false,
  calendarSyncEnabled: false,
  selectedCalendarId: null as string | null,
  departureReminderEnabled: false,
  departureReminderBufferMinutes: 15 as DepartureReminderBuffer,
};

/**
 * Settings store.
 *
 * Platform-agnostic store for user preferences.
 * Persistence is handled by platform-specific adapters.
 */
export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...initialState,

  setLanguage: (language) => set({ language }),

  setHomeLocation: (homeLocation) => set({ homeLocation }),

  setDistanceFilterEnabled: (enabled) =>
    set((state) => ({
      distanceFilter: { ...state.distanceFilter, enabled },
    })),

  setMaxDistanceKm: (maxDistanceKm) =>
    set((state) => ({
      distanceFilter: { ...state.distanceFilter, maxDistanceKm },
    })),

  setTravelTimeFilterEnabled: (enabled) =>
    set((state) => ({
      travelTimeFilter: { ...state.travelTimeFilter, enabled },
    })),

  setMaxTravelTimeMinutes: (maxTravelTimeMinutes) =>
    set((state) => ({
      travelTimeFilter: { ...state.travelTimeFilter, maxTravelTimeMinutes },
    })),

  setArrivalBufferMinutes: (arrivalBufferMinutes) =>
    set((state) => ({
      travelTimeFilter: { ...state.travelTimeFilter, arrivalBufferMinutes },
    })),

  setNotificationsEnabled: (enabled) =>
    set((state) => ({
      notificationSettings: { ...state.notificationSettings, enabled },
    })),

  setNotificationReminderTimes: (reminderTimes) =>
    set((state) => ({
      notificationSettings: { ...state.notificationSettings, reminderTimes },
    })),

  setBiometricEnabled: (biometricEnabled) => set({ biometricEnabled }),

  setCalendarSyncEnabled: (calendarSyncEnabled) => set({ calendarSyncEnabled }),

  setSelectedCalendarId: (selectedCalendarId) => set({ selectedCalendarId }),

  setDepartureReminderEnabled: (departureReminderEnabled) => set({ departureReminderEnabled }),

  setDepartureReminderBufferMinutes: (departureReminderBufferMinutes) =>
    set({ departureReminderBufferMinutes }),

  reset: () => set(initialState),
}));

/**
 * Demo mode default location: Bern (central Switzerland).
 * Provides a central location in Switzerland to showcase distance filtering.
 */
export const DEMO_HOME_LOCATION: UserLocation = {
  latitude: 46.949,
  longitude: 7.4474,
  label: 'Bern',
  source: 'geocoded',
};
