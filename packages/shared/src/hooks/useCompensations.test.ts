/**
 * Tests for useCompensations hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import {
  useCompensations,
  calculateTotalCompensation,
  COMPENSATIONS_STALE_TIME_MS,
  DEFAULT_PAGE_SIZE,
  type CompensationsApiClient,
  type CompensationStatus,
} from './useCompensations'
import type { CompensationRecord } from '../api/validation'

/** Small delay for tests that need to wait a tick without triggering queries */
const TEST_TICK_MS = 50

// Helper to create a wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  })

  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

describe('useCompensations', () => {
  const mockApiClient: CompensationsApiClient = {
    searchCompensations: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch compensations with default options', async () => {
    const mockCompensations: CompensationRecord[] = [
      {
        __identity: 'comp-1',
        convocationCompensation: {
          gameCompensation: 50,
          travelExpenses: 20,
        },
      } as CompensationRecord,
    ]

    vi.mocked(mockApiClient.searchCompensations).mockResolvedValue({
      items: mockCompensations,
      totalItemsCount: 1,
    })

    const { result } = renderHook(
      () =>
        useCompensations({
          apiClient: mockApiClient,
        }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toHaveLength(1)
    expect(mockApiClient.searchCompensations).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: DEFAULT_PAGE_SIZE,
        offset: 0,
        sortField: 'compensationDate',
        sortDirection: 'desc',
        status: undefined, // 'all' maps to undefined
      })
    )
  })

  it('should filter by pending status', async () => {
    vi.mocked(mockApiClient.searchCompensations).mockResolvedValue({
      items: [],
      totalItemsCount: 0,
    })

    const { result } = renderHook(
      () =>
        useCompensations({
          apiClient: mockApiClient,
          status: 'pending',
        }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockApiClient.searchCompensations).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'pending',
      })
    )
  })

  it('should filter by paid status', async () => {
    vi.mocked(mockApiClient.searchCompensations).mockResolvedValue({
      items: [],
      totalItemsCount: 0,
    })

    const { result } = renderHook(
      () =>
        useCompensations({
          apiClient: mockApiClient,
          status: 'paid',
        }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockApiClient.searchCompensations).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'paid',
      })
    )
  })

  it('should not fetch when disabled', async () => {
    renderHook(
      () =>
        useCompensations({
          apiClient: mockApiClient,
          enabled: false,
        }),
      { wrapper: createWrapper() }
    )

    await new Promise((r) => setTimeout(r, TEST_TICK_MS))

    expect(mockApiClient.searchCompensations).not.toHaveBeenCalled()
  })

  it('should handle API errors', async () => {
    vi.mocked(mockApiClient.searchCompensations).mockRejectedValue(new Error('API Error'))

    const { result } = renderHook(
      () =>
        useCompensations({
          apiClient: mockApiClient,
        }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error?.message).toBe('API Error')
  })

  it('should return empty array when items is undefined', async () => {
    vi.mocked(mockApiClient.searchCompensations).mockResolvedValue({
      items: undefined as any,
      totalItemsCount: 0,
    })

    const { result } = renderHook(
      () =>
        useCompensations({
          apiClient: mockApiClient,
        }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual([])
  })

  it('should include association key in request', async () => {
    vi.mocked(mockApiClient.searchCompensations).mockResolvedValue({
      items: [],
      totalItemsCount: 0,
    })

    const { result } = renderHook(
      () =>
        useCompensations({
          apiClient: mockApiClient,
          associationKey: 'RVSZ',
        }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockApiClient.searchCompensations).toHaveBeenCalled()
  })
})

describe('calculateTotalCompensation', () => {
  it('should calculate totals from compensation records', () => {
    const records: CompensationRecord[] = [
      {
        __identity: '1',
        convocationCompensation: {
          gameCompensation: 50,
          travelExpenses: 20,
        },
      } as CompensationRecord,
      {
        __identity: '2',
        convocationCompensation: {
          gameCompensation: 75,
          travelExpenses: 30,
        },
      } as CompensationRecord,
    ]

    const result = calculateTotalCompensation(records)

    expect(result.gameFees).toBe(125)
    expect(result.travelExpenses).toBe(50)
    expect(result.total).toBe(175)
  })

  it('should handle records with missing compensation data', () => {
    const records: CompensationRecord[] = [
      {
        __identity: '1',
        convocationCompensation: {
          gameCompensation: 50,
          // No travel expenses
        },
      } as CompensationRecord,
      {
        __identity: '2',
        convocationCompensation: undefined,
      } as CompensationRecord,
    ]

    const result = calculateTotalCompensation(records)

    expect(result.gameFees).toBe(50)
    expect(result.travelExpenses).toBe(0)
    expect(result.total).toBe(50)
  })

  it('should return zeros for empty array', () => {
    const result = calculateTotalCompensation([])

    expect(result.gameFees).toBe(0)
    expect(result.travelExpenses).toBe(0)
    expect(result.total).toBe(0)
  })

  it('should handle null values gracefully', () => {
    const records: CompensationRecord[] = [
      {
        __identity: '1',
        convocationCompensation: {
          gameCompensation: null as any,
          travelExpenses: 20,
        },
      } as CompensationRecord,
    ]

    const result = calculateTotalCompensation(records)

    expect(result.gameFees).toBe(0)
    expect(result.travelExpenses).toBe(20)
    expect(result.total).toBe(20)
  })
})

describe('constants', () => {
  it('should export correct constants', () => {
    expect(COMPENSATIONS_STALE_TIME_MS).toBe(5 * 60 * 1000)
    expect(DEFAULT_PAGE_SIZE).toBe(50)
  })
})
