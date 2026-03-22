/**
 * Runtime validation schemas for API responses using Zod.
 *
 * All schemas are centralized in @volleykit/shared and re-exported here.
 * This file adds the web-specific validation helper that uses the app logger.
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

import { logger } from '@/common/utils/logger'

import type { ZodLikeSchema } from '@volleykit/shared/api'

// Re-export all schemas from shared package
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
  // Detail / mutation schemas
  compensationDetailedSchema,
  pickExchangeResponseSchema,
  fileResourceArraySchema,
  scoresheetValidationSchema,
  scoresheetSchema,
  nominationListSchema,
  nominationListResponseSchema,
  gameDetailsResponseSchema,
  associationSettingsSchema,
  seasonSchema,
  possibleNominationsResponseSchema,
  // Referee backup schemas
  refereeBackupEntrySchema,
  refereeBackupResponseSchema,
  // Types
  type Assignment,
  type CompensationRecord,
  type GameExchange,
  type ValidatedPersonSearchResult,
  type AssignmentsResponse,
  type CompensationsResponse,
  type ExchangesResponse,
  type ZodLikeSchema,
} from '@volleykit/shared/api'

// ============================================================================
// Validation helper (uses web-specific logger)
// ============================================================================

/**
 * Validates API response data against a Zod schema.
 * Returns the validated data or throws a descriptive error.
 */
export function validateResponse<T>(data: unknown, schema: ZodLikeSchema<T>, context: string): T {
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
