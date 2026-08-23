/**
 * Reusable nested entity schemas (teams, halls, games, people).
 *
 * These are the building blocks composed by the domain schemas in
 * `assignments.ts`, `games.ts` and `backup.ts`.
 */
import { z } from 'zod'

import { dateSchema, dateTimeSchema, uuidSchema } from './primitives'

// Team schema
const teamSchema = z
  .object({
    __identity: uuidSchema.optional(),
    name: z.string().optional(),
    shortName: z.string().optional().nullable(),
  })
  .passthrough()

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
  .passthrough()

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
  .passthrough()

// Person summary schema
export const personSummarySchema = z
  .object({
    __identity: uuidSchema.optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    shortName: z.string().optional().nullable(),
    displayName: z.string().optional(),
  })
  .passthrough()

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
  .nullable()

// Referee game schema
export const refereeGameSchema = z
  .object({
    __identity: uuidSchema.optional(),
    game: gameSchema.optional(),
  })
  .passthrough()

// Referee game for exchange (includes more details)
export const refereeGameForExchangeSchema = z
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
  .passthrough()

// Convocation compensation schema
export const convocationCompensationSchema = z
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
    hasFlexibleTravelExpenses: z.boolean().optional(),
  })
  .passthrough()

// File resource schema (upload response)
export const fileResourceSchema = z
  .object({
    __identity: uuidSchema.optional(),
    persistentResource: z
      .object({
        __identity: uuidSchema.optional(),
        filename: z.string().optional(),
        mediaType: z.string().optional(),
        fileSize: z.number().optional(),
      })
      .passthrough()
      .optional(),
    publicResourceUri: z.string().optional(),
  })
  .passthrough()

// File resource array schema (upload response is an array)
export const fileResourceArraySchema = z.array(fileResourceSchema)
