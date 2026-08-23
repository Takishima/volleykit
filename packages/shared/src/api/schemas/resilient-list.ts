/**
 * Resilient list parsing.
 *
 * A strict `z.array(itemSchema)` discards the entire list when a single item
 * fails to parse, so one association returning an unexpected shape blanks the
 * whole screen. These helpers parse items individually instead: valid items are
 * kept, invalid ones are dropped and recorded so `validateResponse` can report
 * them.
 */
import { z } from 'zod'

/** A list item that failed to parse, with its position in the original payload. */
export interface DroppedListItem {
  index: number
  issues: Array<{ path: PropertyKey[]; message: string }>
}

/**
 * Diagnostics for parsed list responses, kept beside the payload rather than in
 * it so response shapes (and anything cached offline) stay unchanged. An entry
 * is garbage-collected together with the response object it describes.
 */
const droppedItemsByResponse = new WeakMap<object, DroppedListItem[]>()

function partitionItems<TItem>(items: unknown[], itemSchema: z.ZodType<TItem>) {
  const kept: TItem[] = []
  const dropped: DroppedListItem[] = []

  items.forEach((entry, index) => {
    const parsed = itemSchema.safeParse(entry)
    if (parsed.success) {
      kept.push(parsed.data)
    } else {
      dropped.push({ index, issues: parsed.error.issues })
    }
  })

  return { kept, dropped }
}

/**
 * Builds a paginated list response schema that tolerates malformed items.
 *
 * `totalItemsCount` is decremented by the number of dropped items so pagination
 * stays consistent with the items actually returned. The envelope passes other
 * keys through untouched (e.g. `entityTemplate` on the referee backup search).
 *
 * @param itemSchema - Schema applied to each entry of `items`.
 */
export function resilientListSchema<TItem>(itemSchema: z.ZodType<TItem>) {
  return z
    .object({
      items: z.array(z.unknown()),
      totalItemsCount: z.number(),
    })
    .passthrough()
    .transform(({ items, totalItemsCount, ...rest }) => {
      const { kept, dropped } = partitionItems(items, itemSchema)

      const response = {
        ...rest,
        items: kept,
        totalItemsCount: Math.max(0, totalItemsCount - dropped.length),
      }

      if (dropped.length > 0) droppedItemsByResponse.set(response, dropped)

      return response
    })
}

/** Reads the dropped-item diagnostics recorded by {@link resilientListSchema}. */
export function getDroppedListItems(data: unknown): DroppedListItem[] {
  if (typeof data !== 'object' || data === null) return []

  return droppedItemsByResponse.get(data) ?? []
}

/** Formats dropped-item diagnostics into a single log-friendly line. */
export function formatDroppedListItems(dropped: DroppedListItem[]): string {
  return dropped
    .map(
      ({ index, issues }) =>
        `[${index}] ${issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')}`
    )
    .join(' | ')
}
