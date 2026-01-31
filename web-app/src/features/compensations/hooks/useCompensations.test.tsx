import type { ReactNode } from 'react'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import type { CompensationRecord, Assignment } from '@/api/client'

import {
  useCompensations,
  usePaidCompensations,
  useUnpaidCompensations,
  useUpdateCompensation,
  useUpdateAssignmentCompensation,
  COMPENSATION_ERROR_KEYS,
} from './useCompensations'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFunction = (...args: any[]) => any

// Mock dependencies
vi.mock('@/api/client', () => ({
  getApiClient: vi.fn(() => ({
    searchCompensations: vi.fn(),
    updateCompensation: vi.fn(),
  })),
  api: {
    searchCompensations: vi.fn(),
    updateCompensation: vi.fn(),
  },
}))

vi.mock('@/shared/stores/auth', () => ({
  useAuthStore: vi.fn((selector: AnyFunction) => selector({ dataSource: 'api' })),
}))

vi.mock('@/shared/stores/demo', () => ({
  useDemoStore: vi.fn((selector: AnyFunction) =>
    selector({
      activeAssociationCode: 'TEST',
      updateAssignmentCompensation: vi.fn(),
    })
  ),
}))

vi.mock('@/api/queryKeys', () => ({
  queryKeys: {
    compensations: {
      list: vi.fn((config, code) => ['compensations', 'list', config, code]),
      lists: vi.fn(() => ['compensations', 'list']),
      all: ['compensations'],
    },
    assignments: {
      detail: vi.fn((id) => ['assignments', 'detail', id]),
      lists: vi.fn(() => ['assignments', 'list']),
      all: ['assignments'],
    },
  },
}))

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
}

