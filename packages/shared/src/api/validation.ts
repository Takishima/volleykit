/**
 * Runtime validation schemas for API responses using Zod.
 *
 * These schemas validate that the API returns data in the expected format,
 * providing early error detection and better error messages when the backend
 * returns unexpected data structures.
 *
 * Extracted from web-app/src/api/validation.ts for cross-platform use.
 */
import { z } from 'zod';

// Common field schemas
const uuidSchema = z.string().uuid();
const dateTimeSchema = z.string().datetime({ offset: true }).optional().nullable();

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Date schema that accepts:
// - ISO date format: "2024-01-15"
// - ISO datetime format: "2024-12-19T23:00:00.000000+00:00"
// - Empty string: "" (API returns this for unpaid compensations)
// - null (API returns null for unpaid compensations)
export const dateSchema = z
  .union([z.literal(''), z.string().regex(ISO_DATE_PATTERN), z.string().datetime({ offset: true })])
  .optional()
  .nullable();

// Boolean-like schema for API fields that return "0"/"1" strings instead of booleans
const booleanLikeSchema = z
  .union([z.boolean(), z.string(), z.null()])
  .optional()
  .nullable()
  .transform((val) => {
    if (val === '1' || val === true) return true;
    if (val === '0' || val === false) return false;
    return null;
  });

// Referee position - accept any string from API
export const refereePositionSchema = z.string();

// Convocation status enum
export const convocationStatusSchema = z.enum(['active', 'cancelled', 'archived']);

// Exchange status enum
export const exchangeStatusSchema = z.enum(['open', 'applied', 'closed']);

// Permissions schema
const permissionsSchema = z
  .object({
    canEdit: z.boolean().optional(),
    canDelete: z.boolean().optional(),
    canView: z.boolean().optional(),
  })
  .passthrough()
  .optional();

// Team schema
const teamSchema = z
  .object({
    __identity: uuidSchema.optional(),
    name: z.string().optional(),
    shortName: z.string().optional().nullable(),
  })
  .passthrough();

