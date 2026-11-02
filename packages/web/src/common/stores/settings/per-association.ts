/**
 * Per-association setting resolution.
 *
 * Several mode settings carry a global value plus an optional override per
 * association code. These helpers pick the override when one exists for the
 * given association and fall back to the global value otherwise, so every
 * reader (store getters, filter menu, filtering hooks) agrees on the result.
 */

import type { DistanceFilter, TravelTimeFilter } from './types'

function overrideFor<T>(
  byAssociation: Record<string, T> | undefined,
  associationCode: string | undefined
): T | undefined {
  return associationCode ? byAssociation?.[associationCode] : undefined
}

/**
 * Only the distance limit is per association. The `enabled` flag stored on an
 * override is a snapshot taken when it was created; the global
 * `distanceFilter.enabled` is the one readers and the toggle use.
 */
export function resolveMaxDistanceKm(
  distanceFilter: DistanceFilter,
  byAssociation: Record<string, DistanceFilter> | undefined,
  associationCode: string | undefined
): number {
  return (overrideFor(byAssociation, associationCode) ?? distanceFilter).maxDistanceKm
}

export function resolveMaxTravelTimeMinutes(
  travelTimeFilter: TravelTimeFilter,
  associationCode: string | undefined
): number {
  return (
    overrideFor(travelTimeFilter.maxTravelTimeByAssociation, associationCode) ??
    travelTimeFilter.maxTravelTimeMinutes
  )
}

export function resolveTransportEnabled(
  transportEnabled: boolean,
  byAssociation: Record<string, boolean> | undefined,
  associationCode: string | undefined
): boolean {
  return overrideFor(byAssociation, associationCode) ?? transportEnabled
}
