import { create } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'

import type { NotificationPreference, ReminderTime } from '@/shared/services/notifications'

import type { DataSource } from './auth'

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
const DEFAULT_ARRIVAL_BUFFER_MINUTES = 30

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
}

/** Default mode-specific settings */
const DEFAULT_MODE_SETTINGS: ModeSettings = {
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
}

interface SettingsState {
  // === Global settings (shared across all modes) ===

  // Safe mode
  isSafeModeEnabled: boolean
  setSafeMode: (enabled: boolean) => void

  // Safe validation mode (save only, don't finalize - redirect to VolleyManager)
  isSafeValidationEnabled: boolean
  setSafeValidation: (enabled: boolean) => void

  // OCR feature toggle (experimental)
  isOCREnabled: boolean
  setOCREnabled: (enabled: boolean) => void

  // Accessibility settings
  preventZoom: boolean
  setPreventZoom: (enabled: boolean) => void

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

  // Reset current mode's settings to defaults (keeps safe mode and other modes)
  resetLocationSettings: () => void
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
 * Helper to get current mode settings and also update top-level properties.
 * Updates both settingsByMode and the top-level backward-compatible properties.
 */
function updateModeAndTopLevel(
  state: SettingsState,
  updater: (current: ModeSettings) => Partial<ModeSettings>
): Partial<SettingsState> {
  const currentSettings = state.settingsByMode[state.currentMode]
  const updates = updater(currentSettings)
  const newModeSettings = { ...currentSettings, ...updates }

  return {
    settingsByMode: {
      ...state.settingsByMode,
      [state.currentMode]: newModeSettings,
    },
    // Also update top-level properties for backward compatibility
    ...updates,
  }
}

/**
 * Sync top-level properties from the given mode's settings.
 * Called when switching modes to update the backward-compatible properties.
 */
function syncFromMode(
  settingsByMode: Record<DataSource, ModeSettings>,
  mode: DataSource
): Partial<SettingsState> {
  const modeSettings = settingsByMode[mode]
  return {
    homeLocation: modeSettings.homeLocation,
    distanceFilter: modeSettings.distanceFilter,
    distanceFilterByAssociation: modeSettings.distanceFilterByAssociation,
    transportEnabled: modeSettings.transportEnabled,
    transportEnabledByAssociation: modeSettings.transportEnabledByAssociation,
    travelTimeFilter: modeSettings.travelTimeFilter,
    levelFilterEnabled: modeSettings.levelFilterEnabled,
    notificationSettings: modeSettings.notificationSettings,
  }
}

// ============================================================================
// Migration Helpers
// ============================================================================

/** List of all data source modes for migrations */
const ALL_MODES: DataSource[] = ['api', 'demo', 'calendar']

/** Version that introduced notification settings */
const NOTIFICATION_SETTINGS_VERSION = 5

/** Version that added notification delivery preference */
const NOTIFICATION_DELIVERY_PREFERENCE_VERSION = 6

/** V1 state shape (flat settings) */
interface V1State {
  isSafeModeEnabled?: boolean
  preventZoom?: boolean
  homeLocation?: UserLocation | null
  distanceFilter?: DistanceFilter
  transportEnabled?: boolean
  transportEnabledByAssociation?: Record<string, boolean>
  travelTimeFilter?: TravelTimeFilter
  levelFilterEnabled?: boolean
}

/** State shape with settingsByMode (v2+) */
interface StateWithModes {
  settingsByMode?: Record<DataSource, Partial<ModeSettings>>
}

/**
 * Migrate from v1 (flat settings) to v2 (settings by mode).
 */
function migrateV1ToV2(v1State: V1State): Record<string, unknown> {
  const migratedApiSettings: ModeSettings = {
    homeLocation: v1State.homeLocation ?? null,
    distanceFilter: v1State.distanceFilter ?? DEFAULT_MODE_SETTINGS.distanceFilter,
    distanceFilterByAssociation: {},
    transportEnabled: v1State.transportEnabled ?? false,
    transportEnabledByAssociation: v1State.transportEnabledByAssociation ?? {},
    travelTimeFilter: {
      ...DEFAULT_MODE_SETTINGS.travelTimeFilter,
      ...(v1State.travelTimeFilter ?? {}),
      maxTravelTimeByAssociation: {},
    },
    levelFilterEnabled: v1State.levelFilterEnabled ?? false,
    notificationSettings: { ...DEFAULT_NOTIFICATION_SETTINGS },
  }

  return {
    isSafeModeEnabled: v1State.isSafeModeEnabled ?? true,
    preventZoom: v1State.preventZoom ?? false,
    settingsByMode: {
      api: migratedApiSettings,
      demo: { ...DEFAULT_MODE_SETTINGS },
      calendar: { ...DEFAULT_MODE_SETTINGS },
    },
  }
}

/**
 * Add per-association fields for v2→v3 migration.
 */
function addPerAssociationFields(state: StateWithModes): void {
  if (!state.settingsByMode) return

  for (const mode of ALL_MODES) {
    const settings = state.settingsByMode[mode]
    if (!settings) continue

    settings.distanceFilterByAssociation ??= {}

    if (!settings.travelTimeFilter) {
      settings.travelTimeFilter = { ...DEFAULT_MODE_SETTINGS.travelTimeFilter }
    } else {
      settings.travelTimeFilter.maxTravelTimeByAssociation ??= {}
    }
  }
}

/**
 * Add notification settings for v4→v5 migration.
 */
function addNotificationSettings(state: StateWithModes): void {
  if (!state.settingsByMode) return

  for (const mode of ALL_MODES) {
    const settings = state.settingsByMode[mode]
    if (settings && !settings.notificationSettings) {
      settings.notificationSettings = { ...DEFAULT_NOTIFICATION_SETTINGS }
    }
  }
}

/**
 * Add notification delivery preference for v5→v6 migration.
 */
function addNotificationDeliveryPreference(state: StateWithModes): void {
  if (!state.settingsByMode) return

  for (const mode of ALL_MODES) {
    const settings = state.settingsByMode[mode]
    if (settings?.notificationSettings && !settings.notificationSettings.deliveryPreference) {
      settings.notificationSettings.deliveryPreference =
        DEFAULT_NOTIFICATION_SETTINGS.deliveryPreference
    }
  }
}

export const useSettingsStore = create<SettingsState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // Global settings
        isSafeModeEnabled: true,
        isSafeValidationEnabled: true,
        isOCREnabled: false,
        preventZoom: false,

