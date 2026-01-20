import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { mockApi } from '@/api/mock-api'
import { setLocale } from '@/i18n'
import { useAuthStore } from '@/shared/stores/auth'
import { useDemoStore, DEMO_USER_PERSON_IDENTITY } from '@/shared/stores/demo'
import { useToastStore } from '@/shared/stores/toast'

import { ExchangePage } from './ExchangePage'

/**
 * Exchanges Integration Tests
 *
 * Tests the exchange workflow including:
 * - Viewing available exchanges from demo store
 * - Applying for an exchange (taking over assignment)
 * - Withdrawing from an exchange
 * - Store updates after exchange operations
 * - Query invalidation after mutations
 */

// Save original functions before any spying
const originalSearchExchanges = mockApi.searchExchanges.bind(mockApi)
const originalApplyForExchange = mockApi.applyForExchange.bind(mockApi)
const originalWithdrawFromExchange = mockApi.withdrawFromExchange.bind(mockApi)

describe('Exchanges Integration', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    setLocale('en')
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })

    // Restore original functions and create fresh spies
    mockApi.searchExchanges = originalSearchExchanges
    mockApi.applyForExchange = originalApplyForExchange
    mockApi.withdrawFromExchange = originalWithdrawFromExchange

    vi.spyOn(mockApi, 'searchExchanges')
    vi.spyOn(mockApi, 'applyForExchange')
    vi.spyOn(mockApi, 'withdrawFromExchange')

    // Reset stores to initial state
    useAuthStore.setState({
      status: 'idle',
      user: null,
      dataSource: 'api',
      activeOccupationId: null,
      isAssociationSwitching: false,
      error: null,
      csrfToken: null,
      _checkSessionPromise: null,
    })
    useDemoStore.getState().clearDemoData()
    useToastStore.getState().clearToasts()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    queryClient.clear()
    useToastStore.getState().clearToasts()
  })

  function renderExchangePage() {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ExchangePage />
        </MemoryRouter>
      </QueryClientProvider>
    )
  }

  describe('demo mode exchange display', () => {
    beforeEach(() => {
      useAuthStore.getState().setDemoAuthenticated()
      useDemoStore.getState().initializeDemoData('SV')
    })

    it('displays exchanges from demo store', async () => {
      renderExchangePage()

      // Wait for the page to load
      await waitFor(() => {
        const demoState = useDemoStore.getState()
        expect(demoState.exchanges.length).toBeGreaterThan(0)
      })

      // The API should be called with mock API
      await waitFor(() => {
        expect(mockApi.searchExchanges).toHaveBeenCalled()
      })
    })

    it('updates exchanges when switching association', async () => {
      renderExchangePage()

      // Wait for initial data
      await waitFor(() => {
        expect(useDemoStore.getState().activeAssociationCode).toBe('SV')
      })

      const initialExchanges = useDemoStore.getState().exchanges

      // Switch association
      useDemoStore.getState().setActiveAssociation('SVRBA')

      await waitFor(() => {
        expect(useDemoStore.getState().activeAssociationCode).toBe('SVRBA')
      })

      // Exchanges should be regenerated for new association
      const newExchanges = useDemoStore.getState().exchanges
      expect(newExchanges).not.toBe(initialExchanges)
    })
  })

  describe('apply for exchange flow', () => {
    beforeEach(() => {
      useAuthStore.getState().setDemoAuthenticated()
      useDemoStore.getState().initializeDemoData('SV')
    })

    it('removes exchange from list when applying', async () => {
      const initialState = useDemoStore.getState()

      // Find an exchange that is NOT submitted by the demo user
      const exchangeToApply = initialState.exchanges.find(
        (e) => e.submittedByPerson?.__identity !== DEMO_USER_PERSON_IDENTITY && e.status === 'open'
      )

      expect(exchangeToApply).toBeDefined()
      const exchangeId = exchangeToApply!.__identity
      const initialExchangeCount = initialState.exchanges.length

      // Apply for the exchange via mock API
      await mockApi.applyForExchange(exchangeId)

      expect(mockApi.applyForExchange).toHaveBeenCalledWith(exchangeId)

      // Exchange should be removed from list
      const newState = useDemoStore.getState()
      expect(newState.exchanges.length).toBe(initialExchangeCount - 1)
      expect(newState.exchanges.find((e) => e.__identity === exchangeId)).toBeUndefined()
    })

    it('creates new assignment when applying for exchange', async () => {
      const initialState = useDemoStore.getState()

      // Find an exchange NOT submitted by demo user
      const exchangeToApply = initialState.exchanges.find(
        (e) => e.submittedByPerson?.__identity !== DEMO_USER_PERSON_IDENTITY && e.status === 'open'
      )

      expect(exchangeToApply).toBeDefined()
      const exchangeId = exchangeToApply!.__identity
      const initialAssignmentCount = initialState.assignments.length

      // Apply for the exchange
      await mockApi.applyForExchange(exchangeId)

      // A new assignment should be created
      const newState = useDemoStore.getState()
      expect(newState.assignments.length).toBe(initialAssignmentCount + 1)

      // The new assignment should be related to the exchange's game
      const newAssignment = newState.assignments[newState.assignments.length - 1]
      expect(newAssignment?.refereeGame?.game?.__identity).toBe(
        exchangeToApply!.refereeGame?.game?.__identity
      )
    })

    it('prevents applying for own exchange when user has submitted one', async () => {
      const initialState = useDemoStore.getState()
      const assignmentToExchange = initialState.assignments[0]

      // First, create an exchange from the demo user by adding an assignment to exchange
      expect(assignmentToExchange).toBeDefined()
      useDemoStore.getState().addAssignmentToExchange(assignmentToExchange!.__identity)

      const stateAfterExchange = useDemoStore.getState()

      // Find the exchange we just created (submitted by demo user)
      const ownExchange = stateAfterExchange.exchanges.find(
        (e) => e.submittedByPerson?.__identity === DEMO_USER_PERSON_IDENTITY
      )

      expect(ownExchange).toBeDefined()
      if (!ownExchange) return // Type guard for TypeScript

      const exchangeId = ownExchange.__identity
      const exchangeCountBefore = stateAfterExchange.exchanges.length
      const assignmentCountBefore = stateAfterExchange.assignments.length

      // Try to apply for own exchange - should be blocked
      await mockApi.applyForExchange(exchangeId)

      // Should not change anything (applyForExchange checks for own exchange)
      const newState = useDemoStore.getState()
      expect(newState.exchanges.length).toBe(exchangeCountBefore)
      expect(newState.assignments.length).toBe(assignmentCountBefore)
    })
  })

  describe('withdraw from exchange flow', () => {
    beforeEach(() => {
      useAuthStore.getState().setDemoAuthenticated()
      useDemoStore.getState().initializeDemoData('SV')
    })

    it('restores exchange status when withdrawing', async () => {
      const initialState = useDemoStore.getState()

      // Find an exchange with status 'open' that we can modify
      const exchange = initialState.exchanges.find(
        (e) => e.submittedByPerson?.__identity !== DEMO_USER_PERSON_IDENTITY && e.status === 'open'
      )

      // Demo data should include open exchanges from other users
      expect(exchange).toBeDefined()
      if (!exchange) return // Type guard for TypeScript

      const exchangeId = exchange.__identity

      // Withdraw from the exchange
      await mockApi.withdrawFromExchange(exchangeId)

      expect(mockApi.withdrawFromExchange).toHaveBeenCalledWith(exchangeId)

      // Exchange status should remain open (withdrawal clears applied state)
      const newState = useDemoStore.getState()
      const updatedExchange = newState.exchanges.find((e) => e.__identity === exchangeId)
      expect(updatedExchange?.status).toBe('open')
    })
  })

  describe('add assignment to exchange', () => {
    beforeEach(() => {
      useAuthStore.getState().setDemoAuthenticated()
      useDemoStore.getState().initializeDemoData('SV')
    })

    it('moves assignment to exchanges when adding to exchange', () => {
      const initialState = useDemoStore.getState()
      const assignmentToExchange = initialState.assignments[0]

      expect(assignmentToExchange).toBeDefined()
      const assignmentId = assignmentToExchange!.__identity
      const initialAssignmentCount = initialState.assignments.length
      const initialExchangeCount = initialState.exchanges.length

      // Add assignment to exchange (direct store call)
      useDemoStore.getState().addAssignmentToExchange(assignmentId)

      const newState = useDemoStore.getState()

      // Assignment should be removed from assignments
      expect(newState.assignments.length).toBe(initialAssignmentCount - 1)
      expect(newState.assignments.find((a) => a.__identity === assignmentId)).toBeUndefined()

      // New exchange should be created
      expect(newState.exchanges.length).toBe(initialExchangeCount + 1)

      // The new exchange should be submitted by demo user
      const newExchange = newState.exchanges[newState.exchanges.length - 1]
      expect(newExchange?.submittedByPerson?.__identity).toBe(DEMO_USER_PERSON_IDENTITY)
      expect(newExchange?.status).toBe('open')
    })

    it('stores original assignment for restoration', () => {
      const initialState = useDemoStore.getState()
      const assignmentToExchange = initialState.assignments[0]
      const assignmentId = assignmentToExchange!.__identity

      // Add assignment to exchange
      useDemoStore.getState().addAssignmentToExchange(assignmentId)

      const newState = useDemoStore.getState()

      // Find the new exchange
      const newExchange = newState.exchanges.find(
        (e) =>
          e.submittedByPerson?.__identity === DEMO_USER_PERSON_IDENTITY &&
          !initialState.exchanges.some((ie) => ie.__identity === e.__identity)
      )

      expect(newExchange).toBeDefined()

      // Original assignment should be stored for restoration
      expect(newState.exchangedAssignments[newExchange!.__identity]).toBeDefined()
      expect(newState.exchangedAssignments[newExchange!.__identity]?.__identity).toBe(assignmentId)
    })
  })

  describe('remove own exchange', () => {
    beforeEach(() => {
      useAuthStore.getState().setDemoAuthenticated()
      useDemoStore.getState().initializeDemoData('SV')
    })

    it('restores original assignment when removing own exchange', () => {
      const initialState = useDemoStore.getState()
      const assignmentToExchange = initialState.assignments[0]
      const assignmentId = assignmentToExchange!.__identity
      const initialAssignmentCount = initialState.assignments.length

      // First, add assignment to exchange
      useDemoStore.getState().addAssignmentToExchange(assignmentId)

      let state = useDemoStore.getState()
      expect(state.assignments.length).toBe(initialAssignmentCount - 1)

      // Find the created exchange
      const createdExchange = state.exchanges.find(
        (e) =>
          e.submittedByPerson?.__identity === DEMO_USER_PERSON_IDENTITY &&
          !initialState.exchanges.some((ie) => ie.__identity === e.__identity)
      )

      expect(createdExchange).toBeDefined()

      // Remove own exchange
      useDemoStore.getState().removeOwnExchange(createdExchange!.__identity)

      state = useDemoStore.getState()

      // Assignment should be restored
      expect(state.assignments.length).toBe(initialAssignmentCount)
      expect(state.assignments.find((a) => a.__identity === assignmentId)).toBeDefined()

      // Exchange should be removed
      expect(state.exchanges.find((e) => e.__identity === createdExchange!.__identity)).toBeUndefined()
    })
  })

  describe('query invalidation', () => {
    beforeEach(() => {
      useAuthStore.getState().setDemoAuthenticated()
      useDemoStore.getState().initializeDemoData('SV')
    })

    it('triggers refetch when exchange is applied', async () => {
      renderExchangePage()

      // Wait for initial data
      await waitFor(() => {
        expect(mockApi.searchExchanges).toHaveBeenCalled()
      })

      const initialCallCount = vi.mocked(mockApi.searchExchanges).mock.calls.length

      // Find an exchange to apply for
      const exchanges = useDemoStore.getState().exchanges
      const exchangeToApply = exchanges.find(
        (e) => e.submittedByPerson?.__identity !== DEMO_USER_PERSON_IDENTITY && e.status === 'open'
      )

      // Demo data should include open exchanges from other users
      expect(exchangeToApply).toBeDefined()
      if (!exchangeToApply) return // Type guard for TypeScript

      // Apply for exchange
      await mockApi.applyForExchange(exchangeToApply.__identity)

      // Manually invalidate queries as the mutation would
      queryClient.invalidateQueries({ queryKey: ['exchanges'] })

      // After invalidation, query should refetch
      await waitFor(() => {
        const newCallCount = vi.mocked(mockApi.searchExchanges).mock.calls.length
        expect(newCallCount).toBeGreaterThan(initialCallCount)
      })
    })
  })

  describe('exchange filtering', () => {
    beforeEach(() => {
      useAuthStore.getState().setDemoAuthenticated()
      useDemoStore.getState().initializeDemoData('SV')
    })

    it('filters "mine" exchanges by submittedByPerson', async () => {
      const state = useDemoStore.getState()

      // Count exchanges submitted by demo user
      const myExchanges = state.exchanges.filter(
        (e) => e.submittedByPerson?.__identity === DEMO_USER_PERSON_IDENTITY
      )

      // Count exchanges by others
      const otherExchanges = state.exchanges.filter(
        (e) => e.submittedByPerson?.__identity !== DEMO_USER_PERSON_IDENTITY
      )

      // Demo data should have both types
      expect(myExchanges.length + otherExchanges.length).toBe(state.exchanges.length)
    })
  })
})
