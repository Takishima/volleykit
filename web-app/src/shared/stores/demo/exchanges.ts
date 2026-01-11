/**
 * Exchanges slice for demo store.
 * Handles game exchange data and operations.
 *
 * Key behaviors:
 * - When user adds assignment to exchange: assignment moves from assignments to exchanges
 * - When user takes over an exchange: exchange removed, new assignment created
 * - When user removes their own exchange: original assignment restored
 */

import type { Assignment, GameExchange } from '@/api/client'
import { generateDemoUuid } from '@/shared/utils/demo-uuid'

import { DEMO_USER_PERSON_IDENTITY } from './types'

import type { DemoState, DemoExchangesState } from './types'
import type { StateCreator } from 'zustand'

export interface ExchangesSlice extends DemoExchangesState {
  applyForExchange: (exchangeId: string) => void
  withdrawFromExchange: (exchangeId: string) => void
  addAssignmentToExchange: (assignmentId: string) => void
  removeOwnExchange: (exchangeId: string) => void
}

/**
 * Creates a new assignment from an exchange when the user takes it over.
 */
function createAssignmentFromExchange(exchange: GameExchange): Assignment {
  return {
    __identity: generateDemoUuid(`demo-assignment-from-exchange-${Date.now()}`),
    refereeConvocationStatus: 'active',
    refereePosition: exchange.refereePosition ?? 'head-one',
    confirmationStatus: 'pending',
    confirmationDate: null,
    isOpenEntryInRefereeGameExchange: false,
    hasLastMessageToReferee: false,
    hasLinkedDoubleConvocation: false,
    refereeGame: exchange.refereeGame,
  }
}

export const createExchangesSlice: StateCreator<DemoState, [], [], ExchangesSlice> = (set) => ({
  exchanges: [],
  exchangedAssignments: {},

  applyForExchange: (exchangeId: string) =>
    set((state) => {
      const exchange = state.exchanges.find((e) => e.__identity === exchangeId)
      if (!exchange) return state

      // Check if this is the user's own exchange (can't take over your own)
      const isOwnExchange = exchange.submittedByPerson?.__identity === DEMO_USER_PERSON_IDENTITY
      if (isOwnExchange) return state

      // Create a new assignment for the user based on the exchange
      const newAssignment = createAssignmentFromExchange(exchange)

      return {
        // Remove the exchange from the list
        exchanges: state.exchanges.filter((e) => e.__identity !== exchangeId),
        // Add the new assignment to the user's assignments
        assignments: [...state.assignments, newAssignment],
      }
    }),

  withdrawFromExchange: (exchangeId: string) =>
    set((state) => ({
      exchanges: state.exchanges.map((exchange) =>
        exchange.__identity === exchangeId
          ? {
              ...exchange,
              status: 'open' as const,
              appliedAt: undefined,
              appliedBy: undefined,
            }
          : exchange
      ),
    })),

  addAssignmentToExchange: (assignmentId: string) =>
    set((state) => {
      const assignment = state.assignments.find((a) => a.__identity === assignmentId)
      if (!assignment) return state

      const now = new Date()
      const exchangeId = generateDemoUuid(`demo-exchange-new-${Date.now()}`)
      const newExchange: GameExchange = {
        __identity: exchangeId,
        status: 'open',
        submittedAt: now.toISOString(),
        submittingType: 'referee',
        refereePosition: assignment.refereePosition,
        requiredRefereeLevel: 'N3',
        submittedByPerson: {
          __identity: DEMO_USER_PERSON_IDENTITY,
          firstName: 'Demo',
          lastName: 'User',
          displayName: 'Demo User',
        },
        refereeGame: assignment.refereeGame,
      }

      return {
        // Remove assignment from assignments list
        assignments: state.assignments.filter((a) => a.__identity !== assignmentId),
        // Add new exchange
        exchanges: [...state.exchanges, newExchange],
        // Store original assignment for potential restoration
        exchangedAssignments: {
          ...state.exchangedAssignments,
          [exchangeId]: assignment,
        },
      }
    }),

  removeOwnExchange: (exchangeId: string) =>
    set((state) => {
      const exchange = state.exchanges.find((e) => e.__identity === exchangeId)
      if (!exchange) return state

      // Only allow removing exchanges submitted by the demo user
      const isOwnExchange = exchange.submittedByPerson?.__identity === DEMO_USER_PERSON_IDENTITY
      if (!isOwnExchange) return state

      // Get original assignment if it exists
      const originalAssignment = state.exchangedAssignments[exchangeId]

      // Create new exchangedAssignments without this entry
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Destructuring to omit key
      const { [exchangeId]: _removed, ...remainingExchangedAssignments } =
        state.exchangedAssignments

      return {
        // Remove exchange from list
        exchanges: state.exchanges.filter((e) => e.__identity !== exchangeId),
        // Restore original assignment if it exists
        assignments: originalAssignment
          ? [...state.assignments, originalAssignment]
          : state.assignments,
        // Remove from tracking
        exchangedAssignments: remainingExchangedAssignments,
      }
    }),
})