// Hall schema
const hallSchema = z
  .object({
    __identity: uuidSchema.optional(),
    name: z.string().optional(),
    shortName: z.string().optional().nullable(),
    primaryPostalAddress: z
      .object({
        combinedAddress: z.string().optional(),
        postalCode: z.string().optional(),
        city: z.string().optional(),
        geographicalLocation: z
          .object({
            plusCode: z.string().optional(),
            latitude: z.number().optional(),
            longitude: z.number().optional(),
          })
          .passthrough()
          .optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

// Game schema (nested in referee game)
const gameSchema = z
  .object({
    __identity: uuidSchema.optional(),
    gameNumber: z.string().optional(),
    startingDateTime: dateTimeSchema,
    teamHome: teamSchema.optional(),
    teamAway: teamSchema.optional(),
    hall: hallSchema.optional(),
  })
  .passthrough();

// Person summary schema
const personSummarySchema = z
  .object({
    __identity: uuidSchema.optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    shortName: z.string().optional().nullable(),
    displayName: z.string().optional(),
  })
  .passthrough();

// Referee convocation reference schema
const refereeConvocationRefSchema = z
  .object({
    indoorAssociationReferee: z
      .object({
        indoorReferee: z
          .object({
            person: personSummarySchema.optional(),
          })
          .passthrough()
          .optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough()
  .nullable();

// Referee game schema
const refereeGameSchema = z
  .object({
    __identity: uuidSchema.optional(),
    game: gameSchema.optional(),
  })
  .passthrough();

// Referee game for exchange (includes more details)
const refereeGameForExchangeSchema = z
  .object({
    __identity: uuidSchema.optional(),
    game: gameSchema.optional(),
    activeRefereeConvocationFirstHeadReferee: refereeConvocationRefSchema.optional(),
    activeRefereeConvocationSecondHeadReferee: refereeConvocationRefSchema.optional(),
    activeRefereeConvocationFirstLinesman: refereeConvocationRefSchema.optional(),
    activeRefereeConvocationSecondLinesman: refereeConvocationRefSchema.optional(),
    activeRefereeConvocationThirdLinesman: refereeConvocationRefSchema.optional(),
    activeRefereeConvocationFourthLinesman: refereeConvocationRefSchema.optional(),
    activeRefereeConvocationStandbyHeadReferee: refereeConvocationRefSchema.optional(),
    activeRefereeConvocationStandbyLinesman: refereeConvocationRefSchema.optional(),
  })
  .passthrough();

// Assignment schema
export const assignmentSchema = z
  .object({
    __identity: uuidSchema,
    refereeGame: refereeGameSchema,
    refereeConvocationStatus: convocationStatusSchema,
    refereePosition: refereePositionSchema,
    confirmationStatus: z.string().optional().nullable(),
    confirmationDate: dateTimeSchema,
    isOpenEntryInRefereeGameExchange: booleanLikeSchema,
    hasLastMessageToReferee: booleanLikeSchema,
    hasLinkedDoubleConvocation: booleanLikeSchema,
    linkedDoubleConvocationGameNumberAndRefereePosition: z.string().optional().nullable(),
    _permissions: permissionsSchema,
  })
  .passthrough();

// Convocation compensation schema
const convocationCompensationSchema = z
  .object({
    __identity: uuidSchema.optional(),
    paymentDone: z.boolean().optional(),
    payGameCompensation: z.boolean().optional(),
    gameCompensation: z.number().optional(),
    payTravelExpenses: z.boolean().optional(),
    travelExpenses: z.number().optional(),
    publicTransportExpenses: z.number().optional().nullable(),
    travelExpensesPercentageWeighting: z.number().optional(),
    distanceInMetres: z.number().optional(),
    transportationMode: z.enum(['car', 'train', 'public_transport', 'other']).optional().nullable(),
    paymentValueDate: dateSchema,
    gameCompensationFormatted: z.string().optional(),
    travelExpensesFormatted: z.string().optional(),
    costFormatted: z.string().optional(),
    distanceFormatted: z.string().optional().nullable(),
  })
  .passthrough();

// Compensation record schema
export const compensationRecordSchema = z
  .object({
    __identity: uuidSchema,
    refereeGame: refereeGameSchema,
    convocationCompensation: convocationCompensationSchema,
    refereeConvocationStatus: convocationStatusSchema,
    compensationDate: dateTimeSchema,
    refereePosition: refereePositionSchema,
    _permissions: permissionsSchema,
  })
  .passthrough();

// Game exchange schema
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Explicit any needed to avoid TS7056 (type serialization limit)
export const gameExchangeSchema: z.ZodType<any> = z
  .object({
    __identity: uuidSchema,
    refereeGame: refereeGameForExchangeSchema,
    status: exchangeStatusSchema,
    createdAt: dateTimeSchema,
    submittedByPerson: personSummarySchema.optional(),
    exchangeReason: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    refereePosition: refereePositionSchema,
    requiredRefereeLevel: z.string().optional().nullable(),
    _permissions: permissionsSchema,
  })
  .passthrough();

// Person search result schema
export const personSearchResultSchema = z
  .object({
    __identity: uuidSchema,
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    displayName: z.string().optional(),
    associationId: z.number().optional().nullable(),
    birthday: dateTimeSchema,
    gender: z.enum(['m', 'f']).optional().nullable(),
    _permissions: permissionsSchema,
  })
  .passthrough();

// Response schemas
export const assignmentsResponseSchema = z.object({
  items: z.array(assignmentSchema),
  totalItemsCount: z.number(),
});

export const compensationsResponseSchema = z.object({
  items: z.array(compensationRecordSchema),
  totalItemsCount: z.number(),
});

export const exchangesResponseSchema = z.object({
  items: z.array(gameExchangeSchema),
  totalItemsCount: z.number(),
});

export const personSearchResponseSchema = z.object({
  items: z.array(personSearchResultSchema).optional(),
  totalItemsCount: z.number().optional(),
});

// Type exports inferred from Zod schemas
export type Assignment = z.infer<typeof assignmentSchema>;
export type CompensationRecord = z.infer<typeof compensationRecordSchema>;
export type GameExchange = z.infer<typeof gameExchangeSchema>;
export type ValidatedPersonSearchResult = z.infer<typeof personSearchResultSchema>;
export type AssignmentsResponse = z.infer<typeof assignmentsResponseSchema>;
export type CompensationsResponse = z.infer<typeof compensationsResponseSchema>;
export type ExchangesResponse = z.infer<typeof exchangesResponseSchema>;

// Association settings type (simplified for mobile)
export interface AssociationSettings {
  __identity?: string;
  hoursAfterGameStartForRefereeToEditGameList?: number;
  associationName?: string;
}

// Season type (simplified for mobile)
export interface Season {
  __identity?: string;
  name?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * A structural type for Zod schemas that works with both Zod 3 and Zod 4.
 * This avoids type incompatibilities between versions.
 */
interface ZodLikeSchema<T> {
  safeParse(data: unknown): { success: true; data: T } | { success: false; error: { issues: Array<{ path: PropertyKey[]; message: string }> } };
}

/**
 * Validates API response data against a Zod schema.
 * Returns the validated data or throws a descriptive error.
 */
export function validateResponse<T>(data: unknown, schema: ZodLikeSchema<T>, context: string): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    const errorDetails = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');

    console.error(`API validation error (${context}):`, result.error.issues);
    throw new Error(`Invalid API response for ${context}: ${errorDetails}`);
  }

  return result.data;
}
