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

export function resolveDistanceFilter(
  distanceFilter: DistanceFilter,
  byAssociation: Record<string, DistanceFilter> | undefined,
  associationCode: string | undefined
): DistanceFilter {
  return overrideFor(byAssociation, associationCode) ?? distanceFilter
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
