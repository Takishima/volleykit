/**
 * Runtime validation schemas for API responses using Zod.
 *
 * Base schemas are imported from @volleykit/shared. This file adds
 * web-specific schemas (like referee backup) that aren't needed on mobile.
 *
 * ## API Validation Strategy
 *
 * ### When to Validate (ALWAYS do this)
 * - List endpoints (assignments, compensations, exchanges) - validated to ensure
 *   array structure and required fields like `__identity` are present
 * - Any data that will be used for critical business logic or state management
 * - Responses where missing fields could cause runtime errors
 *
 * ### When Validation is Optional
 * - Simple success/failure responses (e.g., logout, apply for exchange)
 * - Endpoints where we only check HTTP status code
 * - Internal/metadata fields not used by the UI (prefixed with _)
 *
 * ### Schema Design Principles
 * - Use `.passthrough()` to allow unknown fields from future API versions
 * - Mark optional fields explicitly with `.optional()` or `.nullable()`
 * - Validate required fields strictly (like `__identity`)
 * - Use enums for known string values (positions, statuses)
 * - Prefer specific error messages over generic validation errors
 */
import { z } from 'zod'

import { logger } from '@/shared/utils/logger'

// Re-export all base schemas from shared package
export {
  // Field schemas
  dateSchema,
  refereePositionSchema,
  convocationStatusSchema,
  exchangeStatusSchema,
  // Entity schemas
  assignmentSchema,
  compensationRecordSchema,
  gameExchangeSchema,
  personSearchResultSchema,
  // Response schemas
  assignmentsResponseSchema,
  compensationsResponseSchema,
  exchangesResponseSchema,
  personSearchResponseSchema,
  // Types
  type Assignment,
  type CompensationRecord,
  type GameExchange,
  type ValidatedPersonSearchResult,
  type AssignmentsResponse,
  type CompensationsResponse,
  type ExchangesResponse,
} from '@volleykit/shared/api'

// Common field schemas for web-specific extensions
const uuidSchema = z.string().uuid()

// ============================================================================
// Web-specific: Referee Backup (Pikett) Schemas
// These are only used in the web app for the backup referee feature
// ============================================================================

// Person details for a backup referee
const backupRefereePersonSchema = z
  .object({
    __identity: uuidSchema.optional(),
    persistenceObjectIdentifier: uuidSchema.optional(),
    associationId: z.number().optional().nullable(),
    displayName: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    gender: z.enum(['m', 'f']).optional().nullable(),
    correspondenceLanguage: z.string().optional(),
    primaryEmailAddress: z
      .object({
        emailAddress: z.string().optional(),
        isPrimary: z.boolean().optional(),
        __identity: uuidSchema.optional(),
      })
      .passthrough()
      .optional()
      .nullable(),
    primaryPhoneNumber: z
      .object({
        localNumber: z.string().optional(),
        normalizedLocalNumber: z.string().optional(),
        numberType: z.string().optional(),
        isPrimary: z.boolean().optional(),
        __identity: uuidSchema.optional(),
      })
      .passthrough()
      .optional()
      .nullable(),
  })
  .passthrough()

// Indoor referee details for backup assignment
const backupIndoorRefereeSchema = z
  .object({
    __identity: uuidSchema.optional(),
    persistenceObjectIdentifier: uuidSchema.optional(),
    person: backupRefereePersonSchema.optional(),
    refereeInformation: z.string().optional(),
    transportationMode: z.string().optional().nullable(),
    validated: z.boolean().optional(),
    mobilePhoneNumbers: z.string().optional().nullable(),
    privatePostalAddresses: z.string().optional().nullable(),
  })
  .passthrough()

// Backup referee assignment
const backupRefereeAssignmentSchema = z
  .object({
    __identity: uuidSchema,
    indoorReferee: backupIndoorRefereeSchema.optional(),
    isDispensed: z.boolean().optional(),
    hasFutureRefereeConvocations: z.boolean().optional(),
    hasResigned: z.boolean().optional(),
    unconfirmedFutureRefereeConvocations: z.boolean().optional(),
    originId: z.number().optional().nullable(),
    createdBy: z.string().optional().nullable(),
    updatedBy: z.string().optional().nullable(),
  })
  .passthrough()

// Referee backup entry (a single date with assigned backup referees)
export const refereeBackupEntrySchema = z
  .object({
    __identity: uuidSchema,
    date: z.string().datetime({ offset: true }),
    weekday: z.string(),
    calendarWeek: z.number(),
    joinedNlaReferees: z.string().optional().nullable(),
    joinedNlbReferees: z.string().optional().nullable(),
    nlaReferees: z.array(backupRefereeAssignmentSchema).optional(),
    nlbReferees: z.array(backupRefereeAssignmentSchema).optional(),
  })
  .passthrough()

// Referee backup search response
export const refereeBackupResponseSchema = z.object({
  items: z.array(refereeBackupEntrySchema),
  totalItemsCount: z.number(),
  entityTemplate: z.unknown().optional().nullable(),
})

// ============================================================================
// Validation helper (re-exported from shared with web-specific logging)
// ============================================================================

/**
 * Validates API response data against a Zod schema.
 * Returns the validated data or throws a descriptive error.
 */
export function validateResponse<T>(data: unknown, schema: z.ZodType<T>, context: string): T {
  const result = schema.safeParse(data)

  if (!result.success) {
    const errorDetails = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ')

    logger.error(`API validation error (${context}):`, result.error.issues)
    throw new Error(`Invalid API response for ${context}: ${errorDetails}`)
  }

  return result.data
}
