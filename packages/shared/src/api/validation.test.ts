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
  refereeBackupResponseSchema,
  validateResponse,
  getDroppedListItems,
} from './validation'

/** Fails every required field of `assignmentSchema`, so the item schema always rejects it. */
const INVALID_ASSIGNMENT = { __identity: 'not-a-uuid' }

const VALID_ASSIGNMENT = {
  __identity: '550e8400-e29b-41d4-a716-446655440000',
  refereeGame: {},
  refereeConvocationStatus: 'active',
  refereePosition: 'head-one',
}

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

  it('keeps a string linked double convocation as-is', () => {
    const result = assignmentSchema.safeParse({
      ...validAssignment,
      linkedDoubleConvocationGameNumberAndRefereePosition: '12345/head-two',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.linkedDoubleConvocationGameNumberAndRefereePosition).toBe('12345/head-two')
    }
  })

  it.each([
    ['number', 12345, '12345'],
    [
      'SRBA array of label parts',
      ['#401727 | 13.03.2027 18:00 | VB Therwil — VBC Thun ', 'ARB 2'],
      '#401727 | 13.03.2027 18:00 | VB Therwil — VBC Thun | ARB 2',
    ],
    ['array with empty entries', ['#401727', null, ''], '#401727'],
    ['unrenderable object', { gameNumber: '12345' }, null],
    ['empty array', [], null],
    ['empty string', '', null],
    ['null', null, null],
  ])(
    'normalizes linked double convocation value: %s',
    (_label, value: unknown, expected: string | null) => {
      const result = assignmentSchema.safeParse({
        ...validAssignment,
        linkedDoubleConvocationGameNumberAndRefereePosition: value,
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.linkedDoubleConvocationGameNumberAndRefereePosition).toBe(expected)
      }
    }
  )

  it('accepts assignment without linked double convocation field', () => {
    const result = assignmentSchema.safeParse(validAssignment)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.linkedDoubleConvocationGameNumberAndRefereePosition).toBeUndefined()
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

  it('normalizes an array-shaped linked double convocation (SRBA)', () => {
    const result = gameExchangeSchema.safeParse({
      ...validExchange,
      linkedDoubleConvocationGameNumberAndRefereePosition: [
        '#401727 | 13.03.2027 18:00 | VB Therwil — VBC Thun ',
        'ARB 2',
      ],
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.linkedDoubleConvocationGameNumberAndRefereePosition).toBe(
        '#401727 | 13.03.2027 18:00 | VB Therwil — VBC Thun | ARB 2'
      )
    }
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

  it('defaults totalItemsCount to 0 when absent', () => {
    const result = assignmentsResponseSchema.safeParse({
      items: [],
    })
    expect(result.success).toBe(true)
    expect(result.data?.totalItemsCount).toBe(0)
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

  it('drops items with invalid __identity instead of rejecting the list', () => {
    const result = personSearchResponseSchema.safeParse({
      items: [validPerson, { ...validPerson, __identity: 'not-a-uuid' }],
      totalItemsCount: 2,
    })

    expect(result.success).toBe(true)
    expect(result.data?.items).toHaveLength(1)
    expect(result.data?.droppedItems).toHaveLength(1)
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
    expect(() => validateResponse(INVALID_ASSIGNMENT, assignmentSchema, 'test')).toThrow(
      /Invalid API response for test/
    )
  })

  it('includes field path in error message', () => {
    expect(() => validateResponse(INVALID_ASSIGNMENT, assignmentSchema, 'test')).toThrow(
      /__identity/
    )
  })

  it('logs error to console', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => validateResponse(INVALID_ASSIGNMENT, assignmentSchema, 'test')).toThrow()
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('API validation error (test)'),
      expect.any(Array)
    )

    consoleSpy.mockRestore()
  })

  it('includes context in error message', () => {
    const invalidResponse = { items: 'not-an-array' }

    expect(() =>
      validateResponse(invalidResponse, assignmentsResponseSchema, 'my-context')
    ).toThrow(/Invalid API response for my-context/)
  })
})