        // Mode tracking
        currentMode: 'api' as DataSource,
        settingsByMode: {
          api: { ...DEFAULT_MODE_SETTINGS },
          demo: { ...DEFAULT_MODE_SETTINGS },
          calendar: { ...DEFAULT_MODE_SETTINGS },
        },

        // Top-level properties (backward compatible) - synced from current mode
        homeLocation: DEFAULT_MODE_SETTINGS.homeLocation,
        distanceFilter: DEFAULT_MODE_SETTINGS.distanceFilter,
        distanceFilterByAssociation: DEFAULT_MODE_SETTINGS.distanceFilterByAssociation,
        transportEnabled: DEFAULT_MODE_SETTINGS.transportEnabled,
        transportEnabledByAssociation: DEFAULT_MODE_SETTINGS.transportEnabledByAssociation,
        travelTimeFilter: DEFAULT_MODE_SETTINGS.travelTimeFilter,
        levelFilterEnabled: DEFAULT_MODE_SETTINGS.levelFilterEnabled,
        notificationSettings: DEFAULT_MODE_SETTINGS.notificationSettings,

        _setCurrentMode: (mode: DataSource) => {
          const state = get()
          // Switch mode and sync top-level properties from new mode
          set({
            currentMode: mode,
            ...syncFromMode(state.settingsByMode, mode),
          })
        },

        setSafeMode: (enabled: boolean) => {
          set({ isSafeModeEnabled: enabled })
        },

