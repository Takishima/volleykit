/**
 * Resilient list parsing.
 *
 * A strict `z.array(itemSchema)` discards the entire list when a single item
 * fails to parse, so one association returning an unexpected shape blanks the
 * whole screen. These factories parse items individually instead: valid items
 * are kept and invalid ones are dropped onto `droppedItems`, where
 * `validateResponse` logs them.
 *
 * `droppedItems` survives at runtime everywhere, but a platform that casts list
 * responses to its own generated types will not see the field through
 * TypeScript. Such consumers read it with `getDroppedListItems` from
 * `@volleykit/shared/api`.
 */
import { z } from 'zod'

/** A list item that failed to parse, with its position in the original payload. */
export interface DroppedListItem {
  index: number
  issues: Array<{ path: PropertyKey[]; message: string }>
}

/** A parsed list response with the items that could not be parsed alongside it. */
export interface ResilientList<TItem> {
  items: TItem[]
  totalItemsCount: number
  droppedItems: DroppedListItem[]
}

const NO_ITEMS_COUNT = 0

function toResilientList<TItem>(
  items: unknown[],
  totalItemsCount: number,
  itemSchema: z.ZodTypeAny
): ResilientList<TItem> {
  const kept: TItem[] = []
  const droppedItems: DroppedListItem[] = []

  items.forEach((entry, index) => {
    const parsed = itemSchema.safeParse(entry)
    if (parsed.success) {
      // `z.ZodTypeAny` widens safeParse's payload; callers pin TItem to
      // `z.output<TSchema>`, which is exactly what a successful parse yields.
      kept.push(parsed.data as TItem)
    } else {
      droppedItems.push({ index, issues: parsed.error.issues })
    }
  })

  return {
    // `totalItemsCount` is the server's total across all pages and is passed
    // through untouched: it must stay page-invariant, so a page-local drop count
    // is never subtracted from it. Per-page counts are `items.length` and
    // `droppedItems.length`.
    items: kept,
    totalItemsCount,
    droppedItems,
  }
}

/**
 * Builds a paginated list response schema that tolerates malformed items.
 *
 * `totalItemsCount` is optional because a missing count is no reason to discard
 * items that parsed fine; consumers already treat it as best-effort.
 *
 * The item type is read off the schema's *output* side. `z.ZodType<TItem>`
 * collapses input and output onto one parameter, so an item schema containing a
 * transform (see `tolerantEnum`) would infer the input type instead and every
 * response type built from it would silently describe the wrong shape.
 *
 * @param itemSchema - Schema applied to each entry of `items`.
 */
export function resilientListSchema<TSchema extends z.ZodTypeAny>(itemSchema: TSchema) {
  return z
    .object({
      items: z.array(z.unknown()),
      totalItemsCount: z.number().optional().default(NO_ITEMS_COUNT),
    })
    .transform(({ items, totalItemsCount }) =>
      toResilientList<z.output<TSchema>>(items, totalItemsCount, itemSchema)
    )
}

/**
 * Same as {@link resilientListSchema}, for search endpoints that omit `items`
 * entirely when there is nothing to return.
 */
export function optionalResilientListSchema<TSchema extends z.ZodTypeAny>(itemSchema: TSchema) {
  return z
    .object({
      items: z
        .array(z.unknown())
        .optional()
        .default(() => []),
      totalItemsCount: z.number().optional().default(NO_ITEMS_COUNT),
    })
    .transform(({ items, totalItemsCount }) =>
      toResilientList<z.output<TSchema>>(items, totalItemsCount, itemSchema)
    )
}

/**
 * Reads `droppedItems` off a parsed response.
 *
 * `validateResponse` is generic over the schema, so it cannot reach the field
 * through the type system.
 */
export function getDroppedListItems(data: unknown): DroppedListItem[] {
  if (typeof data !== 'object' || data === null) return []

  const dropped = (data as { droppedItems?: unknown }).droppedItems
  return Array.isArray(dropped) ? (dropped as DroppedListItem[]) : []
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