describe('resilient list parsing', () => {
  it('keeps valid items when a sibling item is malformed', () => {
    const result = assignmentsResponseSchema.safeParse({
      items: [VALID_ASSIGNMENT, INVALID_ASSIGNMENT],
      totalItemsCount: 2,
    })

    expect(result.success).toBe(true)
    expect(result.data?.items).toHaveLength(1)
    expect(result.data?.items[0]?.__identity).toBe(VALID_ASSIGNMENT.__identity)
  })

  it('passes the server totalItemsCount through unchanged', () => {
    // It counts every page, so subtracting a page-local drop count would make it
    // differ per page and break stall detection in usePaginatedQuery.
    const result = assignmentsResponseSchema.safeParse({
      items: [VALID_ASSIGNMENT, INVALID_ASSIGNMENT],
      totalItemsCount: 42,
    })

    expect(result.data?.totalItemsCount).toBe(42)
  })

  it('records the index and issues of each dropped item', () => {
    const result = assignmentsResponseSchema.safeParse({
      items: [VALID_ASSIGNMENT, INVALID_ASSIGNMENT],
      totalItemsCount: 2,
    })

    const dropped = result.data?.droppedItems
    expect(dropped).toHaveLength(1)
    expect(dropped?.[0]?.index).toBe(1)
    expect(dropped?.[0]?.issues.length).toBeGreaterThan(0)
    expect(getDroppedListItems(result.data)).toEqual(dropped)
  })

  it('reports no dropped items for a fully valid response', () => {
    const result = assignmentsResponseSchema.safeParse({
      items: [VALID_ASSIGNMENT],
      totalItemsCount: 1,
    })

    expect(result.data?.droppedItems).toEqual([])
  })

  it('still rejects a malformed envelope', () => {
    expect(assignmentsResponseSchema.safeParse({ totalItemsCount: 0 }).success).toBe(false)
    expect(
      assignmentsResponseSchema.safeParse({ items: 'not-an-array', totalItemsCount: 0 }).success
    ).toBe(false)
  })

  it('drops invalid exchanges', () => {
    const result = exchangesResponseSchema.safeParse({
      items: [
        {
          __identity: '550e8400-e29b-41d4-a716-446655440000',
          refereeGame: {},
          status: 'open',
          refereePosition: 'head-one',
        },
        { __identity: 'not-a-uuid' },
      ],
      totalItemsCount: 2,
    })

    expect(result.success).toBe(true)
    expect(result.data?.items).toHaveLength(1)
    expect(result.data?.droppedItems).toHaveLength(1)
  })

  const VALID_BACKUP_ENTRY = {
    __identity: '550e8400-e29b-41d4-a716-446655440000',
    date: '2026-03-13T18:00:00+00:00',
    weekday: 'Friday',
    calendarWeek: 11,
  }

  it('drops invalid referee backup entries', () => {
    const result = refereeBackupResponseSchema.safeParse({
      items: [
        VALID_BACKUP_ENTRY,
        { __identity: '660e8400-e29b-41d4-a716-446655440000', weekday: 'Saturday' },
      ],
      totalItemsCount: 2,
      entityTemplate: null,
    })

    expect(result.success).toBe(true)
    expect(result.data?.items).toHaveLength(1)
    expect(result.data?.droppedItems).toHaveLength(1)
  })

  it('keeps a person whose gender is outside the known enum', () => {
    // Display-only, so an unexpected value is coerced rather than dropping the row.
    const result = personSearchResponseSchema.safeParse({
      items: [{ __identity: 'a1111111-1111-4111-a111-111111111111', gender: 'd' }],
      totalItemsCount: 1,
    })

    expect(result.success).toBe(true)
    expect(result.data?.items).toHaveLength(1)
    expect(result.data?.items[0]?.gender).toBeNull()
  })

  it('drops an assignment whose convocation status is unknown', () => {
    // Deliberate: refereeConvocationStatus drives filtering, so an unknown value
    // is not safe to coerce the way a display-only field is.
    const result = assignmentsResponseSchema.safeParse({
      items: [{ ...VALID_ASSIGNMENT, refereeConvocationStatus: 'something-new' }],
      totalItemsCount: 1,
    })

    expect(result.success).toBe(true)
    expect(result.data?.items).toEqual([])
    expect(result.data?.droppedItems).toHaveLength(1)
  })

  it('keeps a backup entry whose nested referee assignments lack an id', () => {
    // A required nested id would drop the whole Pikett date row over one referee.
    const result = refereeBackupResponseSchema.safeParse({
      items: [{ ...VALID_BACKUP_ENTRY, nlaReferees: [{ isDispensed: false }] }],
      totalItemsCount: 1,
    })

    expect(result.success).toBe(true)
    expect(result.data?.items).toHaveLength(1)
    expect(result.data?.droppedItems).toEqual([])
  })

  it('keeps a backup entry whose nested referee has an unknown gender', () => {
    const result = refereeBackupResponseSchema.safeParse({
      items: [
        {
          ...VALID_BACKUP_ENTRY,
          nlaReferees: [{ indoorReferee: { person: { gender: 'd' } } }],
        },
      ],
      totalItemsCount: 1,
    })

    expect(result.success).toBe(true)
    expect(result.data?.items).toHaveLength(1)
    expect(result.data?.droppedItems).toEqual([])
  })

  it('defaults a missing items array to empty on optional list schemas', () => {
    const result = personSearchResponseSchema.safeParse({})

    expect(result.success).toBe(true)
    expect(result.data?.items).toEqual([])
    expect(result.data?.totalItemsCount).toBe(0)
  })

  it('logs dropped items from validateResponse without throwing', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const result = validateResponse(
      { items: [VALID_ASSIGNMENT, INVALID_ASSIGNMENT], totalItemsCount: 2 },
      assignmentsResponseSchema,
      'assignments'
    )

    expect(result.items).toHaveLength(1)
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('API validation dropped 1 invalid item(s) (assignments)')
    )

    consoleSpy.mockRestore()
  })
})