        setSafeValidation: (enabled: boolean) => {
          set({ isSafeValidationEnabled: enabled })
        },

        setOCREnabled: (enabled: boolean) => {
          set({ isOCREnabled: enabled })
        },

        setPreventZoom: (enabled: boolean) => {
          set({ preventZoom: enabled })
        },

        setHomeLocation: (location: UserLocation | null) => {
          // When home location changes, invalidate travel time cache
          set((state) =>
            updateModeAndTopLevel(state, (current) => ({
              homeLocation: location,
              travelTimeFilter: {
                ...current.travelTimeFilter,
                cacheInvalidatedAt: Date.now(),
              },
            }))
          )
        },

        setDistanceFilterEnabled: (enabled: boolean) => {
          set((state) =>
            updateModeAndTopLevel(state, (current) => ({
              distanceFilter: { ...current.distanceFilter, enabled },
            }))
          )
        },

        setMaxDistanceKm: (km: number) => {
          set((state) =>
            updateModeAndTopLevel(state, (current) => ({
              distanceFilter: { ...current.distanceFilter, maxDistanceKm: km },
            }))
          )
        },

        setDistanceFilterForAssociation: (
          associationCode: string,
          filter: Partial<DistanceFilter>
        ) => {
          set((state) =>
            updateModeAndTopLevel(state, (current) => {
              const existingFilter = current.distanceFilterByAssociation[associationCode] ?? {
                ...current.distanceFilter,
              }
              return {
                distanceFilterByAssociation: {
                  ...current.distanceFilterByAssociation,
                  [associationCode]: { ...existingFilter, ...filter },
                },
              }
            })
          )
        },

        getDistanceFilterForAssociation: (associationCode: string | undefined) => {
          const state = get()
          const filterMap = state.distanceFilterByAssociation ?? {}
          if (associationCode && filterMap[associationCode] !== undefined) {
            return filterMap[associationCode]
          }
          // Fall back to global distanceFilter
          return state.distanceFilter
        },

        setTransportEnabled: (enabled: boolean) => {
          set((state) => updateModeAndTopLevel(state, () => ({ transportEnabled: enabled })))
        },

        setTransportEnabledForAssociation: (associationCode: string, enabled: boolean) => {
          set((state) =>
            updateModeAndTopLevel(state, (current) => ({
              transportEnabledByAssociation: {
                ...current.transportEnabledByAssociation,
                [associationCode]: enabled,
              },
            }))
          )
        },

        isTransportEnabledForAssociation: (associationCode: string | undefined) => {
          const state = get()
          // Handle migration: if per-association setting exists, use it
          // Otherwise fall back to global transportEnabled for backwards compatibility
          const enabledMap = state.transportEnabledByAssociation ?? {}
          if (associationCode && enabledMap[associationCode] !== undefined) {
            return enabledMap[associationCode]
          }
          // Fall back to global setting for migration
          return state.transportEnabled
        },

        setTravelTimeFilterEnabled: (enabled: boolean) => {
          set((state) =>
            updateModeAndTopLevel(state, (current) => ({
              travelTimeFilter: { ...current.travelTimeFilter, enabled },
            }))
          )
        },

        setMaxTravelTimeMinutes: (minutes: number) => {
          set((state) =>
            updateModeAndTopLevel(state, (current) => ({
              travelTimeFilter: { ...current.travelTimeFilter, maxTravelTimeMinutes: minutes },
            }))
          )
        },

        setMaxTravelTimeForAssociation: (associationCode: string, minutes: number) => {
          set((state) =>
            updateModeAndTopLevel(state, (current) => ({
              travelTimeFilter: {
                ...current.travelTimeFilter,
                maxTravelTimeByAssociation: {
                  ...current.travelTimeFilter.maxTravelTimeByAssociation,
                  [associationCode]: minutes,
                },
              },
            }))
          )
        },

