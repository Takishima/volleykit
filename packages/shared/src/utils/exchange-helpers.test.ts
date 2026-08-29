/**
 * Tests for exchange helper functions
 */

import { describe, it, expect } from 'vitest'

import type { GameExchange } from '../api'

import {
  canTakeOverExchange,
  filterTakeableExchanges,
  isOwnExchange,
  isTakeableOrOwn,
} from './exchange-helpers'

const USER_ID = 'person-1'

function createExchange(overrides: Partial<GameExchange> = {}): GameExchange {
  return {
    __identity: 'exchange-1',
    status: 'open',
    refereePosition: 'head-one',
    submittedByPerson: { __identity: 'person-2', displayName: 'Other Referee' },
    ...overrides,
  } as GameExchange
}

/** Permissions payload as returned by the exchange search endpoint */
function permissions(update: boolean) {
  return { properties: { appliedBy: { update } } }
}

describe('canTakeOverExchange', () => {
  it('returns true when the server grants the apply permission', () => {
    expect(canTakeOverExchange(createExchange({ _permissions: permissions(true) }))).toBe(true)
  })

  it('returns false when the server denies the apply permission', () => {
    expect(canTakeOverExchange(createExchange({ _permissions: permissions(false) }))).toBe(false)
  })

  it('returns true when permissions are missing entirely', () => {
    expect(canTakeOverExchange(createExchange())).toBe(true)
  })

  it('returns true when the appliedBy permission is absent', () => {
    expect(canTakeOverExchange(createExchange({ _permissions: { properties: {} } }))).toBe(true)
  })

  it('returns true when the flag is not a boolean', () => {
    const exchange = createExchange({ _permissions: { properties: { appliedBy: {} } } })
    expect(canTakeOverExchange(exchange)).toBe(true)
  })
})

describe('isOwnExchange', () => {
  it('detects the signed-in referee as submitter', () => {
    const exchange = createExchange({ submittedByPerson: { __identity: USER_ID } })
    expect(isOwnExchange(exchange, USER_ID)).toBe(true)
  })

  it('returns false for another referee', () => {
    expect(isOwnExchange(createExchange(), USER_ID)).toBe(false)
  })

  it('returns false without a person id', () => {
    const exchange = createExchange({ submittedByPerson: undefined })
    expect(isOwnExchange(exchange, undefined)).toBe(false)
  })
})

describe('isTakeableOrOwn', () => {
  it('keeps a takeable entry from another referee', () => {
    expect(isTakeableOrOwn(createExchange({ _permissions: permissions(true) }), USER_ID)).toBe(true)
  })

  it('rejects a blocked entry from another referee', () => {
    expect(isTakeableOrOwn(createExchange({ _permissions: permissions(false) }), USER_ID)).toBe(
      false
    )
  })

  it('keeps a blocked entry the referee submitted', () => {
    const own = createExchange({
      submittedByPerson: { __identity: USER_ID },
      _permissions: permissions(false),
    })

    expect(isTakeableOrOwn(own, USER_ID)).toBe(true)
  })
})

describe('filterTakeableExchanges', () => {
  it('drops entries the referee may not take over', () => {
    const takeable = createExchange({ __identity: 'takeable', _permissions: permissions(true) })
    const blocked = createExchange({ __identity: 'blocked', _permissions: permissions(false) })

    const result = filterTakeableExchanges([takeable, blocked], USER_ID)

    expect(result.map((e) => e.__identity)).toEqual(['takeable'])
  })

  it('keeps own entries so they stay removable', () => {
    const own = createExchange({
      __identity: 'own',
      submittedByPerson: { __identity: USER_ID },
      _permissions: permissions(false),
    })

    expect(filterTakeableExchanges([own], USER_ID)).toEqual([own])
  })

  it('keeps entries without permission data', () => {
    const unknown = createExchange({ __identity: 'unknown' })

    expect(filterTakeableExchanges([unknown], USER_ID)).toEqual([unknown])
  })

  it('drops blocked entries when no person id is known', () => {
    const blocked = createExchange({ _permissions: permissions(false) })

    expect(filterTakeableExchanges([blocked], undefined)).toEqual([])
  })
})
