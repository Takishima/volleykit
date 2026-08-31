/**
 * Referee absence schemas.
 *
 * Absences are stored per association: the same referee gets a different list
 * from each association (party context), including batch-generated read-only
 * entries such as national-squad duty blockings. `_permissions` decides whether
 * an entry is editable, so it is parsed rather than passed through.
 */
import { z } from 'zod'

import { uuidSchema } from './primitives'
import { optionalResilientListSchema } from './resilient-list'

const absenceObjectPermissionsSchema = z
  .object({
    create: z.boolean().optional(),
    update: z.boolean().optional(),
    delete: z.boolean().optional(),
  })
  .passthrough()

const absencePermissionsSchema = z
  .object({
    object: absenceObjectPermissionsSchema.optional(),
  })
  .passthrough()

// A referee absence entry (own or batch-generated read-only blocking)
export const refereeAbsenceSchema = z
  .object({
    __identity: uuidSchema,
    fromDate: z.string().datetime({ offset: true }),
    toDate: z.string().datetime({ offset: true }),
    detailedReason: z.string().optional().nullable(),
    createdAt: z.string().optional(),
    createdBy: z.string().optional().nullable(),
    updatedAt: z.string().optional(),
    updatedBy: z.string().optional().nullable(),
    _permissions: absencePermissionsSchema.optional(),
  })
  .passthrough()

// Optional variant: both captured associations held rows, so whether an
// empty account gets `items: []` or no `items` key at all is unverified -
// the optional variant costs nothing when the key is present.
export const refereeAbsencesResponseSchema = optionalResilientListSchema(refereeAbsenceSchema)
