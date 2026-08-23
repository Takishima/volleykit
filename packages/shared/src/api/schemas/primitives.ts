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

const LINKED_DOUBLE_CONVOCATION_SEPARATOR = ' | '

/**
 * Normalizes `linkedDoubleConvocationGameNumberAndRefereePosition` to a display string.
 *
 * The API renders this computed property inconsistently: usually a string, but for
 * some associations (e.g. SRBA) an array of label parts, e.g.
 * ["#401727 | 13.03.2027 18:00 | VB Therwil - VBC Thun", "ARB 2"].
 * Anything unrenderable becomes null so a single odd entry never fails the whole list.
 */
function formatLinkedDoubleConvocation(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() || null
  if (typeof value === 'number') return String(value)

  if (Array.isArray(value)) {
    const parts = value
      .map(formatLinkedDoubleConvocation)
      .filter((part): part is string => part !== null)
    return parts.length > 0 ? parts.join(LINKED_DOUBLE_CONVOCATION_SEPARATOR) : null
  }

  return null
}

// Linked double convocation info - shape varies by association, normalized to a string
export const linkedDoubleConvocationSchema = z
  .unknown()
  .transform(formatLinkedDoubleConvocation)
  .optional()

/**
 * Gender, tolerant of values outside the known set.
 *
 * Display-only, and it sits below the list-item boundary in the referee backup
 * tree: a strict enum there fails the person, which fails the referee
 * assignment, which drops the whole Pikett date row. Anything unrecognised
 * becomes null instead.
 */
export const toleratedGenderSchema = z
  .unknown()
  .transform((value) => (value === 'm' || value === 'f' ? value : null))
  .optional()

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
