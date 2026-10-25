import type { GameExchange } from '@/api/client'

type ConvocationRef = NonNullable<
  GameExchange['refereeGame']['activeRefereeConvocationFirstHeadReferee']
>

/**
 * A referee-convocation reference carrying its `__identity`.
 *
 * The API returns the identity (EXCHANGE_PROPERTIES requests
 * `refereeGame.activeRefereeConvocation*.__identity`) and
 * `getConvocationIdFromExchange` reads it, but the generated
 * `RefereeConvocationRef` schema type does not declare it, so a plain object
 * literal would be rejected as an excess property.
 */
export function createConvocationRef(id: string): ConvocationRef {
  const ref = { __identity: id }
  return ref as unknown as ConvocationRef
}

/** A complete, schema-valid open exchange for the head-one position. */
export function createMockExchange(overrides: Partial<GameExchange> = {}): GameExchange {
  return {
    __identity: 'test-exchange-1',
    status: 'open',
    submittedAt: '2025-12-01T10:00:00Z',
    submittedByPerson: { __identity: 'person-1' },
    submittingType: 'referee',
    refereePosition: 'head-one',
    refereeGame: {
      activeRefereeConvocationFirstHeadReferee: createConvocationRef('test-convocation-1'),
      game: {
        startingDateTime: '2025-12-15T18:00:00Z',
        encounter: {
          teamHome: { name: 'Team A' },
          teamAway: { name: 'Team B' },
        },
        hall: {
          name: 'Main Arena',
        },
      },
    },
    ...overrides,
  }
}
