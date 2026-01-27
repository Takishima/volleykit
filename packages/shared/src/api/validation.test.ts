/**
 * Tests for runtime validation schemas
 */

import { describe, expect, it, vi } from 'vitest'

import {
  dateSchema,
  refereePositionSchema,
  convocationStatusSchema,
  exchangeStatusSchema,
  assignmentSchema,
  compensationRecordSchema,
  gameExchangeSchema,
  personSearchResultSchema,
  assignmentsResponseSchema,
  compensationsResponseSchema,
  exchangesResponseSchema,
  personSearchResponseSchema,
  validateResponse,
} from './validation'

describe('dateSchema', () => {
  it('accepts ISO date format', () => {
    const result = dateSchema.safeParse('2024-01-15')
    expect(result.success).toBe(true)
  })

  it('accepts ISO datetime with microseconds', () => {
    const result = dateSchema.safeParse('2024-12-19T23:00:00.000000+00:00')
    expect(result.success).toBe(true)
  })

  it('accepts ISO datetime without microseconds', () => {
    const result = dateSchema.safeParse('2024-12-19T23:00:00+00:00')
    expect(result.success).toBe(true)
  })

  it('accepts null for unpaid compensations', () => {
    const result = dateSchema.safeParse(null)
    expect(result.success).toBe(true)
  })

  it('accepts undefined (optional)', () => {
    const result = dateSchema.safeParse(undefined)
    expect(result.success).toBe(true)
  })

  it('accepts empty string for unpaid compensations', () => {
    const result = dateSchema.safeParse('')
    expect(result.success).toBe(true)
  })

  it('rejects invalid date format', () => {
    const result = dateSchema.safeParse('invalid-date')
    expect(result.success).toBe(false)
  })

  it('rejects partial date format', () => {
    const result = dateSchema.safeParse('2024-01')
    expect(result.success).toBe(false)
  })

  it('rejects date with wrong separator', () => {
    const result = dateSchema.safeParse('2024/01/15')
    expect(result.success).toBe(false)
  })
})

describe('refereePositionSchema', () => {
  it('accepts head-one position', () => {
    const result = refereePositionSchema.safeParse('head-one')
    expect(result.success).toBe(true)
  })

  it('accepts head-two position', () => {
    const result = refereePositionSchema.safeParse('head-two')
    expect(result.success).toBe(true)
  })

  it('accepts linesman positions', () => {
    expect(refereePositionSchema.safeParse('linesman-one').success).toBe(true)
    expect(refereePositionSchema.safeParse('linesman-two').success).toBe(true)
    expect(refereePositionSchema.safeParse('linesman-three').success).toBe(true)
    expect(refereePositionSchema.safeParse('linesman-four').success).toBe(true)
  })

  it('accepts standby positions', () => {
    expect(refereePositionSchema.safeParse('standby-head').success).toBe(true)
    expect(refereePositionSchema.safeParse('standby-linesman').success).toBe(true)
  })

  it('accepts any string (API may return new positions)', () => {
    expect(refereePositionSchema.safeParse('future-position').success).toBe(true)
  })
})

describe('convocationStatusSchema', () => {
  it('accepts active status', () => {
    const result = convocationStatusSchema.safeParse('active')
    expect(result.success).toBe(true)
  })

  it('accepts cancelled status', () => {
    const result = convocationStatusSchema.safeParse('cancelled')
    expect(result.success).toBe(true)
  })

  it('accepts archived status', () => {
    const result = convocationStatusSchema.safeParse('archived')
    expect(result.success).toBe(true)
  })

  it('rejects invalid status', () => {
    const result = convocationStatusSchema.safeParse('pending')
    expect(result.success).toBe(false)
  })
})

describe('exchangeStatusSchema', () => {
  it('accepts open status', () => {
    const result = exchangeStatusSchema.safeParse('open')
    expect(result.success).toBe(true)
  })

  it('accepts applied status', () => {
    const result = exchangeStatusSchema.safeParse('applied')
    expect(result.success).toBe(true)
  })

  it('accepts closed status', () => {
    const result = exchangeStatusSchema.safeParse('closed')
    expect(result.success).toBe(true)
  })

  it('rejects invalid status', () => {
    const result = exchangeStatusSchema.safeParse('rejected')
    expect(result.success).toBe(false)
  })
})

