/**
 * Game-day schemas: scoresheets, nomination lists and the game detail wrapper.
 */
import { z } from 'zod'

import { fileResourceSchema, personSummarySchema } from './common'
import { dateTimeSchema, permissionsSchema, uuidSchema } from './primitives'
import { optionalResilientListSchema } from './resilient-list'

// Scoresheet validation schema
export const scoresheetValidationSchema = z
  .object({
    __identity: uuidSchema.optional(),
    hasValidationIssues: z.boolean().optional(),
    hasValidationIssuesForAssociationUserContext: z.boolean().optional(),
    hasValidationIssuesForClubUserContext: z.boolean().optional(),
    areValidationIssuesAddressedByChampionshipOperator: z.boolean().optional(),
    scoresheetValidationIssues: z.array(z.object({}).passthrough()).optional(),
  })
  .passthrough()

// Scoresheet schema
export const scoresheetSchema = z
  .object({
    __identity: uuidSchema.optional(),
    game: z.object({ __identity: uuidSchema.optional() }).passthrough().optional(),
    isSimpleScoresheet: z.boolean().optional(),
    writerPerson: personSummarySchema.optional().nullable(),
    scoresheetValidation: scoresheetValidationSchema.optional().nullable(),
    file: fileResourceSchema.optional().nullable(),
    hasFile: z.boolean().optional(),
    closedAt: dateTimeSchema,
  })
  .passthrough()

// Player + license category pair shared by nominated and nominatable players
const nominatedPlayerShape = {
  __identity: uuidSchema.optional(),
  indoorPlayer: z
    .object({
      __identity: uuidSchema.optional(),
      person: personSummarySchema.optional(),
    })
    .passthrough()
    .optional(),
  indoorPlayerLicenseCategory: z
    .object({
      __identity: uuidSchema.optional(),
      shortName: z.string().optional(),
    })
    .passthrough()
    .optional(),
}

// Indoor player nomination schema
const indoorPlayerNominationSchema = z.object(nominatedPlayerShape).passthrough()

// Nomination list schema
export const nominationListSchema = z
  .object({
    __identity: uuidSchema.optional(),
    game: z.object({ __identity: uuidSchema.optional() }).passthrough().optional(),
    team: z
      .object({
        __identity: uuidSchema.optional(),
        displayName: z.string().optional(),
      })
      .passthrough()
      .optional(),
    indoorPlayerNominations: z.array(indoorPlayerNominationSchema).optional(),
    coachPerson: personSummarySchema.optional().nullable(),
    firstAssistantCoachPerson: personSummarySchema.optional().nullable(),
    secondAssistantCoachPerson: personSummarySchema.optional().nullable(),
    closed: z.boolean().optional(),
    closedAt: dateTimeSchema,
    checked: z.boolean().optional(),
    isClosedForTeam: z.boolean().optional(),
    nominationListValidation: z.object({}).passthrough().optional().nullable(),
    _permissions: permissionsSchema,
  })
  .passthrough()

// Nomination list response (finalize wrapper)
export const nominationListResponseSchema = z
  .object({
    nominationList: nominationListSchema.optional(),
  })
  .passthrough()

// Game details schema (showWithNestedObjects response)
export const gameDetailsSchema = z
  .object({
    __identity: uuidSchema.optional(),
    scoresheet: scoresheetSchema.optional().nullable(),
    nominationListOfTeamHome: nominationListSchema.optional().nullable(),
    nominationListOfTeamAway: nominationListSchema.optional().nullable(),
    group: z
      .object({
        __identity: uuidSchema.optional(),
        hasNoScoresheet: z.boolean().optional(),
      })
      .passthrough()
      .optional()
      .nullable(),
  })
  .passthrough()

// Game details response wrapper
export const gameDetailsResponseSchema = z
  .object({
    game: gameDetailsSchema,
  })
  .passthrough()

// Possible player nomination schema
const possibleNominationSchema = z
  .object({
    ...nominatedPlayerShape,
    teamDisplayName: z.string().optional(),
    isInSameTeam: z.boolean().optional(),
    isInSameClub: z.boolean().optional(),
    isInSameGender: z.boolean().optional(),
  })
  .passthrough()

// Possible nominations response schema
export const possibleNominationsResponseSchema =
  optionalResilientListSchema(possibleNominationSchema)
