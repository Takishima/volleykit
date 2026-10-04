import type { ReactNode } from 'react'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import type { CompensationRecord } from '@/api/client'

import {
  useCompensations,
  usePaidCompensations,
  useUnpaidCompensations,
  useUpdateCompensation,
  useUpdateAssignmentCompensation,
  useBatchUpdateCompensations,
  COMPENSATION_ERROR_KEYS,
} from './useCompensations'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFunction = (...args: any[]) => any

// Mock dependencies
vi.mock('@/api/client', () => ({
  getApiClient: vi.fn(() => ({
    searchCompensations: vi.fn(),
    updateCompensation: vi.fn(),
    switchRoleAndAttribute: vi.fn(),
  })),
  api: {
    searchCompensations: vi.fn(),
    updateCompensation: vi.fn(),
    switchRoleAndAttribute: vi.fn(),
  },
}))

const API_AUTH_STATE = { dataSource: 'api', activeOccupationId: 'occupation-1' }

vi.mock('@/common/stores/auth', () => ({
  useAuthStore: vi.fn((selector: AnyFunction) =>
    selector({ dataSource: 'api', activeOccupationId: 'occupation-1' })
  ),
}))

vi.mock('@/common/stores/demo', () => ({
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

  it('treats undefined paymentDone as unpaid when filtering for unpaid compensations', async () => {
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
        __identity: 'undefined-payment-1',
        convocationCompensation: {
          __identity: 'c2',
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

    // Should include compensations where paymentDone is undefined (not explicitly paid)
    expect(result.current.data).toHaveLength(1)
    expect(result.current.data![0]!.__identity).toBe('undefined-payment-1')
  })

  it('excludes undefined paymentDone when filtering for paid compensations', async () => {
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
        __identity: 'undefined-payment-1',
        convocationCompensation: {
          __identity: 'c2',
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

    // Should only return explicitly paid compensations, not undefined ones
    expect(result.current.data).toHaveLength(1)
    expect(result.current.data![0]!.__identity).toBe('paid-1')
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

  it('calls onSuccess callback after successful mutation', async () => {
    const mockUpdateCompensation = vi.fn().mockResolvedValue(undefined)
    const onSuccess = vi.fn()

    const { getApiClient } = await import('@/api/client')
    vi.mocked(getApiClient).mockReturnValue({
      searchCompensations: vi.fn(),
      updateCompensation: mockUpdateCompensation,
    } as unknown as ReturnType<typeof getApiClient>)

    const { result } = renderHook(() => useUpdateCompensation(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      result.current.mutate(
        { compensationId: 'comp-1', data: { distanceInMetres: 5000 } },
        { onSuccess }
      )
    })

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled()
    })
  })

  it('calls onError callback after failed mutation', async () => {
    const mockError = new Error('Update failed')
    const mockUpdateCompensation = vi.fn().mockRejectedValue(mockError)
    const onError = vi.fn()

    const { getApiClient } = await import('@/api/client')
    vi.mocked(getApiClient).mockReturnValue({
      searchCompensations: vi.fn(),
      updateCompensation: mockUpdateCompensation,
    } as unknown as ReturnType<typeof getApiClient>)

    const { result } = renderHook(() => useUpdateCompensation(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      result.current.mutate(
        { compensationId: 'comp-1', data: { distanceInMetres: 5000 } },
        { onError }
      )
    })

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(mockError)
    })
  })
})

describe('association re-assert after compensation updates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(async () => {
    const { useAuthStore } = await import('@/common/stores/auth')
    vi.mocked(useAuthStore).mockImplementation((selector: AnyFunction) => selector(API_AUTH_STATE))
  })

  async function mockApiClient() {
    const client = {
      searchCompensations: vi.fn(),
      updateCompensation: vi.fn().mockResolvedValue(undefined),
      switchRoleAndAttribute: vi.fn().mockResolvedValue(undefined),
    }
    const { getApiClient } = await import('@/api/client')
    vi.mocked(getApiClient).mockReturnValue(client as unknown as ReturnType<typeof getApiClient>)
    return client
  }

  it('re-asserts the selected association on the server before refetching lists', async () => {
    const client = await mockApiClient()
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

    expect(client.switchRoleAndAttribute).toHaveBeenCalledWith('occupation-1')
    const updateOrder = client.updateCompensation.mock.invocationCallOrder[0]!
    const switchOrder = client.switchRoleAndAttribute.mock.invocationCallOrder[0]!
    const invalidateOrder = invalidateSpy.mock.invocationCallOrder[0]!
    expect(updateOrder).toBeLessThan(switchOrder)
    expect(switchOrder).toBeLessThan(invalidateOrder)
  })

  it('re-asserts once after a batch update', async () => {
    const client = await mockApiClient()
    const queryClient = createQueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useBatchUpdateCompensations(), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      await result.current.mutateAsync({
        compensationIds: ['comp-1', 'comp-2'],
        data: { distanceInMetres: 5000 },
      })
    })

    expect(client.updateCompensation).toHaveBeenCalledTimes(2)
    expect(client.switchRoleAndAttribute).toHaveBeenCalledTimes(1)
    expect(client.switchRoleAndAttribute).toHaveBeenCalledWith('occupation-1')
    expect(client.switchRoleAndAttribute.mock.invocationCallOrder[0]!).toBeLessThan(
      invalidateSpy.mock.invocationCallOrder[0]!
    )
  })

  it('still refetches when the re-assert request fails', async () => {
    const client = await mockApiClient()
    client.switchRoleAndAttribute.mockRejectedValue(new Error('500'))
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

    expect(result.current.isSuccess).toBe(true)
    expect(invalidateSpy).toHaveBeenCalled()
  })

  it('does not touch the association in demo mode', async () => {
    const { useAuthStore } = await import('@/common/stores/auth')
    vi.mocked(useAuthStore).mockImplementation((selector: AnyFunction) =>
      selector({ dataSource: 'demo', activeOccupationId: 'demo-referee-sv' })
    )
    const client = await mockApiClient()

    const { result } = renderHook(() => useUpdateCompensation(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      await result.current.mutateAsync({
        compensationId: 'comp-1',
        data: { distanceInMetres: 5000 },
      })
    })

    expect(client.updateCompensation).toHaveBeenCalled()
    expect(client.switchRoleAndAttribute).not.toHaveBeenCalled()
  })
})

describe('useUpdateAssignmentCompensation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses demo store update in demo mode', async () => {
    const mockDemoUpdate = vi.fn()
    const { useAuthStore } = await import('@/common/stores/auth')
    const { useDemoStore } = await import('@/common/stores/demo')

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

  it('updates demo store directly in demo mode (no query invalidation)', async () => {
    const mockDemoUpdate = vi.fn()
    const { useAuthStore } = await import('@/common/stores/auth')
    const { useDemoStore } = await import('@/common/stores/demo')

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

    // Demo mode updates the demo store directly, no query invalidation
    expect(mockDemoUpdate).toHaveBeenCalledWith('assignment-1', { distanceInMetres: 5000 })
    expect(invalidateSpy).not.toHaveBeenCalled()
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
