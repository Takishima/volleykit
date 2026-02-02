import { isValidElement } from 'react'

import { describe, it, expect, vi } from 'vitest'

import type { GameExchange } from '@/api/client'

import {
  createExchangeActions,
  canWithdrawApplication,
  isExchangeOwner,
  getRemoveActionType,
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

describe('canWithdrawApplication', () => {
  it('returns false when userId is undefined', () => {
    const exchange = {
      status: 'applied',
      appliedBy: { indoorReferee: { person: { __identity: 'user-1' } } },
    } as GameExchange
    expect(canWithdrawApplication(exchange, undefined)).toBe(false)
  })

  it('returns false when status is not applied', () => {
    const exchange = {
      status: 'open',
      appliedBy: { indoorReferee: { person: { __identity: 'user-1' } } },
    } as GameExchange
    expect(canWithdrawApplication(exchange, 'user-1')).toBe(false)
  })

  it('returns false when appliedBy does not match userId', () => {
    const exchange = {
      status: 'applied',
      appliedBy: { indoorReferee: { person: { __identity: 'other-user' } } },
    } as GameExchange
    expect(canWithdrawApplication(exchange, 'user-1')).toBe(false)
  })

  it('returns true when status is applied and user is the one who applied', () => {
    const exchange = {
      status: 'applied',
      appliedBy: { indoorReferee: { person: { __identity: 'user-1' } } },
    } as GameExchange
    expect(canWithdrawApplication(exchange, 'user-1')).toBe(true)
  })

  it('returns false when appliedBy is null', () => {
    const exchange = { status: 'applied', appliedBy: null } as GameExchange
    expect(canWithdrawApplication(exchange, 'user-1')).toBe(false)
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

describe('getRemoveActionType', () => {
  it('returns null when userId is undefined', () => {
    const exchange = { submittedByPerson: { __identity: 'user-1' } } as GameExchange
    expect(getRemoveActionType(exchange, undefined)).toBeNull()
  })

  it('returns remove-own-exchange when user is owner', () => {
    const exchange = { submittedByPerson: { __identity: 'user-1' }, status: 'open' } as GameExchange
    expect(getRemoveActionType(exchange, 'user-1')).toBe('remove-own-exchange')
  })

  it('returns withdraw-application when user applied to open exchange', () => {
    const exchange = {
      submittedByPerson: { __identity: 'other-user' },
      status: 'applied',
      appliedBy: { indoorReferee: { person: { __identity: 'user-1' } } },
    } as GameExchange
    expect(getRemoveActionType(exchange, 'user-1')).toBe('withdraw-application')
  })

  it('returns null when user is neither owner nor applicant', () => {
    const exchange = {
      submittedByPerson: { __identity: 'owner' },
      status: 'applied',
      appliedBy: { indoorReferee: { person: { __identity: 'other-user' } } },
    } as GameExchange
    expect(getRemoveActionType(exchange, 'user-1')).toBeNull()
  })

  it('prefers remove-own-exchange when user is both owner and could withdraw', () => {
    // This edge case shouldn't happen in practice (can't apply to own exchange)
    // but tests the priority of the logic
    const exchange = {
      submittedByPerson: { __identity: 'user-1' },
      status: 'applied',
      appliedBy: { indoorReferee: { person: { __identity: 'user-1' } } },
    } as GameExchange
    expect(getRemoveActionType(exchange, 'user-1')).toBe('remove-own-exchange')
  })
})
