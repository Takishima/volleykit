import { create } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'

import type { NotificationPreference, ReminderTime } from '@/shared/services/notifications'

import { runMigrations } from './migrations'
import {
  DEFAULT_MODE_SETTINGS,
  DEFAULT_NOTIFICATION_SETTINGS,
  getDefaultArrivalBuffer,
} from './types'

import type { DataSource } from '../auth'
import type {
  SettingsState,
  ModeSettings,
  UserLocation,
  ValidationReferenceMode,
  ScoreSheetShareMode,
  SbbDestinationType,
} from './types'

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
    gameGapFilter: modeSettings.gameGapFilter,
    hideOwnExchangesByAssociation: modeSettings.hideOwnExchangesByAssociation,
  }
}

export const useSettingsStore = create<SettingsState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // Global settings
        isSafeModeEnabled: true,
        isOCREnabled: false,
        validationReferenceMode: 'quick-compare' as ValidationReferenceMode,
        scoreSheetShareMode: 'email' as ScoreSheetShareMode,
        preventZoom: false,
        settingsGroupExpanded: {},

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
        gameGapFilter: DEFAULT_MODE_SETTINGS.gameGapFilter,
        hideOwnExchangesByAssociation: DEFAULT_MODE_SETTINGS.hideOwnExchangesByAssociation,

        _setCurrentMode: (mode: DataSource) => {
          const state = get()
          set({
            currentMode: mode,
            ...syncFromMode(state.settingsByMode, mode),
          })
        },

        setSafeMode: (enabled: boolean) => {
          set({ isSafeModeEnabled: enabled })
        },

        setOCREnabled: (enabled: boolean) => {
          set({ isOCREnabled: enabled })
        },

        setValidationReferenceMode: (mode: ValidationReferenceMode) => {
          set({ validationReferenceMode: mode })
        },

        setScoreSheetShareMode: (mode: ScoreSheetShareMode) => {
          set({ scoreSheetShareMode: mode })
        },

        setPreventZoom: (enabled: boolean) => {
          set({ preventZoom: enabled })
        },

        setSettingsGroupExpanded: (key: string, expanded: boolean) => {
          set((state) => ({
            settingsGroupExpanded: {
              ...state.settingsGroupExpanded,
              [key]: expanded,
            },
          }))
        },

        setHomeLocation: (location: UserLocation | null) => {
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
          filter: Partial<import('./types').DistanceFilter>
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
          const enabledMap = state.transportEnabledByAssociation ?? {}
          if (associationCode && enabledMap[associationCode] !== undefined) {
            return enabledMap[associationCode]
          }
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

        setGameGapFilterEnabled: (enabled: boolean) => {
          set((state) =>
            updateModeAndTopLevel(state, (current) => ({
              gameGapFilter: { ...current.gameGapFilter, enabled },
            }))
          )
        },

        setMinGameGapMinutes: (minutes: number) => {
          set((state) =>
            updateModeAndTopLevel(state, (current) => ({
              gameGapFilter: { ...current.gameGapFilter, minGapMinutes: minutes },
            }))
          )
        },

        setHideOwnExchangesForAssociation: (associationCode: string, enabled: boolean) => {
          set((state) =>
            updateModeAndTopLevel(state, (current) => ({
              hideOwnExchangesByAssociation: {
                ...current.hideOwnExchangesByAssociation,
                [associationCode]: enabled,
              },
            }))
          )
        },

        isHideOwnExchangesForAssociation: (associationCode: string | undefined) => {
          const state = get()
          const enabledMap = state.hideOwnExchangesByAssociation ?? {}
          if (associationCode && enabledMap[associationCode] !== undefined) {
            return enabledMap[associationCode]
          }
          // Default to true (hide own exchanges by default)
          return true
        },

        resetLocationSettings: () => {
          set((state) => updateModeAndTopLevel(state, () => ({ ...DEFAULT_MODE_SETTINGS })))
        },
      }),
      {
        name: 'volleykit-settings',
        version: 10,
        partialize: (state) => ({
          // Global settings
          isSafeModeEnabled: state.isSafeModeEnabled,
          isOCREnabled: state.isOCREnabled,
          validationReferenceMode: state.validationReferenceMode,
          scoreSheetShareMode: state.scoreSheetShareMode,
          preventZoom: state.preventZoom,
          settingsGroupExpanded: state.settingsGroupExpanded,
          // Mode-specific settings stored per mode
          settingsByMode: state.settingsByMode,
          // Don't persist currentMode - it's synced from auth store on load
        }),
        migrate: runMigrations,
        merge: (persisted, current) => {
          // Defensively merge persisted data with current defaults.
          // This prevents data loss when the schema changes or data is corrupted.
          const persistedState = persisted as
            | {
                isSafeModeEnabled?: boolean
                isOCREnabled?: boolean
                validationReferenceMode?: ValidationReferenceMode
                scoreSheetShareMode?: ScoreSheetShareMode
                preventZoom?: boolean
                settingsGroupExpanded?: Record<string, boolean>
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
                  gameGapFilter: {
                    ...DEFAULT_MODE_SETTINGS.gameGapFilter,
                    ...(persistedModeSettings.gameGapFilter ?? {}),
                  },
                  hideOwnExchangesByAssociation:
                    persistedModeSettings.hideOwnExchangesByAssociation ??
                    DEFAULT_MODE_SETTINGS.hideOwnExchangesByAssociation,
                }
              }
            }
          }

          return {
            ...current,
            // Preserve global settings
            isSafeModeEnabled: persistedState?.isSafeModeEnabled ?? current.isSafeModeEnabled,
            isOCREnabled: persistedState?.isOCREnabled ?? current.isOCREnabled,
            validationReferenceMode:
              persistedState?.validationReferenceMode ?? current.validationReferenceMode,
            scoreSheetShareMode: persistedState?.scoreSheetShareMode ?? current.scoreSheetShareMode,
            preventZoom: persistedState?.preventZoom ?? current.preventZoom,
            settingsGroupExpanded:
              persistedState?.settingsGroupExpanded ?? current.settingsGroupExpanded,
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