function createWrapper(queryClient?: QueryClient) {
  const client = queryClient ?? createQueryClient()

  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

function createMockCompensation(overrides: Partial<CompensationRecord> = {}): CompensationRecord {
  return {
    __identity: 'comp-1',
    refereeGame: {
      game: {
        number: 12345,
        startingDateTime: '2025-01-15T18:00:00Z',
        encounter: {
          teamHome: { name: 'Team A' },
          teamAway: { name: 'Team B' },
        },
      },
    },
    convocationCompensation: {
      __identity: 'convocation-comp-1',
      gameCompensation: 50,
      travelExpenses: 25,
      paymentDone: false,
    },
    ...overrides,
  } as CompensationRecord
}

describe('useCompensations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches all compensations when no filter is provided', async () => {
    const mockSearchCompensations = vi.fn().mockResolvedValue({
      items: [createMockCompensation()],
      totalItemsCount: 1,
    })

    const { getApiClient } = await import('@/api/client')
    vi.mocked(getApiClient).mockReturnValue({
      searchCompensations: mockSearchCompensations,
      updateCompensation: vi.fn(),
    } as unknown as ReturnType<typeof getApiClient>)

    const { result } = renderHook(() => useCompensations(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockSearchCompensations).toHaveBeenCalledWith(
      expect.objectContaining({
        propertyFilters: [],
      })
    )
  })

  it('applies client-side filtering for paid compensations when paidFilter is true', async () => {
    const compensations = [
      createMockCompensation({
        __identity: 'paid-1',
        convocationCompensation: {
          __identity: 'c1',
          paymentDone: true,
          gameCompensation: 50,
          travelExpenses: 20,
        },
      }),
      createMockCompensation({
        __identity: 'unpaid-1',
        convocationCompensation: {
          __identity: 'c2',
          paymentDone: false,
          gameCompensation: 50,
          travelExpenses: 20,
        },
      }),
    ]

    const mockSearchCompensations = vi.fn().mockResolvedValue({
      items: compensations,
      totalItemsCount: 2,
    })

    const { getApiClient } = await import('@/api/client')
    vi.mocked(getApiClient).mockReturnValue({
      searchCompensations: mockSearchCompensations,
      updateCompensation: vi.fn(),
    } as unknown as ReturnType<typeof getApiClient>)

    const { result } = renderHook(() => useCompensations(true), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // API should be called without paymentDone filter (client-side filtering)
    expect(mockSearchCompensations).toHaveBeenCalledWith(
      expect.objectContaining({
        propertyFilters: [],
      })
    )

    // Should only return paid compensations
    expect(result.current.data).toHaveLength(1)
    expect(result.current.data![0]!.__identity).toBe('paid-1')
  })

  it('applies client-side filtering for unpaid compensations when paidFilter is false', async () => {
    const compensations = [
      createMockCompensation({
        __identity: 'paid-1',
        convocationCompensation: {
          __identity: 'c1',
          paymentDone: true,
          gameCompensation: 50,
          travelExpenses: 20,
        },
      }),
      createMockCompensation({
        __identity: 'unpaid-1',
        convocationCompensation: {
          __identity: 'c2',
          paymentDone: false,
          gameCompensation: 50,
          travelExpenses: 20,
        },
      }),
    ]

    const mockSearchCompensations = vi.fn().mockResolvedValue({
      items: compensations,
      totalItemsCount: 2,
    })

    const { getApiClient } = await import('@/api/client')
    vi.mocked(getApiClient).mockReturnValue({
      searchCompensations: mockSearchCompensations,
      updateCompensation: vi.fn(),
    } as unknown as ReturnType<typeof getApiClient>)

    const { result } = renderHook(() => useCompensations(false), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // API should be called without paymentDone filter (client-side filtering)
    expect(mockSearchCompensations).toHaveBeenCalledWith(
      expect.objectContaining({
        propertyFilters: [],
      })
    )

    // Should only return unpaid compensations
    expect(result.current.data).toHaveLength(1)
    expect(result.current.data![0]!.__identity).toBe('unpaid-1')
  })

  it('returns empty array when items is null', async () => {
    const mockSearchCompensations = vi.fn().mockResolvedValue({
      items: null,
      totalItemsCount: 0,
    })

    const { getApiClient } = await import('@/api/client')
    vi.mocked(getApiClient).mockReturnValue({
      searchCompensations: mockSearchCompensations,
      updateCompensation: vi.fn(),
    } as unknown as ReturnType<typeof getApiClient>)

    const { result } = renderHook(() => useCompensations(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual([])
  })

  it('orders by game starting date descending', async () => {
    const mockSearchCompensations = vi.fn().mockResolvedValue({
      items: [],
      totalItemsCount: 0,
    })

    const { getApiClient } = await import('@/api/client')
    vi.mocked(getApiClient).mockReturnValue({
      searchCompensations: mockSearchCompensations,
      updateCompensation: vi.fn(),
    } as unknown as ReturnType<typeof getApiClient>)

    renderHook(() => useCompensations(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(mockSearchCompensations).toHaveBeenCalled()
    })

    expect(mockSearchCompensations).toHaveBeenCalledWith(
      expect.objectContaining({
        propertyOrderings: [
          {
            propertyName: 'refereeGame.game.startingDateTime',
            descending: true,
            isSetByUser: true,
          },
        ],
      })
    )
  })
})

describe('useCompensations cache-first strategy', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function createMockAssignment(overrides: Partial<Assignment> = {}): Assignment {
    return {
      __identity: 'assignment-1',
      refereeGame: {
        game: {
          number: 12345,
          startingDateTime: '2025-01-15T18:00:00Z',
          encounter: {
            teamHome: { name: 'Team A' },
            teamAway: { name: 'Team B' },
          },
        },
      },
      refereeConvocationStatus: 'active',
      refereePosition: 'first_head_referee',
      convocationCompensation: {
        __identity: 'comp-1',
        paymentDone: false,
        distanceInMetres: 25000,
        transportationMode: 'car',
      },
      ...overrides,
    } as Assignment
  }

  it('uses cached assignments data when cache is fresh', async () => {
    const mockSearchCompensations = vi.fn().mockResolvedValue({
      items: [],
      totalItemsCount: 0,
    })

    const { getApiClient } = await import('@/api/client')
    vi.mocked(getApiClient).mockReturnValue({
      searchCompensations: mockSearchCompensations,
      updateCompensation: vi.fn(),
    } as unknown as ReturnType<typeof getApiClient>)

    // Create a query client with fresh assignments data
    const queryClient = createQueryClient()
    const mockAssignment = createMockAssignment()

    // Seed the cache with assignments data
    queryClient.setQueryData(['assignments', 'list', { offset: 0 }, 'test-occupation'], {
      items: [mockAssignment],
      totalItemsCount: 1,
    })
    // Set the query state to be fresh (updated just now)
    const queryState = queryClient.getQueryState([
      'assignments',
      'list',
      { offset: 0 },
      'test-occupation',
    ])
    if (queryState) {
      queryState.dataUpdatedAt = Date.now()
    }

    // Mock activeOccupationId to match the cached data
    const { useAuthStore } = await import('@/shared/stores/auth')
    vi.mocked(useAuthStore).mockImplementation((selector) =>
      selector({ dataSource: 'api', activeOccupationId: 'test-occupation' })
    )

    const { result } = renderHook(() => useCompensations(), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // Should NOT call the API since we have fresh cached data
    expect(mockSearchCompensations).not.toHaveBeenCalled()

    // Should return data derived from assignments
    expect(result.current.data).toHaveLength(1)
    expect(result.current.data![0]!.__identity).toBe('assignment-1')
  })

  it('calls API when assignments cache is empty', async () => {
    const mockSearchCompensations = vi.fn().mockResolvedValue({
      items: [createMockCompensation()],
      totalItemsCount: 1,
    })

    const { getApiClient } = await import('@/api/client')
    vi.mocked(getApiClient).mockReturnValue({
      searchCompensations: mockSearchCompensations,
      updateCompensation: vi.fn(),
    } as unknown as ReturnType<typeof getApiClient>)

    // Create a query client with no cached data
    const queryClient = createQueryClient()

    const { useAuthStore } = await import('@/shared/stores/auth')
    vi.mocked(useAuthStore).mockImplementation((selector) =>
      selector({ dataSource: 'api', activeOccupationId: 'test-occupation' })
    )

    const { result } = renderHook(() => useCompensations(), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // Should call the API since cache is empty
    expect(mockSearchCompensations).toHaveBeenCalled()
  })

  it('calls API when assignments cache is stale', async () => {
    const mockSearchCompensations = vi.fn().mockResolvedValue({
      items: [createMockCompensation()],
      totalItemsCount: 1,
    })

    const { getApiClient } = await import('@/api/client')
    vi.mocked(getApiClient).mockReturnValue({
      searchCompensations: mockSearchCompensations,
      updateCompensation: vi.fn(),
    } as unknown as ReturnType<typeof getApiClient>)

    // Create a query client with stale assignments data
    const queryClient = createQueryClient()
    const mockAssignment = createMockAssignment()

    // Seed the cache with assignments data
    queryClient.setQueryData(['assignments', 'list', { offset: 0 }, 'test-occupation'], {
      items: [mockAssignment],
      totalItemsCount: 1,
    })
    // Set the query state to be stale (updated 10 minutes ago)
    const queryState = queryClient.getQueryState([
      'assignments',
      'list',
      { offset: 0 },
      'test-occupation',
    ])
    if (queryState) {
      queryState.dataUpdatedAt = Date.now() - 10 * 60 * 1000 // 10 minutes ago
    }

    const { useAuthStore } = await import('@/shared/stores/auth')
    vi.mocked(useAuthStore).mockImplementation((selector) =>
      selector({ dataSource: 'api', activeOccupationId: 'test-occupation' })
    )

    const { result } = renderHook(() => useCompensations(), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // Should call the API since cache is stale
    expect(mockSearchCompensations).toHaveBeenCalled()
  })

  it('filters cached assignments without compensation data', async () => {
    const mockSearchCompensations = vi.fn()

    const { getApiClient } = await import('@/api/client')
    vi.mocked(getApiClient).mockReturnValue({
      searchCompensations: mockSearchCompensations,
      updateCompensation: vi.fn(),
    } as unknown as ReturnType<typeof getApiClient>)

    const queryClient = createQueryClient()

    // Create assignments with and without compensation data
    const assignmentWithCompensation = createMockAssignment({ __identity: 'with-comp' })
    const assignmentWithoutCompensation = createMockAssignment({
      __identity: 'without-comp',
      convocationCompensation: undefined,
    })

    queryClient.setQueryData(['assignments', 'list', { offset: 0 }, 'test-occupation'], {
      items: [assignmentWithCompensation, assignmentWithoutCompensation],
      totalItemsCount: 2,
    })
    const queryState = queryClient.getQueryState([
      'assignments',
      'list',
      { offset: 0 },
      'test-occupation',
    ])
    if (queryState) {
      queryState.dataUpdatedAt = Date.now()
    }

    const { useAuthStore } = await import('@/shared/stores/auth')
    vi.mocked(useAuthStore).mockImplementation((selector) =>
      selector({ dataSource: 'api', activeOccupationId: 'test-occupation' })
    )

    const { result } = renderHook(() => useCompensations(), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // Should only include assignments with compensation data
    expect(result.current.data).toHaveLength(1)
    expect(result.current.data![0]!.__identity).toBe('with-comp')
  })

  it('applies paid filter to cached assignments data', async () => {
    const mockSearchCompensations = vi.fn()

    const { getApiClient } = await import('@/api/client')
    vi.mocked(getApiClient).mockReturnValue({
      searchCompensations: mockSearchCompensations,
      updateCompensation: vi.fn(),
    } as unknown as ReturnType<typeof getApiClient>)

    const queryClient = createQueryClient()

    const paidAssignment = createMockAssignment({
      __identity: 'paid',
      convocationCompensation: { __identity: 'c1', paymentDone: true },
    })
    const unpaidAssignment = createMockAssignment({
      __identity: 'unpaid',
      convocationCompensation: { __identity: 'c2', paymentDone: false },
    })

    queryClient.setQueryData(['assignments', 'list', { offset: 0 }, 'test-occupation'], {
      items: [paidAssignment, unpaidAssignment],
      totalItemsCount: 2,
    })
    const queryState = queryClient.getQueryState([
      'assignments',
      'list',
      { offset: 0 },
      'test-occupation',
    ])
    if (queryState) {
      queryState.dataUpdatedAt = Date.now()
    }

    const { useAuthStore } = await import('@/shared/stores/auth')
    vi.mocked(useAuthStore).mockImplementation((selector) =>
      selector({ dataSource: 'api', activeOccupationId: 'test-occupation' })
    )

    // Request only paid compensations
    const { result } = renderHook(() => useCompensations(true), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // Should only return paid compensations
    expect(result.current.data).toHaveLength(1)
    expect(result.current.data![0]!.__identity).toBe('paid')
  })

  it('deduplicates assignments from multiple cache entries', async () => {
    const mockSearchCompensations = vi.fn()

    const { getApiClient } = await import('@/api/client')
    vi.mocked(getApiClient).mockReturnValue({
      searchCompensations: mockSearchCompensations,
      updateCompensation: vi.fn(),
    } as unknown as ReturnType<typeof getApiClient>)

    const queryClient = createQueryClient()
    const mockAssignment = createMockAssignment({ __identity: 'same-id' })

    // Seed multiple cache entries with the same assignment
    queryClient.setQueryData(
      ['assignments', 'list', { offset: 0, period: 'upcoming' }, 'test-occupation'],
      { items: [mockAssignment], totalItemsCount: 1 }
    )
    queryClient.setQueryData(
      ['assignments', 'list', { offset: 0, period: 'past' }, 'test-occupation'],
      { items: [mockAssignment], totalItemsCount: 1 }
    )

    // Set both as fresh
    for (const key of [
      ['assignments', 'list', { offset: 0, period: 'upcoming' }, 'test-occupation'],
      ['assignments', 'list', { offset: 0, period: 'past' }, 'test-occupation'],
    ]) {
      const state = queryClient.getQueryState(key)
      if (state) {
        state.dataUpdatedAt = Date.now()
      }
    }

    const { useAuthStore } = await import('@/shared/stores/auth')
    vi.mocked(useAuthStore).mockImplementation((selector) =>
      selector({ dataSource: 'api', activeOccupationId: 'test-occupation' })
    )

    const { result } = renderHook(() => useCompensations(), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // Should deduplicate - only 1 result even though same assignment is in 2 cache entries
    expect(result.current.data).toHaveLength(1)
    expect(result.current.data![0]!.__identity).toBe('same-id')
  })
})

describe('usePaidCompensations', () => {
  it('returns only paid compensations via client-side filtering', async () => {
    const compensations = [
      createMockCompensation({
        __identity: 'paid-1',
        convocationCompensation: {
          __identity: 'c1',
          paymentDone: true,
          gameCompensation: 50,
          travelExpenses: 20,
        },
      }),
      createMockCompensation({
        __identity: 'unpaid-1',
        convocationCompensation: {
          __identity: 'c2',
          paymentDone: false,
          gameCompensation: 50,
          travelExpenses: 20,
        },
      }),
    ]

    const mockSearchCompensations = vi.fn().mockResolvedValue({
      items: compensations,
      totalItemsCount: 2,
    })

    const { getApiClient } = await import('@/api/client')
    vi.mocked(getApiClient).mockReturnValue({
      searchCompensations: mockSearchCompensations,
      updateCompensation: vi.fn(),
    } as unknown as ReturnType<typeof getApiClient>)

    const { result } = renderHook(() => usePaidCompensations(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // Should only return paid compensations
    expect(result.current.data).toHaveLength(1)
    expect(result.current.data![0]!.__identity).toBe('paid-1')
  })
})

describe('useUnpaidCompensations', () => {
  it('returns only unpaid compensations via client-side filtering', async () => {
    const compensations = [
      createMockCompensation({
        __identity: 'paid-1',
        convocationCompensation: {
          __identity: 'c1',
          paymentDone: true,
          gameCompensation: 50,
          travelExpenses: 20,
        },
      }),
      createMockCompensation({
        __identity: 'unpaid-1',
        convocationCompensation: {
          __identity: 'c2',
          paymentDone: false,
          gameCompensation: 50,
          travelExpenses: 20,
        },
      }),
    ]

    const mockSearchCompensations = vi.fn().mockResolvedValue({
      items: compensations,
      totalItemsCount: 2,
    })

    const { getApiClient } = await import('@/api/client')
    vi.mocked(getApiClient).mockReturnValue({
      searchCompensations: mockSearchCompensations,
      updateCompensation: vi.fn(),
    } as unknown as ReturnType<typeof getApiClient>)

    const { result } = renderHook(() => useUnpaidCompensations(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // Should only return unpaid compensations
    expect(result.current.data).toHaveLength(1)
    expect(result.current.data![0]!.__identity).toBe('unpaid-1')
  })
})

describe('useUpdateCompensation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls API to update compensation', async () => {
    const mockUpdateCompensation = vi.fn().mockResolvedValue(undefined)

    const { getApiClient } = await import('@/api/client')
    vi.mocked(getApiClient).mockReturnValue({
      searchCompensations: vi.fn(),
      updateCompensation: mockUpdateCompensation,
    } as unknown as ReturnType<typeof getApiClient>)

    const queryClient = createQueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useUpdateCompensation(), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      await result.current.mutateAsync({
        compensationId: 'comp-1',
        data: { distanceInMetres: 5000 },
      })
    })

    expect(mockUpdateCompensation).toHaveBeenCalledWith('comp-1', {
      distanceInMetres: 5000,
    })
    expect(invalidateSpy).toHaveBeenCalled()
  })

  it('invalidates compensation queries on success', async () => {
    const mockUpdateCompensation = vi.fn().mockResolvedValue(undefined)

    const { getApiClient } = await import('@/api/client')
    vi.mocked(getApiClient).mockReturnValue({
      searchCompensations: vi.fn(),
      updateCompensation: mockUpdateCompensation,
    } as unknown as ReturnType<typeof getApiClient>)

    const queryClient = createQueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useUpdateCompensation(), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      await result.current.mutateAsync({
        compensationId: 'comp-1',
        data: { correctionReason: 'Updated distance' },
      })
    })

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['compensations', 'list'],
    })
  })
})

describe('useUpdateAssignmentCompensation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses demo store update in demo mode', async () => {
    const mockDemoUpdate = vi.fn()
    const { useAuthStore } = await import('@/shared/stores/auth')
    const { useDemoStore } = await import('@/shared/stores/demo')

    vi.mocked(useAuthStore).mockImplementation((selector: AnyFunction) =>
      selector({ dataSource: 'demo' })
    )

    vi.mocked(useDemoStore).mockImplementation((selector: AnyFunction) =>
      selector({
        activeAssociationCode: 'DEMO',
        updateAssignmentCompensation: mockDemoUpdate,
      })
    )

    const { result } = renderHook(() => useUpdateAssignmentCompensation(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      await result.current.mutateAsync({
        assignmentId: 'assignment-1',
        data: { distanceInMetres: 10000 },
      })
    })

    expect(mockDemoUpdate).toHaveBeenCalledWith('assignment-1', {
      distanceInMetres: 10000,
    })
  })

  it('invalidates both assignment and compensation queries on success', async () => {
    const mockDemoUpdate = vi.fn()
    const { useAuthStore } = await import('@/shared/stores/auth')
    const { useDemoStore } = await import('@/shared/stores/demo')

    vi.mocked(useAuthStore).mockImplementation((selector: AnyFunction) =>
      selector({ dataSource: 'demo' })
    )

    vi.mocked(useDemoStore).mockImplementation((selector: AnyFunction) =>
      selector({
        activeAssociationCode: 'DEMO',
        updateAssignmentCompensation: mockDemoUpdate,
      })
    )

    const queryClient = createQueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useUpdateAssignmentCompensation(), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      await result.current.mutateAsync({
        assignmentId: 'assignment-1',
        data: { distanceInMetres: 5000 },
      })
    })

    // Should invalidate assignment detail, assignment lists, and compensation lists
    expect(invalidateSpy).toHaveBeenCalledTimes(3)
  })
})

describe('COMPENSATION_ERROR_KEYS', () => {
  it('has correct error key values', () => {
    expect(COMPENSATION_ERROR_KEYS.ASSIGNMENT_NOT_FOUND).toBe(
      'compensations.assignmentNotFoundInCache'
    )
    expect(COMPENSATION_ERROR_KEYS.COMPENSATION_NOT_FOUND).toBe(
      'compensations.compensationNotFound'
    )
    expect(COMPENSATION_ERROR_KEYS.COMPENSATION_MISSING_ID).toBe(
      'compensations.compensationMissingId'
    )
  })
})
