import type { NotificationPreference, ReminderTime } from '@/common/services/notifications'

import type { DataSource } from '../auth'

/**
 * Source of the user's home location.
 * Designed for extensibility - future routing APIs can use the same location.
 */
export type LocationSource = 'geolocation' | 'geocoded' | 'manual'

/**
 * User's home location for distance filtering.
 * This structure supports future extension to public transport routing.
 */
export interface UserLocation {
  latitude: number
  longitude: number
  /** Display label: address or "Current location" */
  label: string
  /** How the location was obtained */
  source: LocationSource
}

/**
 * Distance filter configuration for exchanges.
 * Extensible for future travel time filtering.
 */
export interface DistanceFilter {
  enabled: boolean
  maxDistanceKm: number
}

/**
 * SBB destination type for the SBB button.
 * - 'address': Route to the full sports hall address (includes walking)
 * - 'station': Route to the last public transport stop only
 */
export type SbbDestinationType = 'address' | 'station'

/**
 * Validation reference mode for viewing the scoresheet photo during validation.
 * - 'quick-compare': Toggle button flips between form and full-screen zoomable photo
 */
export type ValidationReferenceMode = 'quick-compare'

/**
 * Travel time filter configuration for exchanges.
 * Uses Swiss public transport travel times.
 */
export interface TravelTimeFilter {
  /** Whether travel time filtering is active */
  enabled: boolean
  /** Maximum travel time in minutes - legacy global setting */
  maxTravelTimeMinutes: number
  /** Per-association max travel time minutes (association code -> minutes) */
  maxTravelTimeByAssociation: Record<string, number>
  /** Minutes before game start to arrive (buffer time) - legacy global setting */
  arrivalBufferMinutes: number
  /** Per-association arrival buffer minutes (association code -> minutes) */
  arrivalBufferByAssociation: Record<string, number>
  /** Timestamp when cache was last invalidated (home location change) */
  cacheInvalidatedAt: number | null
  /** SBB button destination type - 'address' for sports hall, 'station' for last stop */
  sbbDestinationType: SbbDestinationType
}

/**
 * Game gap filter configuration for exchanges.
 * Filters out exchanges that are too close to the user's existing assignments.
 */
export interface GameGapFilter {
  /** Whether game gap filtering is active */
  enabled: boolean
  /** Minimum gap in minutes between games */
  minGapMinutes: number
}

/** Default arrival buffer for SV (Swiss Volley national) - 60 minutes */
export const DEFAULT_ARRIVAL_BUFFER_SV_MINUTES = 60

/** Default arrival buffer for regional associations - 45 minutes */
export const DEFAULT_ARRIVAL_BUFFER_REGIONAL_MINUTES = 45

/** Minimum allowed arrival buffer in minutes */
export const MIN_ARRIVAL_BUFFER_MINUTES = 0

/** Maximum allowed arrival buffer in minutes (3 hours) */
export const MAX_ARRIVAL_BUFFER_MINUTES = 180

/**
 * Get the default arrival buffer for an association.
 * SV (Swiss Volley national) defaults to 60 minutes, others to 45 minutes.
 */
export function getDefaultArrivalBuffer(associationCode: string | undefined): number {
  if (associationCode === 'SV') {
    return DEFAULT_ARRIVAL_BUFFER_SV_MINUTES
  }
  return DEFAULT_ARRIVAL_BUFFER_REGIONAL_MINUTES
}

/** Default max distance in kilometers */
export const DEFAULT_MAX_DISTANCE_KM = 50

/** Default max travel time in minutes (2 hours) */
export const DEFAULT_MAX_TRAVEL_TIME_MINUTES = 120

/** Default arrival buffer (minutes before game start) */
export const DEFAULT_ARRIVAL_BUFFER_MINUTES = 30

/** Default minimum gap between games in minutes (2 hours) */
export const DEFAULT_MIN_GAME_GAP_MINUTES = 120

/**
 * Notification settings for game reminders.
 */
export interface NotificationSettings {
  /** Whether notifications are enabled */
  enabled: boolean
  /** Selected reminder times before games */
  reminderTimes: ReminderTime[]
  /**
   * Delivery preference for notifications.
   * - 'native': Prefer browser notifications, fall back to in-app
   * - 'in-app': Always use in-app notifications only
   * - 'both': Show both native and in-app notifications
   */
  deliveryPreference: NotificationPreference
}

/** Default notification settings */
export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: false,
  reminderTimes: ['1h'],
  deliveryPreference: 'native',
}

/**
 * Mode-specific settings that are stored separately for each data source.
 * This prevents demo mode settings from affecting real API mode and vice versa.
 */
export interface ModeSettings {
  homeLocation: UserLocation | null
  distanceFilter: DistanceFilter
  /** Per-association distance filter settings (association code -> settings) */
  distanceFilterByAssociation: Record<string, DistanceFilter>
  transportEnabled: boolean
  transportEnabledByAssociation: Record<string, boolean>
  travelTimeFilter: TravelTimeFilter
  levelFilterEnabled: boolean
  /** Notification settings for game reminders */
  notificationSettings: NotificationSettings
  /** Game gap filter settings for exchanges */
  gameGapFilter: GameGapFilter
  /** Per-association "hide own exchanges" setting (association code -> enabled) */
  hideOwnExchangesByAssociation: Record<string, boolean>
}

