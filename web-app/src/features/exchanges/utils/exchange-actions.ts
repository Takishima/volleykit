import { createElement } from 'react'

import type { GameExchange } from '@/api/client'
import { Check, X } from '@/shared/components/icons'
import { type SwipeAction, SWIPE_ACTION_ICON_SIZE } from '@/types/swipe'

// Pre-created icon elements to avoid recreating on each function call
const ICON_CHECK = createElement(Check, { size: SWIPE_ACTION_ICON_SIZE })
const ICON_X = createElement(X, { size: SWIPE_ACTION_ICON_SIZE })

/**
 * Checks if a user can withdraw their application from an exchange.
 *
 * To withdraw an application:
 * 1. The exchange must be in 'applied' status
 * 2. The current user must be the one who applied (appliedBy matches userId)
 *
 * @param exchange - The exchange to check
 * @param userId - The current user's person identity
 * @returns true if the user can withdraw their application
 */
export function canWithdrawApplication(
  exchange: GameExchange,
  userId: string | undefined
): boolean {
  if (!userId) return false
  if (exchange.status !== 'applied') return false

  // Check if the current user is the one who applied
  const appliedByIdentity = exchange.appliedBy?.indoorReferee?.person?.__identity
  return appliedByIdentity === userId
}

/**
 * Checks if an exchange is owned by the specified user (they submitted it).
 *
 * @param exchange - The exchange to check
 * @param userId - The current user's person identity
 * @returns true if the user submitted this exchange
 */
export function isExchangeOwner(exchange: GameExchange, userId: string | undefined): boolean {
  if (!userId) return false
  return exchange.submittedByPerson?.__identity === userId
}

/**
 * Determines the type of "remove" action available for an exchange.
 *
 * - 'withdraw-application': User applied to someone else's exchange and can withdraw
 * - 'remove-own-exchange': User's own exchange, can remove from marketplace
 * - null: No remove action available
 *
 * @param exchange - The exchange to check
 * @param userId - The current user's person identity
 */
export function getRemoveActionType(
  exchange: GameExchange,
  userId: string | undefined
): 'withdraw-application' | 'remove-own-exchange' | null {
  if (!userId) return null

  // User's own exchange - can remove from marketplace
  if (isExchangeOwner(exchange, userId)) {
    return 'remove-own-exchange'
  }

  // User applied to this exchange - can withdraw application
  if (canWithdrawApplication(exchange, userId)) {
    return 'withdraw-application'
  }

  return null
}

/**
 * Maps referee position codes to their corresponding convocation field names.
 * Used to extract the convocation ID needed for deleteFromRefereeGameExchange.
 */
const POSITION_TO_CONVOCATION_FIELD: Record<string, string> = {
  'head-one': 'activeRefereeConvocationFirstHeadReferee',
  'head-two': 'activeRefereeConvocationSecondHeadReferee',
  'linesman-one': 'activeRefereeConvocationFirstLinesman',
  'linesman-two': 'activeRefereeConvocationSecondLinesman',
  'linesman-three': 'activeRefereeConvocationThirdLinesman',
  'linesman-four': 'activeRefereeConvocationFourthLinesman',
  'standby-head': 'activeRefereeConvocationStandbyHeadReferee',
  'standby-linesman': 'activeRefereeConvocationStandbyLinesman',
}

/**
 * Extracts the convocation ID from an exchange based on its referee position.
 *
 * The deleteFromRefereeGameExchange API requires the convocation ID, not the exchange ID.
 * This function looks up the correct convocation based on the exchange's refereePosition
 * and extracts its __identity.
 *
 * @param exchange - The exchange to extract the convocation ID from
 * @returns The convocation UUID if found, undefined otherwise
 */
export function getConvocationIdFromExchange(exchange: GameExchange): string | undefined {
  const position = exchange.refereePosition
  if (!position) return undefined

  const convocationField = POSITION_TO_CONVOCATION_FIELD[position]
  if (!convocationField) return undefined

  // Access the convocation object from refereeGame using the mapped field name
  const refereeGame = exchange.refereeGame
  if (!refereeGame) return undefined

  // TypeScript doesn't know about the dynamic field, so we use type assertion
  const convocation = (refereeGame as Record<string, { __identity?: string } | undefined>)[
    convocationField
  ]

  return convocation?.__identity
}

export interface ExchangeActionConfig {
  takeOver: SwipeAction
  removeFromExchange: SwipeAction
}

export interface ExchangeActionHandlers {
  onTakeOver: (exchange: GameExchange) => void
  onRemoveFromExchange: (exchange: GameExchange) => void
}

export function createExchangeActions(
  exchange: GameExchange,
  handlers: ExchangeActionHandlers
): ExchangeActionConfig {
  return {
    takeOver: {
      id: 'take-over',
      label: 'Take Over',
      shortLabel: 'Take Over',
      color: 'bg-primary-500',
      icon: ICON_CHECK,
      onAction: () => handlers.onTakeOver(exchange),
    },
    removeFromExchange: {
      id: 'remove-from-exchange',
      label: 'Remove',
      shortLabel: 'Remove',
      color: 'bg-danger-500',
      icon: ICON_X,
      onAction: () => handlers.onRemoveFromExchange(exchange),
    },
  }
}
