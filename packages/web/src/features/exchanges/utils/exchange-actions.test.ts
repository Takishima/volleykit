import { isValidElement } from 'react'

import { describe, it, expect, vi } from 'vitest'

import type { GameExchange } from '@/api/client'
import { createConvocationRef, createMockExchange } from '@/test/exchange-factory'

import {
  createExchangeActions,
  resolveSwipeConfig,
  isExchangeOwner,
  canRemoveExchange,
  getConvocationIdFromExchange,
} from './exchange-actions'

const mockExchange = createMockExchange()

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
    const exchange = createMockExchange({
      refereePosition: 'head-one',
      refereeGame: {
        activeRefereeConvocationFirstHeadReferee: createConvocationRef('convocation-123'),
      },
    })
    expect(getConvocationIdFromExchange(exchange)).toBe('convocation-123')
  })

  it('returns convocation ID for head-two position', () => {
    const exchange = createMockExchange({
      refereePosition: 'head-two',
      refereeGame: {
        activeRefereeConvocationSecondHeadReferee: createConvocationRef('convocation-456'),
      },
    })
    expect(getConvocationIdFromExchange(exchange)).toBe('convocation-456')
  })

  it('returns convocation ID for linesman-one position', () => {
    const exchange = createMockExchange({
      refereePosition: 'linesman-one',
      refereeGame: {
        activeRefereeConvocationFirstLinesman: createConvocationRef('convocation-789'),
      },
    })
    expect(getConvocationIdFromExchange(exchange)).toBe('convocation-789')
  })

  it('returns convocation ID for linesman-two position', () => {
    const exchange = createMockExchange({
      refereePosition: 'linesman-two',
      refereeGame: {
        activeRefereeConvocationSecondLinesman: createConvocationRef('convocation-abc'),
      },
    })
    expect(getConvocationIdFromExchange(exchange)).toBe('convocation-abc')
  })

  it('returns convocation ID for standby-head position', () => {
    const exchange = createMockExchange({
      refereePosition: 'standby-head',
      refereeGame: {
        activeRefereeConvocationStandbyHeadReferee: createConvocationRef('convocation-def'),
      },
    })
    expect(getConvocationIdFromExchange(exchange)).toBe('convocation-def')
  })

  it('returns undefined for unknown position', () => {
    // Deliberately outside the RefereePosition union to exercise the fallback branch
    const unknownPosition = 'unknown-position' as unknown as GameExchange['refereePosition']
    const exchange = createMockExchange({
      refereePosition: unknownPosition,
      refereeGame: {},
    })
    expect(getConvocationIdFromExchange(exchange)).toBeUndefined()
  })
})

describe('resolveSwipeConfig', () => {
  const actions = createExchangeActions(mockExchange, {
    onTakeOver: vi.fn(),
    onRemoveFromExchange: vi.fn(),
  })

  it('offers take over for an open entry the referee may apply for', () => {
    const config = resolveSwipeConfig(mockExchange, actions, {
      isMineTab: false,
      isOwn: false,
      takeable: true,
    })

    expect(config).toEqual({ left: [actions.takeOver] })
  })

  it('offers nothing for a blocked entry the referee chose to see', () => {
    // The association refuses the take-over; the backend would reject a swipe
    const config = resolveSwipeConfig(mockExchange, actions, {
      isMineTab: false,
      isOwn: false,
      takeable: false,
    })

    expect(config).toEqual({})
  })

  it('still lets the referee remove their own blocked entry', () => {
    const config = resolveSwipeConfig(mockExchange, actions, {
      isMineTab: false,
      isOwn: true,
      takeable: false,
    })

    expect(config).toEqual({ right: [actions.removeFromExchange] })
  })

  it('only offers removal on the mine tab', () => {
    const config = resolveSwipeConfig(mockExchange, actions, {
      isMineTab: true,
      isOwn: true,
      takeable: true,
    })

    expect(config).toEqual({ right: [actions.removeFromExchange] })
  })

  it('offers nothing for an entry that is no longer open', () => {
    const applied = { ...mockExchange, status: 'applied' } as GameExchange
    const config = resolveSwipeConfig(applied, actions, {
      isMineTab: false,
      isOwn: false,
      takeable: true,
    })

    expect(config).toEqual({})
  })
})