/** Default mode-specific settings */
export const DEFAULT_MODE_SETTINGS: ModeSettings = {
  homeLocation: null,
  distanceFilter: {
    enabled: false,
    maxDistanceKm: DEFAULT_MAX_DISTANCE_KM,
  },
  distanceFilterByAssociation: {},
  transportEnabled: false,
  transportEnabledByAssociation: {},
  travelTimeFilter: {
    enabled: false,
    maxTravelTimeMinutes: DEFAULT_MAX_TRAVEL_TIME_MINUTES,
    maxTravelTimeByAssociation: {},
    arrivalBufferMinutes: DEFAULT_ARRIVAL_BUFFER_MINUTES,
    arrivalBufferByAssociation: {},
    cacheInvalidatedAt: null,
    sbbDestinationType: 'address',
  },
  levelFilterEnabled: false,
  notificationSettings: { ...DEFAULT_NOTIFICATION_SETTINGS },
  gameGapFilter: {
    enabled: false,
    minGapMinutes: DEFAULT_MIN_GAME_GAP_MINUTES,
  },
  hideOwnExchangesByAssociation: {},
}

/**
 * Demo mode default location: Bern (central Switzerland).
 * Provides a central location in Switzerland to showcase distance filtering.
 */
export const DEMO_HOME_LOCATION: UserLocation = {
  latitude: 46.949,
  longitude: 7.4474,
  label: 'Bern',
  source: 'geocoded',
}

/**
 * Settings state interface.
 */
export interface SettingsState {
  // === Global settings (shared across all modes) ===

  // Safe mode - blocks exchanges/compensations, and in validation saves without finalizing
  isSafeModeEnabled: boolean
  setSafeMode: (enabled: boolean) => void

  // OCR feature toggle (experimental)
  isOCREnabled: boolean
  setOCREnabled: (enabled: boolean) => void

  // Validation reference mode (how scoresheet photo is displayed during validation)
  validationReferenceMode: ValidationReferenceMode
  setValidationReferenceMode: (mode: ValidationReferenceMode) => void

  // Accessibility settings
  preventZoom: boolean
  setPreventZoom: (enabled: boolean) => void

  // Settings page group expansion state
  settingsGroupExpanded: Record<string, boolean>
  setSettingsGroupExpanded: (key: string, expanded: boolean) => void

  // === Mode-specific settings ===

  /** Current data source mode - synced from auth store */
  currentMode: DataSource
  /** Internal: update current mode (called by auth store subscription) */
  _setCurrentMode: (mode: DataSource) => void

  /** Settings stored per mode (api, demo, calendar) */
  settingsByMode: Record<DataSource, ModeSettings>

  // Getters for current mode's settings (read from settingsByMode[currentMode])
  homeLocation: UserLocation | null
  distanceFilter: DistanceFilter
  distanceFilterByAssociation: Record<string, DistanceFilter>
  transportEnabled: boolean
  transportEnabledByAssociation: Record<string, boolean>
  travelTimeFilter: TravelTimeFilter
  levelFilterEnabled: boolean
  notificationSettings: NotificationSettings
  gameGapFilter: GameGapFilter
  hideOwnExchangesByAssociation: Record<string, boolean>

  // Setters that update current mode's settings
  setHomeLocation: (location: UserLocation | null) => void
  setDistanceFilterEnabled: (enabled: boolean) => void
  setMaxDistanceKm: (km: number) => void
  // Per-association distance filter setters/getters
  setDistanceFilterForAssociation: (
    associationCode: string,
    filter: Partial<DistanceFilter>
  ) => void
  getDistanceFilterForAssociation: (associationCode: string | undefined) => DistanceFilter
  setTransportEnabled: (enabled: boolean) => void
  setTransportEnabledForAssociation: (associationCode: string, enabled: boolean) => void
  isTransportEnabledForAssociation: (associationCode: string | undefined) => boolean
  setTravelTimeFilterEnabled: (enabled: boolean) => void
  setMaxTravelTimeMinutes: (minutes: number) => void
  // Per-association max travel time setters/getters
  setMaxTravelTimeForAssociation: (associationCode: string, minutes: number) => void
  getMaxTravelTimeForAssociation: (associationCode: string | undefined) => number
  setArrivalBufferMinutes: (minutes: number) => void
  setArrivalBufferForAssociation: (associationCode: string, minutes: number) => void
  getArrivalBufferForAssociation: (associationCode: string | undefined) => number
  invalidateTravelTimeCache: () => void
  setSbbDestinationType: (type: SbbDestinationType) => void
  setLevelFilterEnabled: (enabled: boolean) => void
  // Notification settings
  setNotificationsEnabled: (enabled: boolean) => void
  setNotificationReminderTimes: (times: ReminderTime[]) => void
  setNotificationDeliveryPreference: (preference: NotificationPreference) => void
  // Game gap filter settings
  setGameGapFilterEnabled: (enabled: boolean) => void
  setMinGameGapMinutes: (minutes: number) => void

  // Hide own exchanges per-association
  setHideOwnExchangesForAssociation: (associationCode: string, enabled: boolean) => void
  isHideOwnExchangesForAssociation: (associationCode: string | undefined) => boolean

  // Reset current mode's settings to defaults (keeps safe mode and other modes)
  resetLocationSettings: () => void
}
