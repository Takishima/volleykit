/**
 * Selector hook for the travel-mode settings.
 *
 * Single place that reads `travelMode` / `maxBikeDistanceKm` from the
 * settings store and applies defaults (defensive against partial store
 * states in tests; the v12 migration guarantees the fields for real users).
 */

import {
  DEFAULT_TRAVEL_MODE,
  DEFAULT_MAX_BIKE_DISTANCE_KM,
  getTravelModeKey,
  type TravelMode,
} from '@/common/services/transport'
import { useSettingsStore } from '@/common/stores/settings'

interface TravelModeSettings {
  /** Selected travel mode */
  travelMode: TravelMode
  /** Maximum cycling distance per leg for the e-bike + train mode (km) */
  maxBikeDistanceKm: number
  /** Cache/query key segment for the selected mode (see getTravelModeKey) */
  travelModeKey: string
}

export function useTravelModeSettings(): TravelModeSettings {
  const travelMode = useSettingsStore(
    (state) => state.travelTimeFilter?.travelMode ?? DEFAULT_TRAVEL_MODE
  )
  const maxBikeDistanceKm = useSettingsStore(
    (state) => state.travelTimeFilter?.maxBikeDistanceKm ?? DEFAULT_MAX_BIKE_DISTANCE_KM
  )

  return {
    travelMode,
    maxBikeDistanceKm,
    travelModeKey: getTravelModeKey(travelMode, maxBikeDistanceKm),
  }
}
