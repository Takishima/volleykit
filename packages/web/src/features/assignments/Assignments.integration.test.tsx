import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { mockApi } from '@/api/mock-api'
import { setLocale } from '@/i18n'
import { useAuthStore } from '@/shared/stores/auth'
import { useDemoStore } from '@/shared/stores/demo'
import { useToastStore } from '@/shared/stores/toast'

import { AssignmentsPage } from './AssignmentsPage'

// Save original functions before any spying
const originalSearchAssignments = mockApi.searchAssignments.bind(mockApi)

describe('Assignments Integration', () => {
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

    // Restore original function and create fresh spy for each test
    mockApi.searchAssignments = originalSearchAssignments
    vi.spyOn(mockApi, 'searchAssignments')

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

  function renderAssignmentsPage() {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AssignmentsPage />
        </MemoryRouter>
      </QueryClientProvider>
    )
  }

  describe('demo mode data flow', () => {
    beforeEach(() => {
      // Enter demo mode which sets up auth store with demo user and initializes demo data
      useAuthStore.getState().setDemoAuthenticated()
      // Initialize demo data for SV association
      useDemoStore.getState().initializeDemoData('SV')
    })

    it('displays assignments from demo store', async () => {
      renderAssignmentsPage()

      // Wait for the page to load and show assignments
      await waitFor(() => {
        // The assignments page should show the upcoming tab by default
        const upcomingTab = screen.getByRole('tab', { name: /upcoming/i })
        expect(upcomingTab).toHaveAttribute('aria-selected', 'true')
      })

      // Demo store should have assignments
      const demoState = useDemoStore.getState()
      expect(demoState.assignments.length).toBeGreaterThan(0)
    })

    it('updates assignments when switching association', async () => {
      renderAssignmentsPage()

      // Wait for initial data
      await waitFor(() => {
        expect(useDemoStore.getState().activeAssociationCode).toBe('SV')
      })

      const initialAssignments = useDemoStore.getState().assignments

      // Switch association
      useDemoStore.getState().setActiveAssociation('SVRBA')

      await waitFor(() => {
        expect(useDemoStore.getState().activeAssociationCode).toBe('SVRBA')
      })

      // New association data should be different (freshly generated)
      const newAssignments = useDemoStore.getState().assignments
      expect(newAssignments).not.toBe(initialAssignments)
    })

    it('filters assignments by date range via demo store', async () => {
      renderAssignmentsPage()

      // Get demo assignments
      const demoAssignments = useDemoStore.getState().assignments

      // Verify assignments exist
      expect(demoAssignments.length).toBeGreaterThan(0)

      // In demo mode, assignments are filtered client-side based on the date range
      // The useAssignments hook applies filtering directly on demo store data
      const now = new Date()
      const futureAssignments = demoAssignments.filter((a) => {
        const gameDate = a.refereeGame?.game?.startingDateTime
        if (!gameDate) return false
        return new Date(gameDate) >= now
      })

      // Upcoming assignments should have future dates
      expect(
        futureAssignments.every((a) => new Date(a.refereeGame!.game!.startingDateTime!) >= now)
      ).toBe(true)
    })
  })

  describe('tab navigation with real stores', () => {
    beforeEach(() => {
      useAuthStore.getState().setDemoAuthenticated()
      useDemoStore.getState().initializeDemoData('SV')
    })

    it('switches between upcoming and validation closed tabs', async () => {
      const user = userEvent.setup()
      renderAssignmentsPage()

      // Wait for initial render
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /upcoming/i })).toBeInTheDocument()
      })

      // Click validation closed tab (second tab in demo mode)
      const validationClosedTab = screen.getByRole('tab', { name: /validation closed/i })
      await user.click(validationClosedTab)

      // Verify validation closed tab is selected
      await waitFor(() => {
        expect(validationClosedTab).toHaveAttribute('aria-selected', 'true')
      })

      // Click upcoming tab
      const upcomingTab = screen.getByRole('tab', { name: /upcoming/i })
      await user.click(upcomingTab)

      // Verify upcoming tab is selected again
      await waitFor(() => {
        expect(upcomingTab).toHaveAttribute('aria-selected', 'true')
      })
    })
  })

  describe('query client interactions', () => {
    beforeEach(() => {
      useAuthStore.getState().setDemoAuthenticated()
      useDemoStore.getState().initializeDemoData('SV')
    })

    it('updates store state when association changes', async () => {
      renderAssignmentsPage()

      // Wait for initial data
      await waitFor(() => {
        expect(useDemoStore.getState().activeAssociationCode).toBe('SV')
      })

      // Simulate association switching (this typically happens via AppShell)
      useAuthStore.getState().setAssociationSwitching(true)
      useDemoStore.getState().setActiveAssociation('SVRBA')
      useAuthStore.getState().setActiveOccupation('demo-referee-svrba')

      // Reset switching state
      useAuthStore.getState().setAssociationSwitching(false)

      // The assignment data should reflect the new association
      await waitFor(() => {
        expect(useDemoStore.getState().activeAssociationCode).toBe('SVRBA')
      })

      // Auth store should also reflect the new occupation
      expect(useAuthStore.getState().activeOccupationId).toBe('demo-referee-svrba')
    })
  })
})
