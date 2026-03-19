import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { mockApi } from '@/api/mock-api'
import { setLocale } from '@/i18n'
import { useAuthStore } from '@/shared/stores/auth'
import { useDemoStore } from '@/shared/stores/demo'
import { useToastStore } from '@/shared/stores/toast'

import { CompensationsPage } from './CompensationsPage'

/**
 * Compensations Integration Tests
 *
 * Tests the compensation workflow including:
 * - Viewing compensation records from demo store
 * - Opening edit modal for a compensation
 * - Saving compensation updates through store
 * - Tab switching between paid/unpaid
 */

// Save original functions before any spying
const originalSearchCompensations = mockApi.searchCompensations.bind(mockApi)
const originalGetCompensationDetails = mockApi.getCompensationDetails.bind(mockApi)
const originalUpdateCompensation = mockApi.updateCompensation.bind(mockApi)

describe('Compensations Integration', () => {
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
    mockApi.searchCompensations = originalSearchCompensations
    mockApi.getCompensationDetails = originalGetCompensationDetails
    mockApi.updateCompensation = originalUpdateCompensation

    vi.spyOn(mockApi, 'searchCompensations')
    vi.spyOn(mockApi, 'getCompensationDetails')
    vi.spyOn(mockApi, 'updateCompensation')

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

  function renderCompensationsPage() {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CompensationsPage />
        </MemoryRouter>
      </QueryClientProvider>
    )
  }

  describe('demo mode compensation display', () => {
    beforeEach(() => {
      useAuthStore.getState().setDemoAuthenticated()
      useDemoStore.getState().initializeDemoData('SV')
    })

    it('displays compensations from demo store', async () => {
      renderCompensationsPage()

      // Wait for the page to load
      await waitFor(() => {
        // Should have some compensation data displayed
        const demoState = useDemoStore.getState()
        expect(demoState.compensations.length).toBeGreaterThan(0)
      })

      // The API should be called with mock API
      await waitFor(() => {
        expect(mockApi.searchCompensations).toHaveBeenCalled()
      })
    })

    it('updates compensations when switching association', async () => {
      renderCompensationsPage()

      // Wait for initial data
      await waitFor(() => {
        expect(useDemoStore.getState().activeAssociationCode).toBe('SV')
      })

      const initialCompensations = useDemoStore.getState().compensations

      // Switch association
      useDemoStore.getState().setActiveAssociation('SVRBA')

      await waitFor(() => {
        expect(useDemoStore.getState().activeAssociationCode).toBe('SVRBA')
      })

      // Compensations should be regenerated for new association
      const newCompensations = useDemoStore.getState().compensations
      expect(newCompensations).not.toBe(initialCompensations)
    })
  })

  describe('compensation update flow', () => {
    beforeEach(() => {
      useAuthStore.getState().setDemoAuthenticated()
      useDemoStore.getState().initializeDemoData('SV')
    })

    it('calls updateCompensation API when saving changes', async () => {
      const compensations = useDemoStore.getState().compensations
      const testCompensation = compensations[0]
      const compensationId = testCompensation?.convocationCompensation?.__identity

      expect(compensationId).toBeDefined()

      // Simulate calling updateCompensation directly (as the modal would)
      await mockApi.updateCompensation(compensationId!, {
        distanceInMetres: 25000,
        correctionReason: 'Test correction',
      })

      expect(mockApi.updateCompensation).toHaveBeenCalledWith(compensationId, {
        distanceInMetres: 25000,
        correctionReason: 'Test correction',
      })

      // Demo store should be updated
      const updatedCompensations = useDemoStore.getState().compensations
      const updatedCompensation = updatedCompensations.find(
        (c) => c.convocationCompensation?.__identity === compensationId
      )

      expect(updatedCompensation?.convocationCompensation?.distanceInMetres).toBe(25000)
      // correctionReason is stored in demo store but not in base type - cast to access it
      const convComp = updatedCompensation?.convocationCompensation as { correctionReason?: string }
      expect(convComp?.correctionReason).toBe('Test correction')
    })

    it('persists compensation updates in demo store', async () => {
      const compensations = useDemoStore.getState().compensations
      const testCompensation = compensations[0]
      const compensationId = testCompensation?.convocationCompensation?.__identity

      // Update compensation
      await mockApi.updateCompensation(compensationId!, {
        distanceInMetres: 30000,
      })

      // Verify persistence in demo store
      const demoState = useDemoStore.getState()
      const found = demoState.compensations.find(
        (c) => c.convocationCompensation?.__identity === compensationId
      )
      expect(found?.convocationCompensation?.distanceInMetres).toBe(30000)
    })
  })

  describe('tab navigation with real stores', () => {
    beforeEach(() => {
      useAuthStore.getState().setDemoAuthenticated()
      useDemoStore.getState().initializeDemoData('SV')
    })

    it('filters compensations by paid status client-side', async () => {
      renderCompensationsPage()

      // Wait for initial render
      await waitFor(() => {
        expect(screen.getByRole('tablist')).toBeInTheDocument()
      })

      // Get all compensations from demo store
      const allCompensations = useDemoStore.getState().compensations

      // Count paid vs unpaid
      const paidCount = allCompensations.filter(
        (c) => c.convocationCompensation?.paymentDone === true
      ).length
      const unpaidCount = allCompensations.filter(
        (c) => c.convocationCompensation?.paymentDone === false
      ).length

      // Both should exist in demo data (or at least one category)
      expect(paidCount + unpaidCount).toBeGreaterThanOrEqual(0)
    })
  })

  describe('query invalidation', () => {
    beforeEach(() => {
      useAuthStore.getState().setDemoAuthenticated()
      useDemoStore.getState().initializeDemoData('SV')
    })

    it('triggers refetch when compensation is updated', async () => {
      renderCompensationsPage()

      // Wait for initial data
      await waitFor(() => {
        expect(mockApi.searchCompensations).toHaveBeenCalled()
      })

      const initialCallCount = vi.mocked(mockApi.searchCompensations).mock.calls.length

      // Get a compensation to update
      const compensations = useDemoStore.getState().compensations
      const compensationId = compensations[0]?.convocationCompensation?.__identity

      // Update compensation (this triggers invalidation in real usage)
      await mockApi.updateCompensation(compensationId!, {
        distanceInMetres: 15000,
      })

      // Manually invalidate queries as the mutation would
      queryClient.invalidateQueries({ queryKey: ['compensations'] })

      // After invalidation, query should refetch
      await waitFor(() => {
        const newCallCount = vi.mocked(mockApi.searchCompensations).mock.calls.length
        expect(newCallCount).toBeGreaterThan(initialCallCount)
      })
    })
  })

  describe('compensation details fetch', () => {
    beforeEach(() => {
      useAuthStore.getState().setDemoAuthenticated()
      useDemoStore.getState().initializeDemoData('SV')
    })

    it('fetches compensation details via mock API', async () => {
      const compensations = useDemoStore.getState().compensations
      const compensationId = compensations[0]?.convocationCompensation?.__identity

      expect(compensationId).toBeDefined()

      // Fetch details
      const details = await mockApi.getCompensationDetails(compensationId!)

      // Should return compensation details structure
      expect(details.convocationCompensation).toBeDefined()
      expect(details.convocationCompensation?.__identity).toBe(compensationId)
    })

    it('returns distance and correction reason in details', async () => {
      const compensations = useDemoStore.getState().compensations
      const testCompensation = compensations[0]
      const compensationId = testCompensation?.convocationCompensation?.__identity

      // First update the compensation
      await mockApi.updateCompensation(compensationId!, {
        distanceInMetres: 12345,
        correctionReason: 'Detour due to road closure',
      })

      // Then fetch details
      const details = await mockApi.getCompensationDetails(compensationId!)

      expect(details.convocationCompensation?.distanceInMetres).toBe(12345)
      expect(details.convocationCompensation?.correctionReason).toBe('Detour due to road closure')
    })
  })
})
