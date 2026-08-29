/**
 * Exchange helper functions - eligibility checks for the exchange marketplace.
 */

import type { GameExchange } from '../api'

/**
 * Whether the signed-in referee may take over an exchange entry.
 *
 * The search endpoint returns `_permissions.properties.appliedBy.update` per
 * entry: the server's own verdict on whether the signed-in referee is allowed to
 * apply. It is false when a conflict of interest blocks them - they are
 * registered as a referee for one of the two teams playing that game. Applying
 * anyway is rejected by the backend.
 *
 * The flag is not a level check, so it is taken as-is rather than re-derived
 * from `requiredRefereeLevel`.
 *
 * Entries without the flag are treated as takeable so a missing property never
 * empties the list.
 *
 * @param exchange - The exchange entry to check
 * @returns true when the entry can be taken over (or the server said nothing)
 */
export function canTakeOverExchange(exchange: GameExchange): boolean {
  const canApply = exchange?._permissions?.properties?.appliedBy?.update
  return typeof canApply === 'boolean' ? canApply : true
}

/**
 * Whether an exchange entry was submitted by the given person.
 *
 * @param exchange - The exchange entry to check
 * @param personId - The signed-in referee's person identity
 * @returns true when the person submitted this entry
 */
export function isOwnExchange(exchange: GameExchange, personId: string | undefined): boolean {
  if (!personId) return false
  return exchange?.submittedByPerson?.__identity === personId
}

/**
 * Drops the entries the signed-in referee is not allowed to take over.
 *
 * Own entries survive the filter: the server marks them as not takeable too, but
 * the referee still needs to see them to pull them back off the marketplace.
 *
 * @param exchanges - The exchange entries to filter
 * @param personId - The signed-in referee's person identity
 * @returns Only the entries worth offering to the referee
 */
export function filterTakeableExchanges(
  exchanges: GameExchange[],
  personId: string | undefined
): GameExchange[] {
  return exchanges.filter(
    (exchange) => canTakeOverExchange(exchange) || isOwnExchange(exchange, personId)
  )
}
