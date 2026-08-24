/**
 * Primitive and coercion schemas shared by every API entity schema.
 *
 * These describe field-level shapes only: identifiers, dates, enums and the
 * coercions needed because the backend renders some fields inconsistently.
 */
import { z } from 'zod'

// Common field schemas
export const uuidSchema = z.string().uuid()
export const dateTimeSchema = z.string().datetime({ offset: true }).optional().nullable()

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

// Date schema that accepts:
// - ISO date format: "2024-01-15"
// - ISO datetime format: "2024-12-19T23:00:00.000000+00:00"
// - Empty string: "" (API returns this for unpaid compensations)
// - null (API returns null for unpaid compensations)
export const dateSchema = z
  .union([z.literal(''), z.string().regex(ISO_DATE_PATTERN), z.string().datetime({ offset: true })])
  .optional()
  .nullable()

// Boolean-like schema for API fields that return "0"/"1" strings instead of booleans
export const booleanLikeSchema = z
  .union([z.boolean(), z.string(), z.null()])
  .optional()
  .nullable()
  .transform((val) => {
    if (val === '1' || val === true) return true
    if (val === '0' || val === false) return false
    return null
  })

// Referee position - accept any string from API
export const refereePositionSchema = z.string()

/**
 * Normalizes `linkedDoubleConvocationGameNumberAndRefereePosition` to label parts.
 *
 * The API renders this computed property inconsistently: usually a string, but for
 * some associations (e.g. SRBA) an array of label parts, e.g.
 * ["#401727 | 13.03.2027 18:00 | VB Therwil - VBC Thun", "ARB 2"].
 * Anything unrenderable becomes null so a single odd entry never fails the whole list.
 *
 * The parts are kept separate: this layer settles the shape only, and how they are
 * laid out is the consumer's call. `formatLinkedDoubleConvocation` in
 * `@volleykit/shared/utils` joins them for consumers that want a single line.
 */
function toLinkedDoubleConvocationParts(value: unknown): string[] | null {
  if (typeof value === 'string') return value.trim() ? [value.trim()] : null
  if (typeof value === 'number') return [String(value)]

  if (Array.isArray(value)) {
    const parts = value.flatMap((entry) => toLinkedDoubleConvocationParts(entry) ?? [])
    return parts.length > 0 ? parts : null
  }

  return null
}

// Linked double convocation info - shape varies by association, normalized to label parts
export const linkedDoubleConvocationSchema = z
  .unknown()
  .transform(toLinkedDoubleConvocationParts)
  .optional()

/**
 * An enum whose unrecognised values coerce to null instead of failing the parent.
 *
 * Use for display-only fields. A strict enum rejects its parent object, which
 * rejects that object's parent, and so on up to the nearest list item — so one
 * cosmetic value the backend added can remove a whole row. Fields that drive
 * behaviour (filtering, routing) stay strict: there the item genuinely cannot be
 * handled, and dropping it is what resilient list parsing is for.
 *
 * Built on `transform` rather than `.catch()` on purpose: zod's `ZodCatch`
 * output is `NoUndefined<output<T>>`, which makes an optional key required and
 * changes every inferred response type that contains it.
 */
export function tolerantEnum<const TValues extends readonly string[]>(values: TValues) {
  return z
    .unknown()
    .transform((value) =>
      values.includes(value as TValues[number]) ? (value as TValues[number]) : null
    )
    .optional()
}

/** Gender is rendered as an icon and read by nothing else. */
export const genderSchema = tolerantEnum(['m', 'f'])

/** Transportation mode is display-only, and the backend may add modes. */
export const transportationModeSchema = tolerantEnum(['car', 'train', 'public_transport', 'other'])

// Convocation status enum
export const convocationStatusSchema = z.enum(['active', 'cancelled', 'archived'])

// Exchange status enum
export const exchangeStatusSchema = z.enum(['open', 'applied', 'closed'])

// Permissions schema
export const permissionsSchema = z
  .object({
    canEdit: z.boolean().optional(),
    canDelete: z.boolean().optional(),
    canView: z.boolean().optional(),
  })
  .passthrough()
  .optional()
