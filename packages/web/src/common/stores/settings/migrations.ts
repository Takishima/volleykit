/**
 * Settings store migration functions.
 *
 * Each migration function handles upgrading persisted state from one version
 * to the next. The store's `migrate` option chains these together.
 */

import {
  DEFAULT_MODE_SETTINGS,
  DEFAULT_NOTIFICATION_SETTINGS,
  DEFAULT_MIN_GAME_GAP_MINUTES,
} from './types'

import type { DataSource } from '../auth'
import type {
  ModeSettings,
  UserLocation,
  DistanceFilter,
  TravelTimeFilter,
  ValidationReferenceMode,
} from './types'

// ============================================================================
// Migration Version Constants
// ============================================================================

/** Version that introduced notification settings */
export const NOTIFICATION_SETTINGS_VERSION = 5

/** Version that added notification delivery preference */
export const NOTIFICATION_DELIVERY_PREFERENCE_VERSION = 6

/** Version that added game gap filter */
export const GAME_GAP_FILTER_VERSION = 7

/** Version that added hide own exchanges per-association */
export const HIDE_OWN_EXCHANGES_VERSION = 8

/** Version that added validation reference mode */
export const VALIDATION_REFERENCE_MODE_VERSION = 9

/** Version that added settings group expansion state */
export const SETTINGS_GROUP_EXPANDED_VERSION = 10

// ============================================================================
// Migration Type Shapes
// ============================================================================

/** List of all data source modes for migrations */
const ALL_MODES: DataSource[] = ['api', 'demo', 'calendar']

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

// ============================================================================
// Migration Functions
// ============================================================================

/**
 * Migrate from v1 (flat settings) to v2 (settings by mode).
 */
export function migrateV1ToV2(v1State: V1State): Record<string, unknown> {
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
    gameGapFilter: { ...DEFAULT_MODE_SETTINGS.gameGapFilter },
    hideOwnExchangesByAssociation: {},
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
export function addPerAssociationFields(state: StateWithModes): void {
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
export function addNotificationSettings(state: StateWithModes): void {
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
export function addNotificationDeliveryPreference(state: StateWithModes): void {
  if (!state.settingsByMode) return

  for (const mode of ALL_MODES) {
    const settings = state.settingsByMode[mode]
    if (settings?.notificationSettings && !settings.notificationSettings.deliveryPreference) {
      settings.notificationSettings.deliveryPreference =
        DEFAULT_NOTIFICATION_SETTINGS.deliveryPreference
    }
  }
}

/**
 * Add game gap filter for v6→v7 migration.
 */
export function addGameGapFilter(state: StateWithModes): void {
  if (!state.settingsByMode) return

  for (const mode of ALL_MODES) {
    const settings = state.settingsByMode[mode]
    if (settings && !settings.gameGapFilter) {
      settings.gameGapFilter = {
        enabled: false,
        minGapMinutes: DEFAULT_MIN_GAME_GAP_MINUTES,
      }
    }
  }
}

/**
 * Add hide own exchanges per-association for v7→v8 migration.
 */
export function addHideOwnExchangesByAssociation(state: StateWithModes): void {
  if (!state.settingsByMode) return

  for (const mode of ALL_MODES) {
    const settings = state.settingsByMode[mode]
    if (settings && !settings.hideOwnExchangesByAssociation) {
      settings.hideOwnExchangesByAssociation = {}
    }
  }
}

/**
 * Run all migrations from the given version to latest.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function runMigrations(persisted: any, version: number): unknown {
  let state = persisted

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

  // v6 → v7: Add game gap filter
  if (version < GAME_GAP_FILTER_VERSION) {
    addGameGapFilter(state as StateWithModes)
  }

  // v7 → v8: Add hide own exchanges per-association
  if (version < HIDE_OWN_EXCHANGES_VERSION) {
    addHideOwnExchangesByAssociation(state as StateWithModes)
  }

  // v8 → v9: Add validation reference mode (global setting, not per-mode)
  if (version < VALIDATION_REFERENCE_MODE_VERSION) {
    if (!(state as Record<string, unknown>).validationReferenceMode) {
      ;(state as Record<string, unknown>).validationReferenceMode =
        'quick-compare' satisfies ValidationReferenceMode
    }
  }

  // v9 → v10: Add settings group expansion state
  if (version < SETTINGS_GROUP_EXPANDED_VERSION) {
    if (!(state as Record<string, unknown>).settingsGroupExpanded) {
      ;(state as Record<string, unknown>).settingsGroupExpanded = {}
    }
  }

  return state
}
