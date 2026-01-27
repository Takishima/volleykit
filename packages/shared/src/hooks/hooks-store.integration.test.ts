/**
 * Hooks + Store Coordination Integration Tests
 *
 * Tests the integration between TanStack Query hooks and Zustand stores:
 * - Query key changes when store values change
 * - Hook behavior when auth state transitions
 * - useAuth hook correctly reflects store state
 * - Query enabling/disabling based on auth state
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'

import { useAuthStore } from '../stores/auth'
import { useAuth } from './useAuth'
import { useAssignments, type AssignmentsApiClient } from './useAssignments'
import { useCompensations, type CompensationsApiClient } from './useCompensations'

/** Small delay for tests that need to wait a tick */
const TEST_TICK_MS = 50

// Helper to create a wrapper with QueryClient
function createWrapper(queryClient?: QueryClient) {
  const client =
    queryClient ??
    new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    })

  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client }, children)
  }
}

describe('useAuth + Store Integration', () => {
  beforeEach(() => {
    useAuthStore.getState().reset()
  })

  afterEach(() => {
    useAuthStore.getState().reset()
  })

  it('should reflect store state changes', () => {
    const { result, rerender } = renderHook(() => useAuth())

    // Initial state
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.status).toBe('idle')
    expect(result.current.user).toBeNull()

    // Update store
    act(() => {
      useAuthStore.getState().setUser({
        id: 'user-1',
        firstName: 'John',
        lastName: 'Doe',
        occupations: [{ id: 'occ-1', type: 'referee' }],
      })
    })

    rerender()

    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.status).toBe('authenticated')
    expect(result.current.user?.firstName).toBe('John')
  })

  it('should handle loading state', () => {
    const { result, rerender } = renderHook(() => useAuth())

    act(() => {
      useAuthStore.getState().setStatus('loading')
    })

    rerender()

    expect(result.current.isLoading).toBe(true)
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('should handle error state', () => {
    const { result, rerender } = renderHook(() => useAuth())

    act(() => {
      useAuthStore.getState().setError({
        message: 'Invalid credentials',
        code: 'invalid_credentials',
      })
    })

    rerender()

    expect(result.current.error?.message).toBe('Invalid credentials')
    expect(result.current.status).toBe('error')
  })

  it('should logout and clear state', () => {
    const { result, rerender } = renderHook(() => useAuth())

    // First authenticate
    act(() => {
      useAuthStore.getState().setUser({
        id: 'user-1',
        firstName: 'John',
        lastName: 'Doe',
        occupations: [],
      })
    })

    rerender()
    expect(result.current.isAuthenticated).toBe(true)

    // Then logout
    act(() => {
      result.current.logout()
    })

    rerender()

    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
  })
})

describe('useAssignments + Store Integration', () => {
  const mockApiClient: AssignmentsApiClient = {
    searchAssignments: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.getState().reset()
  })

  afterEach(() => {
    useAuthStore.getState().reset()
  })

  it('should use different query keys for different associations', async () => {
    vi.mocked(mockApiClient.searchAssignments).mockResolvedValue({
      items: [],
      totalItemsCount: 0,
    })

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    })

    // Render with association key SV
    const { result: result1, unmount: unmount1 } = renderHook(
      () =>
        useAssignments({
          apiClient: mockApiClient,
          associationKey: 'SV',
        }),
      { wrapper: createWrapper(queryClient) }
    )

    await waitFor(() => {
      expect(result1.current.isSuccess).toBe(true)
    })

    const callCount1 = vi.mocked(mockApiClient.searchAssignments).mock.calls.length
    expect(callCount1).toBe(1)

    unmount1()

    // Render with different association key
    const { result: result2 } = renderHook(
      () =>
        useAssignments({
          apiClient: mockApiClient,
          associationKey: 'RVNO',
        }),
      { wrapper: createWrapper(queryClient) }
    )

    await waitFor(() => {
      expect(result2.current.isSuccess).toBe(true)
    })

    // Should have made a new API call because query key changed
    expect(vi.mocked(mockApiClient.searchAssignments).mock.calls.length).toBe(2)
  })

  it('should disable queries when not authenticated', async () => {
    const { result } = renderHook(
      () =>
        useAssignments({
          apiClient: mockApiClient,
          enabled: false, // Simulating unauthenticated state
        }),
      { wrapper: createWrapper() }
    )

    // Wait a tick to ensure no fetch
    await new Promise((r) => setTimeout(r, TEST_TICK_MS))

    expect(mockApiClient.searchAssignments).not.toHaveBeenCalled()
    expect(result.current.fetchStatus).toBe('idle')
  })

  it('should enable queries when auth state changes', async () => {
    vi.mocked(mockApiClient.searchAssignments).mockResolvedValue({
      items: [],
      totalItemsCount: 0,
    })

    // Start disabled
    const { result, rerender } = renderHook(
      ({ enabled }) =>
        useAssignments({
          apiClient: mockApiClient,
          enabled,
        }),
      {
        wrapper: createWrapper(),
        initialProps: { enabled: false },
      }
    )

    await new Promise((r) => setTimeout(r, TEST_TICK_MS))
    expect(mockApiClient.searchAssignments).not.toHaveBeenCalled()

    // Simulate auth state change - enable queries
    rerender({ enabled: true })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockApiClient.searchAssignments).toHaveBeenCalled()
  })
})

