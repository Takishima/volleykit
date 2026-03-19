import { createElement, type ReactNode } from 'react'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import * as apiClient from '@/api/client'
import type { PossibleNominationsResponse } from '@/api/client'
import * as authStore from '@/shared/stores/auth'

import { usePossiblePlayerNominations } from './usePlayerNominations'

vi.mock('@/shared/stores/auth')
vi.mock('@/api/client', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/client')>()
  return {
    ...original,
    getApiClient: vi.fn(),
  }
})

const mockPossibleNominationsResponse: PossibleNominationsResponse = {
  items: [
    {
      __identity: 'nom-1',
      indoorPlayer: {
        __identity: 'player-1',
        person: {
          __identity: 'person-1',
          firstName: 'John',
          lastName: 'Doe',
          displayName: 'John Doe',
          birthday: '1995-03-15',
        },
      },
      licenseCategory: 'SEN',
      isAlreadyNominated: false,
    },
    {
      __identity: 'nom-2',
      indoorPlayer: {
        __identity: 'player-2',
        person: {
          __identity: 'person-2',
          firstName: 'Jane',
          lastName: 'Smith',
          displayName: 'Jane Smith',
          birthday: '2002-07-22',
        },
      },
      licenseCategory: 'JUN',
      isAlreadyNominated: true,
    },
  ],
  totalItemsCount: 2,
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

describe('usePossiblePlayerNominations', () => {
  const mockGetPossiblePlayerNominations = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
      selector({ dataSource: 'api' } as ReturnType<typeof authStore.useAuthStore.getState>)
    )

    vi.mocked(apiClient.getApiClient).mockReturnValue({
      getPossiblePlayerNominations: mockGetPossiblePlayerNominations,
    } as unknown as ReturnType<typeof apiClient.getApiClient>)
  })

  it('fetches possible nominations from API', async () => {
    mockGetPossiblePlayerNominations.mockResolvedValue(mockPossibleNominationsResponse)

    const { result } = renderHook(
      () =>
        usePossiblePlayerNominations({
          nominationListId: 'test-nomlist-1',
        }),
      { wrapper: createWrapper() }
    )

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(mockGetPossiblePlayerNominations).toHaveBeenCalledWith('test-nomlist-1')
    expect(result.current.data).toEqual(mockPossibleNominationsResponse.items)
  })

  it('returns empty array when API returns null items', async () => {
    mockGetPossiblePlayerNominations.mockResolvedValue({
      items: null,
      totalItemsCount: 0,
    })

    const { result } = renderHook(
      () =>
        usePossiblePlayerNominations({
          nominationListId: 'test-nomlist-1',
        }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).toEqual([])
  })

  it('returns empty array when API returns undefined items', async () => {
    mockGetPossiblePlayerNominations.mockResolvedValue({
      totalItemsCount: 0,
    })

    const { result } = renderHook(
      () =>
        usePossiblePlayerNominations({
          nominationListId: 'test-nomlist-1',
        }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).toEqual([])
  })

  it('handles API errors', async () => {
    mockGetPossiblePlayerNominations.mockRejectedValue(new Error('API Error'))

    const { result } = renderHook(
      () =>
        usePossiblePlayerNominations({
          nominationListId: 'test-nomlist-1',
        }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error?.message).toBe('API Error')
  })

  it('respects enabled option when false', () => {
    const { result } = renderHook(
      () =>
        usePossiblePlayerNominations({
          nominationListId: 'test-nomlist-1',
          enabled: false,
        }),
      { wrapper: createWrapper() }
    )

    expect(result.current.isLoading).toBe(false)
    expect(result.current.isFetching).toBe(false)
    expect(mockGetPossiblePlayerNominations).not.toHaveBeenCalled()
  })

  it('enables query by default when enabled option is not provided', async () => {
    mockGetPossiblePlayerNominations.mockResolvedValue(mockPossibleNominationsResponse)

    const { result } = renderHook(
      () =>
        usePossiblePlayerNominations({
          nominationListId: 'test-nomlist-1',
        }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(mockGetPossiblePlayerNominations).toHaveBeenCalled()
  })

  it('does not fetch when nominationListId is empty', () => {
    const { result } = renderHook(
      () =>
        usePossiblePlayerNominations({
          nominationListId: '',
        }),
      { wrapper: createWrapper() }
    )

    expect(result.current.isLoading).toBe(false)
    expect(result.current.isFetching).toBe(false)
    expect(mockGetPossiblePlayerNominations).not.toHaveBeenCalled()
  })

  it('uses demo API client when in demo mode', async () => {
    vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
      selector({ dataSource: 'demo' } as ReturnType<typeof authStore.useAuthStore.getState>)
    )

    mockGetPossiblePlayerNominations.mockResolvedValue(mockPossibleNominationsResponse)

    const { result } = renderHook(
      () =>
        usePossiblePlayerNominations({
          nominationListId: 'test-nomlist-1',
        }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(apiClient.getApiClient).toHaveBeenCalledWith('demo')
  })

  it('uses production API client when not in demo mode', async () => {
    vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
      selector({ dataSource: 'api' } as ReturnType<typeof authStore.useAuthStore.getState>)
    )

    mockGetPossiblePlayerNominations.mockResolvedValue(mockPossibleNominationsResponse)

    const { result } = renderHook(
      () =>
        usePossiblePlayerNominations({
          nominationListId: 'test-nomlist-1',
        }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(apiClient.getApiClient).toHaveBeenCalledWith('api')
  })
})
