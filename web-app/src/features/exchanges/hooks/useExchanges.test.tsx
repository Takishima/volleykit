import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ReactNode } from 'react'

import type { GameExchange } from '@/api/client'
import { DEMO_USER_PERSON_IDENTITY } from '@/shared/stores/demo'

import { useGameExchanges } from './useExchanges'

// Mock API client
const mockSearchExchanges = vi.fn()
vi.mock('@/api/client', () => ({
  getApiClient: () => ({
    searchExchanges: mockSearchExchanges,
  }),
}))

// Mock auth store
const mockAuthStore: {
  dataSource: 'api' | 'demo' | 'calendar'
  activeOccupationId: string
  user: { id: string } | null
} = {
  dataSource: 'api',
  activeOccupationId: 'occupation-1',
  user: { id: 'user-123' },
}
vi.mock('@/shared/stores/auth', () => ({
  useAuthStore: vi.fn((selector) => selector(mockAuthStore)),
}))

// Mock demo store
const mockDemoStore = {
  activeAssociationCode: 'SV',
}
vi.mock('@/shared/stores/demo', () => ({
  useDemoStore: vi.fn((selector) => selector(mockDemoStore)),
  DEMO_USER_PERSON_IDENTITY: 'demo-user-person',
}))

// Mock query keys
vi.mock('@/api/queryKeys', () => ({
  queryKeys: {
    exchanges: {
      list: (config: unknown, key: unknown) => ['exchanges', 'list', config, key],
      lists: () => ['exchanges', 'list'],
    },
  },
}))

const createMockExchange = (id: string, submittedByIdentity?: string): GameExchange =>
  ({
    __identity: id,
    status: 'open',
    submittedByPerson: submittedByIdentity
      ? { __identity: submittedByIdentity, firstName: 'Test', lastName: 'User' }
      : undefined,
    refereeGame: {
      game: {
        startingDateTime: '2024-06-15T14:00:00Z',
      },
    },
  }) as GameExchange

describe('useGameExchanges', () => {
  let queryClient: QueryClient

  function createWrapper() {
    return function Wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    })

    // Reset mock store to API mode
    mockAuthStore.dataSource = 'api'
    mockAuthStore.user = { id: 'user-123' }
    mockAuthStore.activeOccupationId = 'occupation-1'
  })

  describe('status filtering', () => {
    it('returns all exchanges when status is "all"', async () => {
      const exchanges = [
        createMockExchange('ex-1', 'person-1'),
        createMockExchange('ex-2', 'person-2'),
        createMockExchange('ex-3', 'user-123'),
      ]
      mockSearchExchanges.mockResolvedValue({ items: exchanges })

      const { result } = renderHook(() => useGameExchanges('all'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toHaveLength(3)
    })

    it('returns all exchanges when status is "open"', async () => {
      const exchanges = [
        createMockExchange('ex-1', 'person-1'),
        createMockExchange('ex-2', 'person-2'),
      ]
      mockSearchExchanges.mockResolvedValue({ items: exchanges })

      const { result } = renderHook(() => useGameExchanges('open'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toHaveLength(2)
    })

    it('filters to only user exchanges when status is "mine" in API mode', async () => {
      const exchanges = [
        createMockExchange('ex-1', 'other-person'),
        createMockExchange('ex-2', 'user-123'), // This is the user's
        createMockExchange('ex-3', 'another-person'),
      ]
      mockSearchExchanges.mockResolvedValue({ items: exchanges })

      const { result } = renderHook(() => useGameExchanges('mine'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toHaveLength(1)
      expect(result.current.data![0]!.__identity).toBe('ex-2')
    })

    it('filters to demo user exchanges when status is "mine" in demo mode', async () => {
      mockAuthStore.dataSource = 'demo'

      const exchanges = [
        createMockExchange('ex-1', 'other-person'),
        createMockExchange('ex-2', DEMO_USER_PERSON_IDENTITY), // Demo user's
        createMockExchange('ex-3', 'another-person'),
      ]
      mockSearchExchanges.mockResolvedValue({ items: exchanges })

      const { result } = renderHook(() => useGameExchanges('mine'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toHaveLength(1)
      expect(result.current.data![0]!.__identity).toBe('ex-2')
    })

    it('returns empty array when status is "mine" but no user identity', async () => {
      mockAuthStore.user = null as unknown as { id: string }

      const exchanges = [
        createMockExchange('ex-1', 'person-1'),
        createMockExchange('ex-2', 'person-2'),
      ]
      mockSearchExchanges.mockResolvedValue({ items: exchanges })

      const { result } = renderHook(() => useGameExchanges('mine'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toHaveLength(0)
    })

    it('returns empty array when API returns no items', async () => {
      mockSearchExchanges.mockResolvedValue({ items: undefined })

      const { result } = renderHook(() => useGameExchanges('all'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toHaveLength(0)
    })

    it('handles exchanges with no submittedByPerson', async () => {
      const exchanges = [
        createMockExchange('ex-1', undefined), // No submitter
        createMockExchange('ex-2', 'user-123'),
      ]
      mockSearchExchanges.mockResolvedValue({ items: exchanges })

      const { result } = renderHook(() => useGameExchanges('mine'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      // Only the one with matching user identity
      expect(result.current.data).toHaveLength(1)
      expect(result.current.data![0]!.__identity).toBe('ex-2')
    })
  })

  describe('query configuration', () => {
    it('calls searchExchanges with correct config', async () => {
      mockSearchExchanges.mockResolvedValue({ items: [] })

      renderHook(() => useGameExchanges('all'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(mockSearchExchanges).toHaveBeenCalled()
      })

      const config = mockSearchExchanges.mock.calls[0]![0]
      expect(config.offset).toBe(0)
      expect(config.limit).toBeDefined()
      expect(config.propertyFilters).toBeDefined()
      expect(config.propertyOrderings).toBeDefined()
    })
  })
})
