import type { ReactNode } from 'react'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import type { PersonSearchResponse } from '@/api/client'

import { parseSearchInput, useScorerSearch } from './useScorerSearch'

// Mock the API client
vi.mock('@/api/client', () => ({
  getApiClient: vi.fn(() => ({
    searchPersons: vi.fn(),
  })),
}))

vi.mock('@/shared/stores/auth', () => ({
  useAuthStore: vi.fn((selector) => selector({ dataSource: 'api' })),
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('parseSearchInput', () => {
  it('returns empty object for empty input', () => {
    expect(parseSearchInput('')).toEqual({})
    expect(parseSearchInput('   ')).toEqual({})
    expect(parseSearchInput('\t\n')).toEqual({})
  })

  it('parses single word as lastName', () => {
    expect(parseSearchInput('müller')).toEqual({ lastName: 'müller' })
    expect(parseSearchInput('Schmidt')).toEqual({ lastName: 'Schmidt' })
  })

  it('parses two words as firstName and lastName', () => {
    expect(parseSearchInput('hans müller')).toEqual({
      firstName: 'hans',
      lastName: 'müller',
    })
    expect(parseSearchInput('Anna Schmidt')).toEqual({
      firstName: 'Anna',
      lastName: 'Schmidt',
    })
  })

  it('handles extra whitespace correctly', () => {
    expect(parseSearchInput('  hans   müller  ')).toEqual({
      firstName: 'hans',
      lastName: 'müller',
    })
  })

  it('parses year at end correctly', () => {
    expect(parseSearchInput('müller 1985')).toEqual({
      lastName: 'müller',
      yearOfBirth: '1985',
    })
  })

  it('parses full name with year', () => {
    expect(parseSearchInput('hans müller 1985')).toEqual({
      firstName: 'hans',
      lastName: 'müller',
      yearOfBirth: '1985',
    })
  })

  it('returns only yearOfBirth when input is just a year', () => {
    expect(parseSearchInput('1985')).toEqual({
      yearOfBirth: '1985',
    })
  })

  it('does not parse non-4-digit numbers as year', () => {
    expect(parseSearchInput('müller 85')).toEqual({
      firstName: 'müller',
      lastName: '85',
    })
    expect(parseSearchInput('müller 19850')).toEqual({
      firstName: 'müller',
      lastName: '19850',
    })
    expect(parseSearchInput('müller 198')).toEqual({
      firstName: 'müller',
      lastName: '198',
    })
  })

  it('only extracts year from the end position', () => {
    expect(parseSearchInput('1985 müller')).toEqual({
      firstName: '1985',
      lastName: 'müller',
    })
  })

  it('handles three or more name parts', () => {
    expect(parseSearchInput('Hans Peter Müller')).toEqual({
      firstName: 'Hans',
      lastName: 'Peter Müller',
    })
    expect(parseSearchInput('Hans Peter Müller 1985')).toEqual({
      firstName: 'Hans',
      lastName: 'Peter Müller',
      yearOfBirth: '1985',
    })
    expect(parseSearchInput('maria de la cruz 1990')).toEqual({
      firstName: 'maria',
      lastName: 'de la cruz',
      yearOfBirth: '1990',
    })
  })

  it('preserves accented characters', () => {
    expect(parseSearchInput('josé garcía')).toEqual({
      firstName: 'josé',
      lastName: 'garcía',
    })
    expect(parseSearchInput('björn müller')).toEqual({
      firstName: 'björn',
      lastName: 'müller',
    })
  })

  it('handles hyphenated names', () => {
    expect(parseSearchInput('marie-claire')).toEqual({
      lastName: 'marie-claire',
    })
    expect(parseSearchInput('jean-pierre dupont')).toEqual({
      firstName: 'jean-pierre',
      lastName: 'dupont',
    })
  })
})

describe('useScorerSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not fetch when no filters are provided', async () => {
    const { getApiClient } = await import('@/api/client')
    const mockSearchPersons = vi.fn()
    vi.mocked(getApiClient).mockReturnValue({
      searchPersons: mockSearchPersons,
    } as unknown as ReturnType<typeof getApiClient>)

    const { result } = renderHook(() => useScorerSearch({}), {
      wrapper: createWrapper(),
    })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.data).toBeUndefined()
    expect(mockSearchPersons).not.toHaveBeenCalled()
  })

  it('fetches when lastName filter is provided', async () => {
    const { getApiClient } = await import('@/api/client')
    const mockResponse: PersonSearchResponse = {
      items: [
        {
          __identity: 'a1111111-1111-4111-a111-111111111111',
          firstName: 'Hans',
          lastName: 'Müller',
          displayName: 'Hans Müller',
          associationId: 12345,
          birthday: '1985-03-15T00:00:00+00:00',
        },
      ],
      totalItemsCount: 1,
    }
    const mockSearchPersons = vi.fn().mockResolvedValue(mockResponse)
    vi.mocked(getApiClient).mockReturnValue({
      searchPersons: mockSearchPersons,
    } as unknown as ReturnType<typeof getApiClient>)

    const { result } = renderHook(() => useScorerSearch({ lastName: 'müller' }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.data).toHaveLength(1)
    })

    expect(mockSearchPersons).toHaveBeenCalledWith({ lastName: 'müller' })
    expect(result.current.data?.[0]?.displayName).toBe('Hans Müller')
  })

  it('does not fetch when enabled is false', async () => {
    const { getApiClient } = await import('@/api/client')
    const mockSearchPersons = vi.fn()
    vi.mocked(getApiClient).mockReturnValue({
      searchPersons: mockSearchPersons,
    } as unknown as ReturnType<typeof getApiClient>)

    const { result } = renderHook(
      () => useScorerSearch({ lastName: 'müller' }, { enabled: false }),
      { wrapper: createWrapper() }
    )

    expect(result.current.isLoading).toBe(false)
    expect(mockSearchPersons).not.toHaveBeenCalled()
  })

  it('handles API errors', async () => {
    const { getApiClient } = await import('@/api/client')
    const mockSearchPersons = vi.fn().mockRejectedValue(new Error('API Error'))
    vi.mocked(getApiClient).mockReturnValue({
      searchPersons: mockSearchPersons,
    } as unknown as ReturnType<typeof getApiClient>)

    const { result } = renderHook(() => useScorerSearch({ lastName: 'müller' }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error?.message).toBe('API Error')
  })

  it('catches malformed API responses via Zod validation', async () => {
    const { getApiClient } = await import('@/api/client')
    const malformedResponse = {
      items: [
        {
          __identity: 'not-a-valid-uuid',
          firstName: 'Hans',
          lastName: 'Müller',
        },
      ],
      totalItemsCount: 1,
    }
    const mockSearchPersons = vi.fn().mockResolvedValue(malformedResponse)
    vi.mocked(getApiClient).mockReturnValue({
      searchPersons: mockSearchPersons,
    } as unknown as ReturnType<typeof getApiClient>)

    const { result } = renderHook(() => useScorerSearch({ lastName: 'müller' }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error?.message).toMatch(/Invalid API response/)
    expect(result.current.error?.message).toMatch(/scorerSearch/)
  })

  it('validates response structure when items is not an array', async () => {
    const { getApiClient } = await import('@/api/client')
    const malformedResponse = {
      items: 'not-an-array',
      totalItemsCount: 1,
    }
    const mockSearchPersons = vi.fn().mockResolvedValue(malformedResponse)
    vi.mocked(getApiClient).mockReturnValue({
      searchPersons: mockSearchPersons,
    } as unknown as ReturnType<typeof getApiClient>)

    const { result } = renderHook(() => useScorerSearch({ lastName: 'müller' }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error?.message).toMatch(/Invalid API response/)
  })
})

/**
 * Integration tests that test the full flow with the actual mock API.
 * These tests verify that:
 * 1. Demo data has valid UUIDs that pass Zod validation
 * 2. The mock API returns properly structured data
 * 3. The hook correctly processes the response
 *
 * These tests DO NOT mock getApiClient - they use the real implementation
 * in demo mode to test the full integration.
 */
describe('useScorerSearch - integration with mock API', () => {
  // Import the real modules for integration testing
  let realGetApiClient: typeof import('@/api/client').getApiClient
  let realUseAuthStore: typeof import('@/shared/stores/auth').useAuthStore
  let useDemoStore: typeof import('@/shared/stores/demo').useDemoStore

  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()

    // Import real modules
    const clientModule = await vi.importActual<typeof import('@/api/client')>('@/api/client')
    realGetApiClient = clientModule.getApiClient

    const authModule =
      await vi.importActual<typeof import('@/shared/stores/auth')>('@/shared/stores/auth')
    realUseAuthStore = authModule.useAuthStore

    const demoModule =
      await vi.importActual<typeof import('@/shared/stores/demo')>('@/shared/stores/demo')
    useDemoStore = demoModule.useDemoStore

    // Initialize demo data
    useDemoStore.getState().initializeDemoData()

    // Mock to use real implementations with demo mode enabled
    const { getApiClient } = await import('@/api/client')
    vi.mocked(getApiClient).mockImplementation((dataSource) => realGetApiClient(dataSource))

    const { useAuthStore } = await import('@/shared/stores/auth')
    vi.mocked(useAuthStore).mockImplementation((selector: unknown) => {
      if (typeof selector === 'function') {
        return (selector as (state: { dataSource: string }) => string)({
          dataSource: 'demo',
        })
      }
      return realUseAuthStore(selector as never)
    })
  })

  afterEach(() => {
    vi.resetModules()
  })

  it('returns results from mock API with valid UUIDs that pass Zod validation', async () => {
    const { result } = renderHook(() => useScorerSearch({ lastName: 'Müller' }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
      expect(result.current.data).toBeDefined()
    })

    expect(result.current.isError).toBe(false)
    expect(result.current.data!.length).toBeGreaterThan(0)
    expect(result.current.data!.some((s) => s.lastName === 'Müller')).toBe(true)
  })

  it('handles single-term search correctly (searches firstName and lastName)', async () => {
    const { result } = renderHook(() => useScorerSearch({ lastName: 'Hans' }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.data).toBeDefined()
    })

    expect(result.current.isError).toBe(false)
    // "Hans" is a firstName, should be found via single-term search
    expect(result.current.data!.some((s) => s.firstName === 'Hans')).toBe(true)
  })

  it('handles two-term search correctly', async () => {
    const { result } = renderHook(
      () => useScorerSearch({ firstName: 'Hans', lastName: 'Müller' }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.data).toBeDefined()
    })

    expect(result.current.isError).toBe(false)
    expect(result.current.data!.length).toBe(1)
    expect(result.current.data![0]!.displayName).toBe('Hans Müller')
  })

  it('handles swapped name order (last name first)', async () => {
    // User types "Müller Hans" → firstName=Müller, lastName=Hans
    const { result } = renderHook(
      () => useScorerSearch({ firstName: 'Müller', lastName: 'Hans' }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.data).toBeDefined()
    })

    expect(result.current.isError).toBe(false)
    expect(result.current.data!.length).toBe(1)
    expect(result.current.data![0]!.displayName).toBe('Hans Müller')
  })

  it('handles accent-insensitive search', async () => {
    const { result } = renderHook(() => useScorerSearch({ lastName: 'muller' }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.data).toBeDefined()
    })

    expect(result.current.isError).toBe(false)
    expect(result.current.data!.some((s) => s.lastName === 'Müller')).toBe(true)
  })

  it('returns empty array for non-matching search', async () => {
    const { result } = renderHook(() => useScorerSearch({ lastName: 'XYZNonexistent' }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.isError).toBe(false)
    expect(result.current.data).toEqual([])
  })
})
