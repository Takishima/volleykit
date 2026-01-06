/**
 * Runtime validation schemas for API responses using Zod.
 *
 * These schemas validate that the API returns data in the expected format,
 * providing early error detection and better error messages when the backend
 * returns unexpected data structures.
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
import { z } from "zod";
import { logger } from "@/shared/utils/logger";

// Common field schemas
const uuidSchema = z.string().uuid();
const dateTimeSchema = z
  .string()
  .datetime({ offset: true })
  .optional()
  .nullable();

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Date schema that accepts:
// - ISO date format: "2024-01-15"
// - ISO datetime format: "2024-12-19T23:00:00.000000+00:00" (API returns this for paymentValueDate)
// - Empty string: "" (API returns this for unpaid compensations)
// - null (API returns null for unpaid compensations)
// Use z.union() with built-in validators instead of custom regex for:
// - Better type safety (Zod's battle-tested datetime validation)
// - Clearer intent (explicit format separation)
// - Better error messages
export const dateSchema = z
  .union([
    z.literal(""),
    z.string().regex(ISO_DATE_PATTERN),
    z.string().datetime({ offset: true }),
  ])
  .optional()
  .nullable();

// Boolean-like schema for API fields that return "0"/"1" strings instead of booleans
// The API inconsistently returns these as strings, booleans, or null
// Transform normalizes to boolean to avoid bugs (e.g., "0" is truthy in JS)
const booleanLikeSchema = z
  .union([z.boolean(), z.string(), z.null()])
  .optional()
  .nullable()
  .transform((val) => {
    if (val === "1" || val === true) return true;
    if (val === "0" || val === false) return false;
    return null;
  });

// Referee position - accept any string from API
// Known values: head-one, head-two, linesman-one, linesman-two, linesman-three,
// linesman-four, standby-head, standby-linesman
// API may return other values not yet documented
export const refereePositionSchema = z.string();

// Convocation status enum
export const convocationStatusSchema = z.enum([
  "active",
  "cancelled",
  "archived",
]);

// Exchange status enum
export const exchangeStatusSchema = z.enum(["open", "applied", "closed"]);

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

// Referee convocation reference schema (for head referee assignments)
// Structure: { indoorAssociationReferee: { indoorReferee: { person: PersonSummary } } }
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
    // Head referees
    activeRefereeConvocationFirstHeadReferee:
      refereeConvocationRefSchema.optional(),
    activeRefereeConvocationSecondHeadReferee:
      refereeConvocationRefSchema.optional(),
    // Linesmen (1-4)
    activeRefereeConvocationFirstLinesman:
      refereeConvocationRefSchema.optional(),
    activeRefereeConvocationSecondLinesman:
      refereeConvocationRefSchema.optional(),
    activeRefereeConvocationThirdLinesman:
      refereeConvocationRefSchema.optional(),
    activeRefereeConvocationFourthLinesman:
      refereeConvocationRefSchema.optional(),
    // Standby referees
    activeRefereeConvocationStandbyHeadReferee:
      refereeConvocationRefSchema.optional(),
    activeRefereeConvocationStandbyLinesman:
      refereeConvocationRefSchema.optional(),
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
    // These fields return "0"/"1" strings from the API, not booleans
    isOpenEntryInRefereeGameExchange: booleanLikeSchema,
    hasLastMessageToReferee: booleanLikeSchema,
    hasLinkedDoubleConvocation: booleanLikeSchema,
    linkedDoubleConvocationGameNumberAndRefereePosition: z
      .string()
      .optional()
      .nullable(),
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
    transportationMode: z
      .enum(["car", "train", "public_transport", "other"])
      .optional()
      .nullable(),
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
export const gameExchangeSchema = z
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

// Person search result schema (for scorer search)
export const personSearchResultSchema = z
  .object({
    __identity: uuidSchema,
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    displayName: z.string().optional(),
    associationId: z.number().optional().nullable(),
    birthday: dateTimeSchema,
    gender: z.enum(["m", "f"]).optional().nullable(),
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
export type ValidatedPersonSearchResult = z.infer<
  typeof personSearchResultSchema
>;

/**
 * Validates API response data against a Zod schema.
 * Returns the validated data or throws a descriptive error.
 */
export function validateResponse<T>(
  data: unknown,
  schema: z.ZodType<T>,
  context: string,
): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    const errorDetails = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");

    logger.error(`API validation error (${context}):`, result.error.issues);
    throw new Error(`Invalid API response for ${context}: ${errorDetails}`);
  }

  return result.data;
}
