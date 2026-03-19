import type { CompensationRecord } from '@/api/client'

import { isCompensationEditable } from './compensation-actions'

/**
 * Searches cached compensation queries to find a compensation matching the game number.
 */
export function findCompensationInCache(
  gameNumber: string | number,
  queries: [unknown, { items: CompensationRecord[] } | undefined][]
): CompensationRecord | null {
  for (const [, data] of queries) {
    // Compare as strings to handle both string and number game numbers from different sources
    const comp = data?.items?.find(
      (c) => String(c.refereeGame?.game?.number) === String(gameNumber)
    )
    if (comp) {
      return comp
    }
  }
  return null
}

/**
 * Finds all editable compensations in cache that are at the same hall.
 * Excludes the current compensation from the results.
 */
export function findOtherEditableCompensationsAtSameHall(
  currentCompensationId: string | undefined,
  hallId: string | undefined,
  queries: [unknown, { items: CompensationRecord[] } | undefined][]
): CompensationRecord[] {
  if (!hallId || !currentCompensationId) return []

  const results: CompensationRecord[] = []
  const seenIds = new Set<string>()

  for (const [, data] of queries) {
    if (!data?.items) continue
    for (const comp of data.items) {
      const compId = comp.convocationCompensation?.__identity
      const compHallId = comp.refereeGame?.game?.hall?.__identity

      // Skip current compensation, already seen, or different hall
      if (!compId || compId === currentCompensationId || seenIds.has(compId)) continue
      if (compHallId !== hallId) continue

      // Only include if editable
      if (isCompensationEditable(comp)) {
        seenIds.add(compId)
        results.push(comp)
      }
    }
  }

  return results
}
