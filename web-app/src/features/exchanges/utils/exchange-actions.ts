import { createElement } from 'react'

import type { GameExchange } from '@/api/client'
import { Check, X } from '@/shared/components/icons'
import { type SwipeAction, SWIPE_ACTION_ICON_SIZE } from '@/types/swipe'

// Pre-created icon elements to avoid recreating on each function call
const ICON_CHECK = createElement(Check, { size: SWIPE_ACTION_ICON_SIZE })
const ICON_X = createElement(X, { size: SWIPE_ACTION_ICON_SIZE })

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
 * Checks if the user can remove this exchange from the marketplace.
 *
 * Only the owner (submitter) of an exchange can remove it.
 * This uses the confirmed deleteFromRefereeGameExchange API.
 *
 * @param exchange - The exchange to check
 * @param userId - The current user's person identity
 * @returns true if the user can remove this exchange
 */
export function canRemoveExchange(exchange: GameExchange, userId: string | undefined): boolean {
  return isExchangeOwner(exchange, userId)
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