describe('assignmentSchema', () => {
  const validAssignment = {
    __identity: '550e8400-e29b-41d4-a716-446655440000',
    refereeGame: {
      __identity: '550e8400-e29b-41d4-a716-446655440001',
    },
    refereeConvocationStatus: 'active',
    refereePosition: 'head-one',
  }

  it('accepts valid assignment', () => {
    const result = assignmentSchema.safeParse(validAssignment)
    expect(result.success).toBe(true)
  })

  it('accepts assignment with all optional fields', () => {
    const result = assignmentSchema.safeParse({
      ...validAssignment,
      confirmationStatus: 'confirmed',
      confirmationDate: '2024-01-15T10:00:00+00:00',
      isOpenEntryInRefereeGameExchange: '1',
      hasLastMessageToReferee: '0',
      hasLinkedDoubleConvocation: true,
      linkedDoubleConvocationGameNumberAndRefereePosition: '12345/head-two',
      _permissions: {
        canEdit: true,
        canDelete: false,
      },
    })
    expect(result.success).toBe(true)
  })

  it('transforms boolean-like string values', () => {
    const result = assignmentSchema.safeParse({
      ...validAssignment,
      isOpenEntryInRefereeGameExchange: '1',
      hasLastMessageToReferee: '0',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.isOpenEntryInRefereeGameExchange).toBe(true)
      expect(result.data.hasLastMessageToReferee).toBe(false)
    }
  })

  it('transforms non-standard boolean-like strings to null', () => {
    const result = assignmentSchema.safeParse({
      ...validAssignment,
      isOpenEntryInRefereeGameExchange: 'true',
      hasLastMessageToReferee: 'yes',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      // Non-"0"/"1" strings are transformed to null
      expect(result.data.isOpenEntryInRefereeGameExchange).toBe(null)
      expect(result.data.hasLastMessageToReferee).toBe(null)
    }
  })

  it('rejects assignment with invalid UUID', () => {
    const result = assignmentSchema.safeParse({
      ...validAssignment,
      __identity: 'not-a-uuid',
    })
    expect(result.success).toBe(false)
  })

  it('rejects assignment with invalid convocation status', () => {
    const result = assignmentSchema.safeParse({
      ...validAssignment,
      refereeConvocationStatus: 'invalid',
    })
    expect(result.success).toBe(false)
  })

  it('allows unknown fields via passthrough', () => {
    const result = assignmentSchema.safeParse({
      ...validAssignment,
      unknownField: 'some value',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.unknownField).toBe('some value')
    }
  })
})

describe('compensationRecordSchema', () => {
  const validCompensation = {
    __identity: '550e8400-e29b-41d4-a716-446655440000',
    refereeGame: {
      __identity: '550e8400-e29b-41d4-a716-446655440001',
    },
    convocationCompensation: {},
    refereeConvocationStatus: 'active',
    refereePosition: 'head-one',
  }

  it('accepts valid compensation record', () => {
    const result = compensationRecordSchema.safeParse(validCompensation)
    expect(result.success).toBe(true)
  })

  it('accepts compensation with ISO date paymentValueDate', () => {
    const result = compensationRecordSchema.safeParse({
      ...validCompensation,
      convocationCompensation: {
        paymentValueDate: '2024-01-15',
      },
    })
    expect(result.success).toBe(true)
  })

  it('accepts compensation with ISO datetime paymentValueDate', () => {
    const result = compensationRecordSchema.safeParse({
      ...validCompensation,
      convocationCompensation: {
        paymentValueDate: '2024-12-19T23:00:00.000000+00:00',
      },
    })
    expect(result.success).toBe(true)
  })

  it('accepts compensation with null paymentValueDate', () => {
    const result = compensationRecordSchema.safeParse({
      ...validCompensation,
      convocationCompensation: {
        paymentValueDate: null,
      },
    })
    expect(result.success).toBe(true)
  })

  it('accepts compensation with empty string paymentValueDate', () => {
    const result = compensationRecordSchema.safeParse({
      ...validCompensation,
      convocationCompensation: {
        paymentValueDate: '',
      },
    })
    expect(result.success).toBe(true)
  })

  it('accepts compensation with public_transport transportationMode', () => {
    const result = compensationRecordSchema.safeParse({
      ...validCompensation,
      convocationCompensation: {
        transportationMode: 'public_transport',
      },
    })
    expect(result.success).toBe(true)
  })

  it('accepts compensation with null transportationMode', () => {
    const result = compensationRecordSchema.safeParse({
      ...validCompensation,
      convocationCompensation: {
        transportationMode: null,
      },
    })
    expect(result.success).toBe(true)
  })

  it('accepts compensation with full convocation data', () => {
    const result = compensationRecordSchema.safeParse({
      ...validCompensation,
      convocationCompensation: {
        paymentDone: true,
        payGameCompensation: true,
        gameCompensation: 50,
        payTravelExpenses: true,
        travelExpenses: 25.5,
        publicTransportExpenses: 15,
        travelExpensesPercentageWeighting: 100,
        distanceInMetres: 25000,
        transportationMode: 'car',
        paymentValueDate: '2024-01-15',
        gameCompensationFormatted: 'CHF 50.00',
        travelExpensesFormatted: 'CHF 25.50',
        costFormatted: 'CHF 75.50',
        distanceFormatted: '25 km',
      },
    })
    expect(result.success).toBe(true)
  })
})

describe('gameExchangeSchema', () => {
  const validExchange = {
    __identity: '550e8400-e29b-41d4-a716-446655440000',
    refereeGame: {
      __identity: '550e8400-e29b-41d4-a716-446655440001',
    },
    status: 'open',
    refereePosition: 'head-one',
  }

  it('accepts valid exchange', () => {
    const result = gameExchangeSchema.safeParse(validExchange)
    expect(result.success).toBe(true)
  })

  it('accepts exchange with optional fields', () => {
    const result = gameExchangeSchema.safeParse({
      ...validExchange,
      createdAt: '2024-01-15T10:00:00+00:00',
      submittedByPerson: {
        __identity: '550e8400-e29b-41d4-a716-446655440002',
        firstName: 'Hans',
        lastName: 'Müller',
        displayName: 'Hans Müller',
      },
      exchangeReason: 'Unable to attend',
      notes: 'Please find a replacement',
      requiredRefereeLevel: 'NLA',
    })
    expect(result.success).toBe(true)
  })

  it('rejects exchange with invalid status', () => {
    const result = gameExchangeSchema.safeParse({
      ...validExchange,
      status: 'invalid',
    })
    expect(result.success).toBe(false)
  })
})

describe('personSearchResultSchema', () => {
  const validPerson = {
    __identity: 'a1111111-1111-4111-a111-111111111111',
    firstName: 'Hans',
    lastName: 'Müller',
    displayName: 'Hans Müller',
    associationId: 12345,
    birthday: '1985-03-15T00:00:00+00:00',
    gender: 'm' as const,
  }

  it('accepts valid person search result', () => {
    const result = personSearchResultSchema.safeParse(validPerson)
    expect(result.success).toBe(true)
  })

  it('accepts person with minimal required fields', () => {
    const result = personSearchResultSchema.safeParse({
      __identity: 'a1111111-1111-4111-a111-111111111111',
    })
    expect(result.success).toBe(true)
  })

  it('accepts person with null optional fields', () => {
    const result = personSearchResultSchema.safeParse({
      __identity: 'a1111111-1111-4111-a111-111111111111',
      associationId: null,
      birthday: null,
      gender: null,
    })
    expect(result.success).toBe(true)
  })

  it('accepts female gender', () => {
    const result = personSearchResultSchema.safeParse({
      ...validPerson,
      gender: 'f',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid UUID for __identity', () => {
    const result = personSearchResultSchema.safeParse({
      ...validPerson,
      __identity: 'invalid-uuid',
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing __identity', () => {
    const { __identity: _, ...personWithoutId } = validPerson
    void _
    const result = personSearchResultSchema.safeParse(personWithoutId)
    expect(result.success).toBe(false)
  })

  it('allows unknown fields via passthrough', () => {
    const result = personSearchResultSchema.safeParse({
      ...validPerson,
      unknownField: 'some value',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.unknownField).toBe('some value')
    }
  })
})

describe('assignmentsResponseSchema', () => {
  it('accepts valid response with items', () => {
    const result = assignmentsResponseSchema.safeParse({
      items: [
        {
          __identity: '550e8400-e29b-41d4-a716-446655440000',
          refereeGame: {},
          refereeConvocationStatus: 'active',
          refereePosition: 'head-one',
        },
      ],
      totalItemsCount: 1,
    })
    expect(result.success).toBe(true)
  })

  it('accepts empty items array', () => {
    const result = assignmentsResponseSchema.safeParse({
      items: [],
      totalItemsCount: 0,
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing items', () => {
    const result = assignmentsResponseSchema.safeParse({
      totalItemsCount: 0,
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing totalItemsCount', () => {
    const result = assignmentsResponseSchema.safeParse({
      items: [],
    })
    expect(result.success).toBe(false)
  })
})

describe('compensationsResponseSchema', () => {
  it('accepts valid response with items', () => {
    const result = compensationsResponseSchema.safeParse({
      items: [
        {
          __identity: '550e8400-e29b-41d4-a716-446655440000',
          refereeGame: {},
          convocationCompensation: {},
          refereeConvocationStatus: 'active',
          refereePosition: 'head-one',
        },
      ],
      totalItemsCount: 1,
    })
    expect(result.success).toBe(true)
  })

  it('accepts empty items array', () => {
    const result = compensationsResponseSchema.safeParse({
      items: [],
      totalItemsCount: 0,
    })
    expect(result.success).toBe(true)
  })
})

describe('exchangesResponseSchema', () => {
  it('accepts valid response with items', () => {
    const result = exchangesResponseSchema.safeParse({
      items: [
        {
          __identity: '550e8400-e29b-41d4-a716-446655440000',
          refereeGame: {},
          status: 'open',
          refereePosition: 'head-one',
        },
      ],
      totalItemsCount: 1,
    })
    expect(result.success).toBe(true)
  })

  it('accepts empty items array', () => {
    const result = exchangesResponseSchema.safeParse({
      items: [],
      totalItemsCount: 0,
    })
    expect(result.success).toBe(true)
  })
})

describe('personSearchResponseSchema', () => {
  const validPerson = {
    __identity: 'a1111111-1111-4111-a111-111111111111',
    firstName: 'Hans',
    lastName: 'Müller',
  }

  it('accepts valid response with items', () => {
    const result = personSearchResponseSchema.safeParse({
      items: [validPerson],
      totalItemsCount: 1,
    })
    expect(result.success).toBe(true)
  })

  it('accepts empty items array', () => {
    const result = personSearchResponseSchema.safeParse({
      items: [],
      totalItemsCount: 0,
    })
    expect(result.success).toBe(true)
  })

  it('accepts response without items (optional)', () => {
    const result = personSearchResponseSchema.safeParse({
      totalItemsCount: 0,
    })
    expect(result.success).toBe(true)
  })

  it('accepts response without totalItemsCount (optional)', () => {
    const result = personSearchResponseSchema.safeParse({
      items: [validPerson],
    })
    expect(result.success).toBe(true)
  })

  it('rejects items with invalid __identity', () => {
    const result = personSearchResponseSchema.safeParse({
      items: [{ ...validPerson, __identity: 'not-a-uuid' }],
      totalItemsCount: 1,
    })
    expect(result.success).toBe(false)
  })

  it('rejects non-array items', () => {
    const result = personSearchResponseSchema.safeParse({
      items: 'not-an-array',
      totalItemsCount: 1,
    })
    expect(result.success).toBe(false)
  })
})

describe('validateResponse', () => {
  it('returns validated data for valid input', () => {
    const validResponse = {
      items: [
        {
          __identity: 'a1111111-1111-4111-a111-111111111111',
          firstName: 'Hans',
        },
      ],
      totalItemsCount: 1,
    }

    const result = validateResponse(validResponse, personSearchResponseSchema, 'test')

    expect(result.items).toHaveLength(1)
    expect(result.items?.[0]?.__identity).toBe('a1111111-1111-4111-a111-111111111111')
  })

  it('throws descriptive error for invalid input', () => {
    const invalidResponse = {
      items: [{ __identity: 'invalid-uuid' }],
      totalItemsCount: 1,
    }

    expect(() => validateResponse(invalidResponse, personSearchResponseSchema, 'test')).toThrow(
      /Invalid API response for test/
    )
  })

  it('includes field path in error message', () => {
    const invalidResponse = {
      items: [{ __identity: 'invalid-uuid' }],
      totalItemsCount: 1,
    }

    expect(() => validateResponse(invalidResponse, personSearchResponseSchema, 'test')).toThrow(
      /items\.0\.__identity/
    )
  })

  it('logs error to console', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const invalidResponse = {
      items: [{ __identity: 'invalid-uuid' }],
      totalItemsCount: 1,
    }

    expect(() => validateResponse(invalidResponse, personSearchResponseSchema, 'test')).toThrow()
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('API validation error (test)'),
      expect.any(Array)
    )

    consoleSpy.mockRestore()
  })

  it('includes context in error message', () => {
    const invalidResponse = { items: 'not-an-array' }

    expect(() =>
      validateResponse(invalidResponse, personSearchResponseSchema, 'my-context')
    ).toThrow(/Invalid API response for my-context/)
  })
})
