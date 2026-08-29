/**
 * Exchange helper functions - eligibility checks for the exchange marketplace.
 */

import type { GameExchange } from '../api'

/**
 * Whether the signed-in referee may take over an exchange entry.
 *
 * The search endpoint returns `_permissions.properties.appliedBy.update` per
 * entry: the server's own verdict on whether the signed-in referee is allowed to
 * apply. Applying to an entry marked false is rejected by the backend.
 *
 * The verdict covers every rule the backend applies - a league tier the region
 * keeps for its own club referees, a referee registered as referee for one of
 * the two playing teams, an explicit ban. Which one fired is not reported, so
 * the flag is taken as-is and never re-derived from `requiredRefereeLevel` (see
 * docs/api/exchanges_api.md for the captured evidence).
 *
 * Entries without the flag are treated as takeable so a missing property never
 * empties the list. The optional chaining is the only real guard: `GameExchange`
 * resolves to `any` (its schema is declared `z.ZodType<any>` to stay under the TS
 * serialization limit), so `exchangePermissionsSchema` documents the payload
 * rather than enforcing it here.
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
 * Whether an entry is worth offering to the signed-in referee.
 *
 * Own entries qualify even when the server marks them as not takeable: the
 * referee still needs to see them to pull them back off the marketplace.
 *
 * Callers that filter a wrapper type rather than the entries themselves use this
 * predicate directly, so both platforms decide with the same rule.
 *
 * @param exchange - The exchange entry to check
 * @param personId - The signed-in referee's person identity
 * @returns true when the entry should stay in the list
 */
export function isTakeableOrOwn(exchange: GameExchange, personId: string | undefined): boolean {
  return canTakeOverExchange(exchange) || isOwnExchange(exchange, personId)
}

/**
 * Drops the entries the signed-in referee is not allowed to take over.
 *
 * @param exchanges - The exchange entries to filter
 * @param personId - The signed-in referee's person identity
 * @returns Only the entries worth offering to the referee
 */
export function filterTakeableExchanges(
  exchanges: GameExchange[],
  personId: string | undefined
): GameExchange[] {
  return exchanges.filter((exchange) => isTakeableOrOwn(exchange, personId))
}
