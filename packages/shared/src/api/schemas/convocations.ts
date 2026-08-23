/**
 * Referee convocation domain schemas: assignments, compensations,
 * game exchanges and person search, plus their list/detail response wrappers.
 */
import { z } from 'zod'

import {
  convocationCompensationSchema,
  personSummarySchema,
  refereeGameForExchangeSchema,
  refereeGameSchema,
} from './common'
import {
  booleanLikeSchema,
  convocationStatusSchema,
  dateTimeSchema,
  exchangeStatusSchema,
  linkedDoubleConvocationSchema,
  permissionsSchema,
  refereePositionSchema,
  uuidSchema,
} from './primitives'
import { resilientListSchema } from './resilient-list'

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
    linkedDoubleConvocationGameNumberAndRefereePosition: linkedDoubleConvocationSchema,
    // Compensation data eagerly loaded with assignments to avoid separate API call
    convocationCompensation: convocationCompensationSchema.optional(),
    _permissions: permissionsSchema,
  })
  .passthrough()

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
  .passthrough()

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
    linkedDoubleConvocationGameNumberAndRefereePosition: linkedDoubleConvocationSchema,
    _permissions: permissionsSchema,
  })
  .passthrough()

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
  .passthrough()

// Response schemas
// Parsed per item so one malformed entry cannot discard the whole list.
export const assignmentsResponseSchema = resilientListSchema(assignmentSchema)

export const compensationsResponseSchema = resilientListSchema(compensationRecordSchema)

export const exchangesResponseSchema = resilientListSchema(gameExchangeSchema)

export const personSearchResponseSchema = z.object({
  items: z.array(personSearchResultSchema).optional(),
  totalItemsCount: z.number().optional(),
})

// Compensation detail response (showWithNestedObjects wrapper)
export const compensationDetailedSchema = z
  .object({
    convocationCompensation: convocationCompensationSchema.optional(),
  })
  .passthrough()

// Pick exchange response (pickFromRefereeGameExchange wrapper)
export const pickExchangeResponseSchema = z
  .object({
    refereeGameExchange: z
      .object({
        __identity: uuidSchema.optional(),
        status: z.string().optional(),
      })
      .passthrough(),
  })
  .passthrough()
