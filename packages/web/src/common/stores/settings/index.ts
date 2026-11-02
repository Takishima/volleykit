/**
 * Settings store module.
 *
 * Split into:
 * - types.ts: Type definitions, constants, and defaults
 * - migrations.ts: Persistence migration functions
 * - store.ts: Zustand store implementation
 */

// Re-export everything from types
// (travel-mode types/constants live in @/common/services/transport)
export type { UserLocation, SbbDestinationType } from './types'

export {
  MIN_ARRIVAL_BUFFER_MINUTES,
  MAX_ARRIVAL_BUFFER_MINUTES,
  getDefaultArrivalBuffer,
  DEFAULT_MAX_DISTANCE_KM,
  DEFAULT_MAX_TRAVEL_TIME_MINUTES,
  DEMO_HOME_LOCATION,
} from './types'

// Re-export store
export { useSettingsStore } from './store'
