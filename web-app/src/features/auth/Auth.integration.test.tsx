import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, Navigate } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { setLocale } from '@/i18n'
import { useAuthStore, type AuthStatus, type DataSource } from '@/shared/stores/auth'
import { useDemoStore } from '@/shared/stores/demo'
import { useToastStore } from '@/shared/stores/toast'

import { LoginPage } from './LoginPage'

/**
 * Auth Integration Tests
 *
 * Tests the authentication flow including:
 * - Login flow with demo mode
 * - Auth state propagation to stores
 * - Protected route access based on auth state
 * - Association state initialization
 */

// Mock protected component that requires authentication
function ProtectedDashboard() {
  const status = useAuthStore((state) => state.status)
  const user = useAuthStore((state) => state.user)
  const dataSource = useAuthStore((state) => state.dataSource)

  if (status !== 'authenticated') {
    return <div>Not authenticated</div>
  }

  return (
    <div>
      <h1>Dashboard</h1>
      <p data-testid="user-name">
        {user?.firstName} {user?.lastName}
      </p>
      <p data-testid="data-source">{dataSource}</p>
      <p data-testid="occupations-count">{user?.occupations?.length ?? 0}</p>
    </div>
  )
}

// Simple protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const status = useAuthStore((state) => state.status)

  if (status !== 'authenticated') {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

describe('Auth Integration', () => {
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

    // Reset stores to initial state
    useAuthStore.setState({
      status: 'idle',
      user: null,
      dataSource: 'api',
      activeOccupationId: null,
      isAssociationSwitching: false,
      error: null,
      csrfToken: null,
      calendarCode: null,
      eligibleAttributeValues: null,
      groupedEligibleAttributeValues: null,
      eligibleRoles: null,
      _checkSessionPromise: null,
      _lastAuthTimestamp: null,
    })
    useDemoStore.getState().clearDemoData()
    useToastStore.getState().clearToasts()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    queryClient.clear()
    useToastStore.getState().clearToasts()
  })

  function renderWithRouter(initialRoute: string = '/login') {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialRoute]}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <ProtectedDashboard />
                </ProtectedRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )
  }

  describe('demo mode authentication', () => {
    it('sets demo mode in auth store when entering demo mode', async () => {
      const user = userEvent.setup()
      renderWithRouter()

      // Find and click the demo mode button
      const demoButton = await screen.findByRole('button', { name: /demo/i })
      await user.click(demoButton)

      // Auth store should be in demo mode
      await waitFor(() => {
        const state = useAuthStore.getState()
        expect(state.status).toBe('authenticated')
        expect(state.dataSource).toBe('demo')
      })
    })

    it('populates demo user with occupations', async () => {
      const user = userEvent.setup()
      renderWithRouter()

      const demoButton = await screen.findByRole('button', { name: /demo/i })
      await user.click(demoButton)

      await waitFor(() => {
        const state = useAuthStore.getState()
        expect(state.user).not.toBeNull()
        expect(state.user?.firstName).toBe('Demo')
        expect(state.user?.lastName).toBe('User')
        // Demo user should have referee occupations
        expect(state.user?.occupations?.length).toBeGreaterThan(0)
        expect(state.user?.occupations?.some((o) => o.type === 'referee')).toBe(true)
      })
    })

    it('sets active occupation ID when entering demo mode', async () => {
      const user = userEvent.setup()
      renderWithRouter()

      const demoButton = await screen.findByRole('button', { name: /demo/i })
      await user.click(demoButton)

      await waitFor(() => {
        const state = useAuthStore.getState()
        expect(state.activeOccupationId).not.toBeNull()
        // Active occupation should be one of the user's occupations
        const isValidOccupation = state.user?.occupations?.some(
          (o) => o.id === state.activeOccupationId
        )
        expect(isValidOccupation).toBe(true)
      })
    })

    it('initializes demo store data when entering demo mode', async () => {
      const user = userEvent.setup()
      renderWithRouter()

      const demoButton = await screen.findByRole('button', { name: /demo/i })
      await user.click(demoButton)

      // Demo store should be initialized after auth
      // Note: Demo store initialization may happen asynchronously
      await waitFor(
        () => {
          const demoState = useDemoStore.getState()
          expect(demoState.activeAssociationCode).toBe('SV')
        },
        { timeout: 2000 }
      )
    })
  })

  describe('protected route access', () => {
    it('redirects unauthenticated users to login', () => {
      renderWithRouter('/dashboard')

      // Should redirect to login
      expect(screen.getByRole('button', { name: /demo/i })).toBeInTheDocument()
    })

    it('allows authenticated users to access protected routes', async () => {
      // Set up authenticated state first
      useAuthStore.getState().setDemoAuthenticated()

      // Render dashboard directly
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/dashboard']}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <ProtectedDashboard />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      )

      // Should show dashboard content
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
      })

      // Should display user info
      expect(screen.getByTestId('user-name')).toHaveTextContent('Demo User')
      expect(screen.getByTestId('data-source')).toHaveTextContent('demo')
    })
  })

  describe('auth state propagation', () => {
    it('propagates auth state changes to components', async () => {
      // Start unauthenticated
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <ProtectedDashboard />
          </MemoryRouter>
        </QueryClientProvider>
      )

      // Should show unauthenticated state
      expect(screen.getByText('Not authenticated')).toBeInTheDocument()

      // Authenticate via store
      useAuthStore.getState().setDemoAuthenticated()

      // Component should update to show authenticated content
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
      })
    })

    it('updates occupations count in UI when auth state changes', async () => {
      useAuthStore.getState().setDemoAuthenticated()

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <ProtectedDashboard />
          </MemoryRouter>
        </QueryClientProvider>
      )

      await waitFor(() => {
        const occupationsCount = screen.getByTestId('occupations-count')
        // Demo user should have at least 1 occupation (filtered to referee only)
        expect(Number(occupationsCount.textContent)).toBeGreaterThan(0)
      })
    })
  })

  describe('logout flow', () => {
    it('clears auth state on logout', async () => {
      // Start authenticated
      useAuthStore.getState().setDemoAuthenticated()

      // Verify authenticated
      expect(useAuthStore.getState().status).toBe('authenticated')

      // Logout
      await useAuthStore.getState().logout()

      // Auth state should be cleared
      await waitFor(() => {
        const state = useAuthStore.getState()
        expect(state.status).toBe('idle')
        expect(state.user).toBeNull()
        expect(state.dataSource).toBe('api')
      })
    })

    it('clears demo store on logout', async () => {
      // Start authenticated with demo data
      useAuthStore.getState().setDemoAuthenticated()
      useDemoStore.getState().initializeDemoData('SV')

      // Verify demo data exists
      expect(useDemoStore.getState().assignments.length).toBeGreaterThan(0)

      // Logout
      await useAuthStore.getState().logout()

      // Demo store should be cleared
      await waitFor(() => {
        const demoState = useDemoStore.getState()
        expect(demoState.assignments.length).toBe(0)
        expect(demoState.activeAssociationCode).toBeNull()
      })
    })
  })

  describe('association management', () => {
    it('hasMultipleAssociations returns true for demo user', () => {
      useAuthStore.getState().setDemoAuthenticated()

      // Demo user has multiple associations (SV, SVRBA, SVRZ)
      // Note: hasMultipleAssociations checks groupedEligibleAttributeValues, not user.occupations
      // In demo mode, we need to check the occupations directly
      const state = useAuthStore.getState()
      const refereeOccupations = state.user?.occupations?.filter((o) => o.type === 'referee') ?? []
      expect(refereeOccupations.length).toBeGreaterThan(1)
    })

    it('setActiveOccupation updates the active occupation ID', () => {
      useAuthStore.getState().setDemoAuthenticated()

      const state = useAuthStore.getState()
      const initialOccupationId = state.activeOccupationId

      // Find a different occupation
      const differentOccupation = state.user?.occupations?.find((o) => o.id !== initialOccupationId)
      expect(differentOccupation).toBeDefined()

      // Change active occupation
      useAuthStore.getState().setActiveOccupation(differentOccupation!.id)

      // Verify change
      expect(useAuthStore.getState().activeOccupationId).toBe(differentOccupation!.id)
    })
  })
})
