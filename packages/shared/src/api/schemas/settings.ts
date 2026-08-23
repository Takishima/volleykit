/**
 * Association-level configuration schemas.
 */
import { z } from 'zod'

import { dateTimeSchema, uuidSchema } from './primitives'

// Association settings schema
export const associationSettingsSchema = z
  .object({
    __identity: uuidSchema.optional(),
    usesGameExchange: z.boolean().optional(),
    hoursAfterGameStartForRefereeToEditGameList: z.number().optional(),
    isRefereeDataManagementAllowed: z.boolean().optional(),
  })
  .passthrough()

// Season schema
export const seasonSchema = z
  .object({
    __identity: uuidSchema.optional(),
    name: z.string().optional(),
    displayName: z.string().optional(),
    seasonStartDate: dateTimeSchema,
    seasonEndDate: dateTimeSchema,
    active: z.boolean().optional(),
  })
  .passthrough()