        getMaxTravelTimeForAssociation: (associationCode: string | undefined) => {
          const state = get()
          const timeMap = state.travelTimeFilter.maxTravelTimeByAssociation ?? {}
          if (associationCode && timeMap[associationCode] !== undefined) {
            return timeMap[associationCode]
          }
          // Fall back to global maxTravelTimeMinutes
          return state.travelTimeFilter.maxTravelTimeMinutes
        },

        setArrivalBufferMinutes: (minutes: number) => {
          set((state) =>
            updateModeAndTopLevel(state, (current) => ({
              travelTimeFilter: { ...current.travelTimeFilter, arrivalBufferMinutes: minutes },
            }))
          )
        },

        setArrivalBufferForAssociation: (associationCode: string, minutes: number) => {
          set((state) =>
            updateModeAndTopLevel(state, (current) => ({
              travelTimeFilter: {
                ...current.travelTimeFilter,
                arrivalBufferByAssociation: {
                  ...current.travelTimeFilter.arrivalBufferByAssociation,
                  [associationCode]: minutes,
                },
              },
            }))
          )
        },

        getArrivalBufferForAssociation: (associationCode: string | undefined) => {
          const state = get()
          // Handle migration from old storage (arrivalBufferByAssociation might not exist)
          const bufferMap = state.travelTimeFilter.arrivalBufferByAssociation ?? {}
          if (associationCode && bufferMap[associationCode] !== undefined) {
            return bufferMap[associationCode]
          }
          return getDefaultArrivalBuffer(associationCode)
        },

        invalidateTravelTimeCache: () => {
          set((state) =>
            updateModeAndTopLevel(state, (current) => ({
              travelTimeFilter: {
                ...current.travelTimeFilter,
                cacheInvalidatedAt: Date.now(),
              },
            }))
          )
        },

        setSbbDestinationType: (type: SbbDestinationType) => {
          set((state) =>
            updateModeAndTopLevel(state, (current) => ({
              travelTimeFilter: { ...current.travelTimeFilter, sbbDestinationType: type },
            }))
          )
        },

        setLevelFilterEnabled: (enabled: boolean) => {
          set((state) => updateModeAndTopLevel(state, () => ({ levelFilterEnabled: enabled })))
        },

        setNotificationsEnabled: (enabled: boolean) => {
          set((state) =>
            updateModeAndTopLevel(state, (current) => ({
              notificationSettings: { ...current.notificationSettings, enabled },
            }))
          )
        },

        setNotificationReminderTimes: (times: ReminderTime[]) => {
          set((state) =>
            updateModeAndTopLevel(state, (current) => ({
              notificationSettings: { ...current.notificationSettings, reminderTimes: times },
            }))
          )
        },

        setNotificationDeliveryPreference: (preference: NotificationPreference) => {
          set((state) =>
            updateModeAndTopLevel(state, (current) => ({
              notificationSettings: {
                ...current.notificationSettings,
                deliveryPreference: preference,
              },
            }))
          )
        },

