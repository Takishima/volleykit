import { isValidElement } from 'react'

import { describe, it, expect, vi } from 'vitest'

import type { GameExchange } from '@/api/client'

import {
  createExchangeActions,
  isExchangeOwner,
  canRemoveExchange,
  getConvocationIdFromExchange,
} from './exchange-actions'

const mockExchange: GameExchange = {
  __identity: 'test-exchange-1',
  status: 'open',
  refereeGame: {
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
} as GameExchange

describe('createExchangeActions', () => {
  it('should create both action handlers', () => {
    const handlers = {
      onTakeOver: vi.fn(),
      onRemoveFromExchange: vi.fn(),
    }

    const actions = createExchangeActions(mockExchange, handlers)

    expect(actions.takeOver).toBeDefined()
    expect(actions.removeFromExchange).toBeDefined()
  })

  it('should call correct handler when take over action is triggered', () => {
    const handlers = {
      onTakeOver: vi.fn(),
      onRemoveFromExchange: vi.fn(),
    }

    const actions = createExchangeActions(mockExchange, handlers)

    actions.takeOver.onAction()
    expect(handlers.onTakeOver).toHaveBeenCalledWith(mockExchange)
    expect(handlers.onRemoveFromExchange).not.toHaveBeenCalled()
  })

  it('should call correct handler when remove from exchange action is triggered', () => {
    const handlers = {
      onTakeOver: vi.fn(),
      onRemoveFromExchange: vi.fn(),
    }

    const actions = createExchangeActions(mockExchange, handlers)

    actions.removeFromExchange.onAction()
    expect(handlers.onRemoveFromExchange).toHaveBeenCalledWith(mockExchange)
    expect(handlers.onTakeOver).not.toHaveBeenCalled()
  })

  it('should have correct take over action properties', () => {
    const handlers = {
      onTakeOver: vi.fn(),
      onRemoveFromExchange: vi.fn(),
    }

    const actions = createExchangeActions(mockExchange, handlers)

    expect(actions.takeOver.id).toBe('take-over')
    expect(actions.takeOver.label).toBe('Take Over')
    expect(actions.takeOver.shortLabel).toBe('Take Over')
    expect(actions.takeOver.color).toBe('bg-primary-500')
    expect(isValidElement(actions.takeOver.icon)).toBe(true)
  })

  it('should have correct remove from exchange action properties', () => {
    const handlers = {
      onTakeOver: vi.fn(),
      onRemoveFromExchange: vi.fn(),
    }

    const actions = createExchangeActions(mockExchange, handlers)

    expect(actions.removeFromExchange.id).toBe('remove-from-exchange')
    expect(actions.removeFromExchange.label).toBe('Remove')
    expect(actions.removeFromExchange.shortLabel).toBe('Remove')
    expect(actions.removeFromExchange.color).toBe('bg-danger-500')
    expect(isValidElement(actions.removeFromExchange.icon)).toBe(true)
  })
})

describe('isExchangeOwner', () => {
  it('returns false when userId is undefined', () => {
    const exchange = { submittedByPerson: { __identity: 'user-1' } } as GameExchange
    expect(isExchangeOwner(exchange, undefined)).toBe(false)
  })

  it('returns false when submittedByPerson does not match userId', () => {
    const exchange = { submittedByPerson: { __identity: 'other-user' } } as GameExchange
    expect(isExchangeOwner(exchange, 'user-1')).toBe(false)
  })

  it('returns true when submittedByPerson matches userId', () => {
    const exchange = { submittedByPerson: { __identity: 'user-1' } } as GameExchange
    expect(isExchangeOwner(exchange, 'user-1')).toBe(true)
  })
})

describe('canRemoveExchange', () => {
  it('returns false when userId is undefined', () => {
    const exchange = { submittedByPerson: { __identity: 'user-1' } } as GameExchange
    expect(canRemoveExchange(exchange, undefined)).toBe(false)
  })

  it('returns false when user is not the owner', () => {
    const exchange = { submittedByPerson: { __identity: 'other-user' } } as GameExchange
    expect(canRemoveExchange(exchange, 'user-1')).toBe(false)
  })

  it('returns true when user is the owner', () => {
    const exchange = { submittedByPerson: { __identity: 'user-1' } } as GameExchange
    expect(canRemoveExchange(exchange, 'user-1')).toBe(true)
  })
})

describe('getConvocationIdFromExchange', () => {
  it('returns undefined when refereePosition is missing', () => {
    const exchange = { refereeGame: {} } as GameExchange
    expect(getConvocationIdFromExchange(exchange)).toBeUndefined()
  })

  it('returns undefined when refereeGame is missing', () => {
    const exchange = { refereePosition: 'head-one' } as GameExchange
    expect(getConvocationIdFromExchange(exchange)).toBeUndefined()
  })

  it('returns undefined when convocation field is not populated', () => {
    const exchange = {
      refereePosition: 'head-one',
      refereeGame: {},
    } as GameExchange
    expect(getConvocationIdFromExchange(exchange)).toBeUndefined()
  })

  it('returns convocation ID for head-one position', () => {
    const exchange = {
      refereePosition: 'head-one',
      refereeGame: {
        activeRefereeConvocationFirstHeadReferee: { __identity: 'convocation-123' },
      },
    } as GameExchange
    expect(getConvocationIdFromExchange(exchange)).toBe('convocation-123')
  })

  it('returns convocation ID for head-two position', () => {
    const exchange = {
      refereePosition: 'head-two',
      refereeGame: {
        activeRefereeConvocationSecondHeadReferee: { __identity: 'convocation-456' },
      },
    } as GameExchange
    expect(getConvocationIdFromExchange(exchange)).toBe('convocation-456')
  })

  it('returns convocation ID for linesman-one position', () => {
    const exchange = {
      refereePosition: 'linesman-one',
      refereeGame: {
        activeRefereeConvocationFirstLinesman: { __identity: 'convocation-789' },
      },
    } as GameExchange
    expect(getConvocationIdFromExchange(exchange)).toBe('convocation-789')
  })

  it('returns convocation ID for linesman-two position', () => {
    const exchange = {
      refereePosition: 'linesman-two',
      refereeGame: {
        activeRefereeConvocationSecondLinesman: { __identity: 'convocation-abc' },
      },
    } as GameExchange
    expect(getConvocationIdFromExchange(exchange)).toBe('convocation-abc')
  })

  it('returns convocation ID for standby-head position', () => {
    const exchange = {
      refereePosition: 'standby-head',
      refereeGame: {
        activeRefereeConvocationStandbyHeadReferee: { __identity: 'convocation-def' },
      },
    } as GameExchange
    expect(getConvocationIdFromExchange(exchange)).toBe('convocation-def')
  })

  it('returns undefined for unknown position', () => {
    const exchange = {
      refereePosition: 'unknown-position',
      refereeGame: {},
    } as GameExchange
    expect(getConvocationIdFromExchange(exchange)).toBeUndefined()
  })
})
