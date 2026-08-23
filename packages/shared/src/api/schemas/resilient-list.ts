/**
 * Resilient list parsing.
 *
 * A strict `z.array(itemSchema)` discards the entire list when a single item
 * fails to parse, so one association returning an unexpected shape blanks the
 * whole screen. These factories parse items individually instead: valid items
 * are kept and invalid ones are dropped onto `droppedItems`, where
 * `validateResponse` logs them.
 *
 * `droppedItems` survives at runtime everywhere, but web's API layer casts list
 * responses to the generated OpenAPI types, so TypeScript there does not see the
 * field — web consumers read it with `getDroppedListItems`.
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
  itemSchema: z.ZodType<TItem>
): ResilientList<TItem> {
  const kept: TItem[] = []
  const droppedItems: DroppedListItem[] = []

  items.forEach((entry, index) => {
    const parsed = itemSchema.safeParse(entry)
    if (parsed.success) {
      kept.push(parsed.data)
    } else {
      droppedItems.push({ index, issues: parsed.error.issues })
    }
  })

  return {
    // `totalItemsCount` is the server's total across all pages and is passed
    // through untouched. Subtracting a page-local drop count would make it
    // differ per page, which breaks the stall detection in `usePaginatedQuery`.
    // Per-page counts come from `items.length` and `droppedItems.length`.
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
 * @param itemSchema - Schema applied to each entry of `items`.
 */
export function resilientListSchema<TItem>(itemSchema: z.ZodType<TItem>) {
  return z
    .object({
      items: z.array(z.unknown()),
      totalItemsCount: z.number().optional().default(NO_ITEMS_COUNT),
    })
    .transform(({ items, totalItemsCount }) => toResilientList(items, totalItemsCount, itemSchema))
}

/**
 * Same as {@link resilientListSchema}, for search endpoints that omit `items`
 * entirely when there is nothing to return.
 */
export function optionalResilientListSchema<TItem>(itemSchema: z.ZodType<TItem>) {
  return z
    .object({
      items: z
        .array(z.unknown())
        .optional()
        .default(() => []),
      totalItemsCount: z.number().optional().default(NO_ITEMS_COUNT),
    })
    .transform(({ items, totalItemsCount }) => toResilientList(items, totalItemsCount, itemSchema))
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