        resetLocationSettings: () => {
          // Reset current mode's location-related settings to defaults
          // Keeps safe mode and other modes' settings unchanged
          set((state) => updateModeAndTopLevel(state, () => ({ ...DEFAULT_MODE_SETTINGS })))
        },
      }),
      {
        name: 'volleykit-settings',
        version: 6,
        partialize: (state) => ({
          // Global settings
          isSafeModeEnabled: state.isSafeModeEnabled,
          isSafeValidationEnabled: state.isSafeValidationEnabled,
          isOCREnabled: state.isOCREnabled,
          preventZoom: state.preventZoom,
          // Mode-specific settings stored per mode
          settingsByMode: state.settingsByMode,
          // Don't persist currentMode - it's synced from auth store on load
        }),
        migrate: (persisted, version) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let state = persisted as any

          // v1 → v2: Migrate flat settings to per-mode settings
          if (version === 1) {
            state = migrateV1ToV2(state as V1State)
          }

          // v2 → v3: Add per-association distance and travel time fields
          if (version <= 2) {
            addPerAssociationFields(state as StateWithModes)
          }

          // v4 → v5: Add notification settings
          if (version < NOTIFICATION_SETTINGS_VERSION) {
            addNotificationSettings(state as StateWithModes)
          }

          // v5 → v6: Add notification delivery preference
          if (version < NOTIFICATION_DELIVERY_PREFERENCE_VERSION) {
            addNotificationDeliveryPreference(state as StateWithModes)
          }

          return state
        },
        merge: (persisted, current) => {
          // Defensively merge persisted data with current defaults.
          // This prevents data loss when the schema changes or data is corrupted.
          const persistedState = persisted as
            | {
                isSafeModeEnabled?: boolean
                isSafeValidationEnabled?: boolean
                isOCREnabled?: boolean
                preventZoom?: boolean
                settingsByMode?: Record<DataSource, Partial<ModeSettings>>
              }
            | undefined

          // Deep merge settingsByMode with defaults
          const mergedSettingsByMode: Record<DataSource, ModeSettings> = {
            api: { ...DEFAULT_MODE_SETTINGS },
            demo: { ...DEFAULT_MODE_SETTINGS },
            calendar: { ...DEFAULT_MODE_SETTINGS },
          }

          if (persistedState?.settingsByMode) {
            for (const mode of ['api', 'demo', 'calendar'] as DataSource[]) {
              const persistedModeSettings = persistedState.settingsByMode[mode]
              if (persistedModeSettings) {
                mergedSettingsByMode[mode] = {
                  homeLocation:
                    persistedModeSettings.homeLocation ?? DEFAULT_MODE_SETTINGS.homeLocation,
                  distanceFilter: {
                    ...DEFAULT_MODE_SETTINGS.distanceFilter,
                    ...(persistedModeSettings.distanceFilter ?? {}),
                  },
                  distanceFilterByAssociation:
                    persistedModeSettings.distanceFilterByAssociation ??
                    DEFAULT_MODE_SETTINGS.distanceFilterByAssociation,
                  transportEnabled:
                    persistedModeSettings.transportEnabled ??
                    DEFAULT_MODE_SETTINGS.transportEnabled,
                  transportEnabledByAssociation:
                    persistedModeSettings.transportEnabledByAssociation ??
                    DEFAULT_MODE_SETTINGS.transportEnabledByAssociation,
                  travelTimeFilter: {
                    ...DEFAULT_MODE_SETTINGS.travelTimeFilter,
                    ...(persistedModeSettings.travelTimeFilter ?? {}),
                    // Ensure new fields exist
                    maxTravelTimeByAssociation:
                      persistedModeSettings.travelTimeFilter?.maxTravelTimeByAssociation ??
                      DEFAULT_MODE_SETTINGS.travelTimeFilter.maxTravelTimeByAssociation,
                    sbbDestinationType:
                      persistedModeSettings.travelTimeFilter?.sbbDestinationType ??
                      DEFAULT_MODE_SETTINGS.travelTimeFilter.sbbDestinationType,
                  },
                  levelFilterEnabled:
                    persistedModeSettings.levelFilterEnabled ??
                    DEFAULT_MODE_SETTINGS.levelFilterEnabled,
                  notificationSettings: {
                    ...DEFAULT_NOTIFICATION_SETTINGS,
                    ...(persistedModeSettings.notificationSettings ?? {}),
                  },
                }
              }
            }
          }

          return {
            ...current,
            // Preserve global settings
            isSafeModeEnabled: persistedState?.isSafeModeEnabled ?? current.isSafeModeEnabled,
            isSafeValidationEnabled:
              persistedState?.isSafeValidationEnabled ?? current.isSafeValidationEnabled,
            isOCREnabled: persistedState?.isOCREnabled ?? current.isOCREnabled,
            preventZoom: persistedState?.preventZoom ?? current.preventZoom,
            // Preserve mode-specific settings
            settingsByMode: mergedSettingsByMode,
          }
        },
      }
    )
  )
)

// Note: Settings sync with auth store is initialized in App.tsx
// to avoid circular dependencies between stores.