describe('useCompensations + Store Integration', () => {
  const mockApiClient: CompensationsApiClient = {
    searchCompensations: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.getState().reset()
  })

  afterEach(() => {
    useAuthStore.getState().reset()
  })

  it('should refetch with new association key', async () => {
    vi.mocked(mockApiClient.searchCompensations).mockResolvedValue({
      items: [],
      totalItemsCount: 0,
    })

    const { result, rerender } = renderHook(
      ({ associationKey }) =>
        useCompensations({
          apiClient: mockApiClient,
          associationKey,
        }),
      {
        wrapper: createWrapper(),
        initialProps: { associationKey: 'SV' },
      }
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockApiClient.searchCompensations).toHaveBeenCalledTimes(1)

    // Change association
    rerender({ associationKey: 'RVNO' })

    await waitFor(() => {
      expect(vi.mocked(mockApiClient.searchCompensations).mock.calls.length).toBe(2)
    })
  })
})

describe('Multiple hooks with shared auth state', () => {
  const mockAssignmentsApi: AssignmentsApiClient = {
    searchAssignments: vi.fn(),
  }

  const mockCompensationsApi: CompensationsApiClient = {
    searchCompensations: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.getState().reset()
  })

  afterEach(() => {
    useAuthStore.getState().reset()
  })

  it('should coordinate multiple hooks based on auth store', async () => {
    vi.mocked(mockAssignmentsApi.searchAssignments).mockResolvedValue({
      items: [],
      totalItemsCount: 0,
    })

    vi.mocked(mockCompensationsApi.searchCompensations).mockResolvedValue({
      items: [],
      totalItemsCount: 0,
    })

    // Setup auth state
    act(() => {
      useAuthStore.getState().setUser({
        id: 'user-1',
        firstName: 'John',
        lastName: 'Doe',
        occupations: [
          { id: 'occ-1', type: 'referee', associationCode: 'SV' },
          { id: 'occ-2', type: 'referee', associationCode: 'RVNO' },
        ],
      })
    })

    const activeOccupation = useAuthStore.getState().getActiveOccupation()
    expect(activeOccupation).not.toBeNull()

    // Both hooks should use the same association key
    const wrapper = createWrapper()

    const { result: assignmentsResult } = renderHook(
      () =>
        useAssignments({
          apiClient: mockAssignmentsApi,
          associationKey: activeOccupation?.associationCode,
        }),
      { wrapper }
    )

    const { result: compensationsResult } = renderHook(
      () =>
        useCompensations({
          apiClient: mockCompensationsApi,
          associationKey: activeOccupation?.associationCode,
        }),
      { wrapper }
    )

    await waitFor(() => {
      expect(assignmentsResult.current.isSuccess).toBe(true)
      expect(compensationsResult.current.isSuccess).toBe(true)
    })

    // Both should have been called
    expect(mockAssignmentsApi.searchAssignments).toHaveBeenCalled()
    expect(mockCompensationsApi.searchCompensations).toHaveBeenCalled()
  })

  it('should handle association switching across hooks', async () => {
    vi.mocked(mockAssignmentsApi.searchAssignments).mockResolvedValue({
      items: [],
      totalItemsCount: 0,
    })

    vi.mocked(mockCompensationsApi.searchCompensations).mockResolvedValue({
      items: [],
      totalItemsCount: 0,
    })

    // Setup with multiple associations
    act(() => {
      useAuthStore.getState().setUser({
        id: 'user-1',
        firstName: 'John',
        lastName: 'Doe',
        occupations: [
          { id: 'occ-sv', type: 'referee', associationCode: 'SV' },
          { id: 'occ-rvno', type: 'referee', associationCode: 'RVNO' },
        ],
      })
    })

    expect(useAuthStore.getState().hasMultipleAssociations()).toBe(true)

    const getAssociationCode = () =>
      useAuthStore.getState().getActiveOccupation()?.associationCode ?? 'SV'

    const wrapper = createWrapper()

    const { result, rerender } = renderHook(
      ({ associationKey }) => ({
        assignments: useAssignments({
          apiClient: mockAssignmentsApi,
          associationKey,
        }),
        compensations: useCompensations({
          apiClient: mockCompensationsApi,
          associationKey,
        }),
      }),
      {
        wrapper,
        initialProps: { associationKey: getAssociationCode() },
      }
    )

    await waitFor(() => {
      expect(result.current.assignments.isSuccess).toBe(true)
      expect(result.current.compensations.isSuccess).toBe(true)
    })

    const initialCallCount = {
      assignments: vi.mocked(mockAssignmentsApi.searchAssignments).mock.calls.length,
      compensations: vi.mocked(mockCompensationsApi.searchCompensations).mock.calls.length,
    }

    // Switch association
    act(() => {
      useAuthStore.getState().setActiveOccupation('occ-rvno')
    })

    rerender({ associationKey: getAssociationCode() })

    await waitFor(() => {
      // Should have refetched both
      expect(vi.mocked(mockAssignmentsApi.searchAssignments).mock.calls.length).toBeGreaterThan(
        initialCallCount.assignments
      )
      expect(vi.mocked(mockCompensationsApi.searchCompensations).mock.calls.length).toBeGreaterThan(
        initialCallCount.compensations
      )
    })
  })
})
