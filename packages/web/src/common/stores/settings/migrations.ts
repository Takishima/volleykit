/**
 * Settings store migration functions.
 *
 * Only the v1 → v2 reshape (flat settings → per-mode settings) needs an explicit
 * migration. Every later version only added fields with defaults or removed
 * stale keys, and the store's `merge` option already fills missing fields from
 * `DEFAULT_MODE_SETTINGS` and drops unknown keys on every hydration.
 */

import { DEFAULT_MODE_SETTINGS } from './types'

import type { ModeSettings, UserLocation, DistanceFilter, TravelTimeFilter } from './types'

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
      ...v1State.travelTimeFilter,
      maxTravelTimeByAssociation: {},
    },
    levelFilterEnabled: v1State.levelFilterEnabled ?? false,
    gameGapFilter: { ...DEFAULT_MODE_SETTINGS.gameGapFilter },
    hideOwnExchangesByAssociation: {},
    hideNotTakeableExchangesByAssociation: {},
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
 * Run all migrations from the given version to latest.
 *
 * A `migrate` function must exist even for versions that need no reshaping,
 * otherwise zustand/persist discards the persisted state on a version bump.
 */
export function runMigrations(persisted: unknown, version: number): unknown {
  return version === 1 ? migrateV1ToV2(persisted as V1State) : persisted
}
