/**
 * Runtime validation for API responses.
 *
 * The schemas themselves live in `./schemas`, grouped by domain, and are
 * re-exported here so `@volleykit/shared/api` consumers keep a single import
 * surface. This module owns the inferred types and the `validateResponse`
 * helper that turns a schema failure into a descriptive error.
 *
 * Extracted from web-app/src/api/validation.ts for cross-platform use.
 */
import type { z } from 'zod'

import {
  assignmentSchema,
  assignmentsResponseSchema,
  compensationDetailedSchema,
  compensationRecordSchema,
  compensationsResponseSchema,
  exchangesResponseSchema,
  fileResourceSchema,
  gameDetailsResponseSchema,
  gameDetailsSchema,
  gameExchangeSchema,
  nominationListResponseSchema,
  nominationListSchema,
  personSearchResponseSchema,
  personSearchResultSchema,
  possibleNominationsResponseSchema,
  refereeAbsenceSchema,
  refereeAbsencesResponseSchema,
  refereeBackupEntrySchema,
  refereeBackupResponseSchema,
  scoresheetSchema,
  scoresheetValidationSchema,
  formatDroppedListItems,
  getDroppedListItems,
} from './schemas'

export * from './schemas'

// Type exports inferred from Zod schemas
export type Assignment = z.infer<typeof assignmentSchema>
export type CompensationRecord = z.infer<typeof compensationRecordSchema>
export type GameExchange = z.infer<typeof gameExchangeSchema>
export type ValidatedPersonSearchResult = z.infer<typeof personSearchResultSchema>
export type AssignmentsResponse = z.infer<typeof assignmentsResponseSchema>
export type CompensationsResponse = z.infer<typeof compensationsResponseSchema>
export type ExchangesResponse = z.infer<typeof exchangesResponseSchema>
export type ConvocationCompensationDetailed = z.infer<typeof compensationDetailedSchema>
// PickExchangeResponse is defined as an interface in client.ts
export type Scoresheet = z.infer<typeof scoresheetSchema>
export type ScoresheetValidation = z.infer<typeof scoresheetValidationSchema>
export type FileResource = z.infer<typeof fileResourceSchema>
export type NominationList = z.infer<typeof nominationListSchema>
export type NominationListResponse = z.infer<typeof nominationListResponseSchema>
export type GameDetails = z.infer<typeof gameDetailsSchema>
export type GameDetailsResponse = z.infer<typeof gameDetailsResponseSchema>
export type PossibleNominationsResponse = z.infer<typeof possibleNominationsResponseSchema>
export type PersonSearchResponse = z.infer<typeof personSearchResponseSchema>
export type RefereeBackupEntry = z.infer<typeof refereeBackupEntrySchema>
export type RefereeBackupSearchResponse = z.infer<typeof refereeBackupResponseSchema>
export type RefereeAbsence = z.infer<typeof refereeAbsenceSchema>
export type RefereeAbsencesResponse = z.infer<typeof refereeAbsencesResponseSchema>

// Association settings type (simplified for mobile)
export interface AssociationSettings {
  __identity?: string
  hoursAfterGameStartForRefereeToEditGameList?: number
  associationName?: string
}

// Season type (simplified for mobile)
export interface Season {
  __identity?: string
  name?: string
  startDate?: string
  endDate?: string
}

/**
 * A structural type for Zod schemas that works with both Zod 3 and Zod 4.
 * This avoids type incompatibilities between versions.
 */
export interface ZodLikeSchema<T> {
  safeParse(
    data: unknown
  ):
    | { success: true; data: T }
    | { success: false; error: { issues: Array<{ path: PropertyKey[]; message: string }> } }
}

/** Sink for validation diagnostics, so each platform can supply its own logger. */
export type ValidationErrorLogger = (message: string, ...args: unknown[]) => void

/**
 * Builds a `validateResponse` bound to a platform's error logger.
 *
 * The returned function validates API response data against a Zod schema and
 * returns the validated data or throws a descriptive error. Items dropped by a
 * resilient list schema are reported but do not throw.
 */
export function createValidateResponse(logError: ValidationErrorLogger) {
  return function validateResponse<T>(data: unknown, schema: ZodLikeSchema<T>, context: string): T {
    const result = schema.safeParse(data)

    if (!result.success) {
      const errorDetails = result.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ')

      logError(`API validation error (${context}):`, result.error.issues)
      throw new Error(`Invalid API response for ${context}: ${errorDetails}`)
    }

    const dropped = getDroppedListItems(result.data)
    if (dropped.length > 0) {
      logError(
        `API validation dropped ${dropped.length} invalid item(s) (${context}): ${formatDroppedListItems(dropped)}`
      )
    }

    return result.data
  }
}

/** Default `validateResponse` for platforms without their own logger. */
export const validateResponse = createValidateResponse((message, ...args) => {
  console.error(message, ...args)
})

/**
 * Compile-time guard on the resilient list factories.
 *
 * They must expose each item's *output* type. `z.ZodType<T>` collapsed input and
 * output onto one parameter, so an item schema containing a transform could make
 * them infer the input side instead — `gender` became `unknown` on every type
 * built from the factory. Only the one site that pinned a zod-inferred type
 * explicitly failed to compile; everywhere else the wrong type was simply
 * accepted, since `unknown` swallows any comparison.
 *
 * Mutual assignability is the check that matters: it fails whichever way the two
 * diverge, and it fails here, in shared's own typecheck, with a name that says
 * what went wrong.
 */
type Exact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
type AssertTrue<T extends true> = T

// Exported on purpose. It is never referenced — failing to compile is its whole
// job — and web typechecks this package's *source* with `noUnusedLocals`, so a
// module-local alias fails web's build (TS6196) even though shared's own
// tsconfig would accept it.
// Covers `optionalResilientListSchema`, which person search and possible
// nominations use.
export type PersonSearchItemsAreSchemaOutput = AssertTrue<
  Exact<PersonSearchResponse['items'][number], ValidatedPersonSearchResult>
>

// `resilientListSchema` is a separate function body carrying four of the six
// list responses, so it needs its own cover. Both item schemas below reach
// `tolerantEnum`, which is what makes input and output differ; exchanges are
// skipped because `gameExchangeSchema` is `z.ZodType<any>` and `Exact` would
// hold vacuously.
export type AssignmentItemsAreSchemaOutput = AssertTrue<
  Exact<AssignmentsResponse['items'][number], Assignment>
>

export type BackupItemsAreSchemaOutput = AssertTrue<
  Exact<RefereeBackupSearchResponse['items'][number], RefereeBackupEntry>
>
