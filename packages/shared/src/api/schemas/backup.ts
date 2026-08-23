/**
 * Referee backup (Pikett) schemas.
 */
import { z } from 'zod'

import { uuidSchema } from './primitives'
import { resilientListSchema } from './resilient-list'

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
// `__identity` is optional like every other nested schema here: a required id
// would make one malformed referee reject the whole Pikett date row.
const backupRefereeAssignmentSchema = z
  .object({
    __identity: uuidSchema.optional(),
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
// `entityTemplate` is not declared: the API sends it, nothing reads it.
export const refereeBackupResponseSchema = resilientListSchema(refereeBackupEntrySchema)
