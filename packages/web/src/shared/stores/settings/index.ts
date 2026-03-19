/**
 * Settings store module.
 *
 * Split into:
 * - types.ts: Type definitions, constants, and defaults
 * - migrations.ts: Persistence migration functions (v1→v10)
 * - store.ts: Zustand store implementation
 */

// Re-export everything from types
export type {
  LocationSource,
  UserLocation,
  DistanceFilter,
  SbbDestinationType,
  ValidationReferenceMode,
  TravelTimeFilter,
  GameGapFilter,
  NotificationSettings,
  ModeSettings,
  SettingsState,
} from './types'

export {
  DEFAULT_ARRIVAL_BUFFER_SV_MINUTES,
  DEFAULT_ARRIVAL_BUFFER_REGIONAL_MINUTES,
  MIN_ARRIVAL_BUFFER_MINUTES,
  MAX_ARRIVAL_BUFFER_MINUTES,
  getDefaultArrivalBuffer,
  DEFAULT_MAX_DISTANCE_KM,
  DEFAULT_MAX_TRAVEL_TIME_MINUTES,
  DEFAULT_ARRIVAL_BUFFER_MINUTES,
  DEFAULT_MIN_GAME_GAP_MINUTES,
  DEFAULT_NOTIFICATION_SETTINGS,
  DEFAULT_MODE_SETTINGS,
  DEMO_HOME_LOCATION,
} from './types'

// Re-export store
export { useSettingsStore } from './store'
