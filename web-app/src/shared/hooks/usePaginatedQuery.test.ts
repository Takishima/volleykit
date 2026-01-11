import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import type { Assignment } from '@/api/client'

import {
  DEFAULT_PAGE_SIZE,
  MAX_FETCH_ALL_PAGES,
  DEFAULT_DATE_RANGE_DAYS,
  COMPENSATION_LOOKUP_LIMIT,
  VALIDATION_CLOSED_STALE_TIME_MS,
  MISSING_DATE_FALLBACK_TIMESTAMP,
  getGameTimestamp,
  sortByGameDate,
  parseDateOrFallback,
  fetchAllAssignmentPages,
  createDemoQueryResult,
} from './usePaginatedQuery'

import type { UseQueryResult } from '@tanstack/react-query'

// Mock dependencies
vi.mock('@/api/client', () => ({
  api: {
    searchAssignments: vi.fn(),
  },
}))

vi.mock('@/shared/utils/logger', () => ({
  createLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}))

function createMockAssignment(startingDateTime?: string, identity?: string): Assignment {
  return {
    __identity: identity ?? 'assignment-1',
    refereeGame: startingDateTime
      ? {
          game: {
            startingDateTime,
            number: 12345,
            encounter: {
              teamHome: { name: 'Team A' },
              teamAway: { name: 'Team B' },
            },
          },
        }
      : undefined,
  } as Assignment
}

describe('constants', () => {
  it('has correct default values', () => {
    expect(DEFAULT_PAGE_SIZE).toBe(100)
    expect(MAX_FETCH_ALL_PAGES).toBe(10)
    expect(DEFAULT_DATE_RANGE_DAYS).toBe(365)
    expect(COMPENSATION_LOOKUP_LIMIT).toBe(200)
    expect(VALIDATION_CLOSED_STALE_TIME_MS).toBe(15 * 60 * 1000)
    expect(MISSING_DATE_FALLBACK_TIMESTAMP).toBe(0)
  })
})

describe('getGameTimestamp', () => {
  it('returns timestamp from valid date', () => {
    const item = createMockAssignment('2025-01-15T18:00:00Z')
    const timestamp = getGameTimestamp(item)

    expect(timestamp).toBe(new Date('2025-01-15T18:00:00Z').getTime())
  })

  it('returns fallback timestamp for missing date', () => {
    const item = createMockAssignment()
    const timestamp = getGameTimestamp(item)

    expect(timestamp).toBe(MISSING_DATE_FALLBACK_TIMESTAMP)
  })

  it('returns fallback timestamp for undefined refereeGame', () => {
    const item = { __identity: 'test' } as Assignment
    const timestamp = getGameTimestamp(item)

    expect(timestamp).toBe(MISSING_DATE_FALLBACK_TIMESTAMP)
  })

  it('returns fallback timestamp for undefined game', () => {
    const item = {
      __identity: 'test',
      refereeGame: {},
    } as Assignment
    const timestamp = getGameTimestamp(item)

    expect(timestamp).toBe(MISSING_DATE_FALLBACK_TIMESTAMP)
  })
})

describe('sortByGameDate', () => {
  const items = [
    createMockAssignment('2025-01-15T18:00:00Z', 'middle'),
    createMockAssignment('2025-01-10T18:00:00Z', 'earliest'),
    createMockAssignment('2025-01-20T18:00:00Z', 'latest'),
  ]

  it('sorts ascending by default (oldest first)', () => {
    const sorted = sortByGameDate(items, false)

    expect(sorted[0]!.__identity).toBe('earliest')
    expect(sorted[1]!.__identity).toBe('middle')
    expect(sorted[2]!.__identity).toBe('latest')
  })

  it('sorts descending when specified (newest first)', () => {
    const sorted = sortByGameDate(items, true)

    expect(sorted[0]!.__identity).toBe('latest')
    expect(sorted[1]!.__identity).toBe('middle')
    expect(sorted[2]!.__identity).toBe('earliest')
  })

  it('does not mutate original array', () => {
    const original = [...items]
    sortByGameDate(items, true)

    expect(items).toEqual(original)
  })

  it('handles items with missing dates', () => {
    const mixedItems = [
      createMockAssignment('2025-01-15T18:00:00Z', 'with-date'),
      createMockAssignment(undefined, 'without-date'),
    ]

    const sortedAsc = sortByGameDate(mixedItems, false)
    // Item without date should sort first (timestamp 0)
    expect(sortedAsc[0]!.__identity).toBe('without-date')
    expect(sortedAsc[1]!.__identity).toBe('with-date')

    const sortedDesc = sortByGameDate(mixedItems, true)
    // Item with date should sort first when descending
    expect(sortedDesc[0]!.__identity).toBe('with-date')
    expect(sortedDesc[1]!.__identity).toBe('without-date')
  })

  it('handles empty array', () => {
    const sorted = sortByGameDate([], false)
    expect(sorted).toEqual([])
  })

  it('handles single item', () => {
    const single = [createMockAssignment('2025-01-15T18:00:00Z', 'only')]
    const sorted = sortByGameDate(single, false)

    expect(sorted.length).toBe(1)
    expect(sorted[0]!.__identity).toBe('only')
  })
})

describe('parseDateOrFallback', () => {
  const fallback = new Date('2020-01-01')

  it('parses valid date string', () => {
    const result = parseDateOrFallback('2025-01-15T18:00:00Z', fallback)

    expect(result.getTime()).toBe(new Date('2025-01-15T18:00:00Z').getTime())
  })

  it('returns fallback for null', () => {
    const result = parseDateOrFallback(null, fallback)

    expect(result).toBe(fallback)
  })

  it('returns fallback for undefined', () => {
    const result = parseDateOrFallback(undefined, fallback)

    expect(result).toBe(fallback)
  })

  it('returns fallback for empty string', () => {
    const result = parseDateOrFallback('', fallback)

    expect(result).toBe(fallback)
  })

  it('returns fallback for invalid date string', () => {
    const result = parseDateOrFallback('not-a-date', fallback)

    expect(result).toBe(fallback)
  })

  it('returns fallback for malformed date', () => {
    const result = parseDateOrFallback('2025-13-45', fallback)

    expect(result).toBe(fallback)
  })

  it('handles ISO date formats', () => {
    const result = parseDateOrFallback('2025-01-15', fallback)

    expect(result.getFullYear()).toBe(2025)
    expect(result.getMonth()).toBe(0) // January
    expect(result.getDate()).toBe(15)
  })
})

describe('fetchAllAssignmentPages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('fetches single page when all items fit', async () => {
    const { api } = await import('@/api/client')

    vi.mocked(api.searchAssignments).mockResolvedValue({
      items: [createMockAssignment('2025-01-15T18:00:00Z')],
      totalItemsCount: 1,
    })

    const result = await fetchAllAssignmentPages({})

    expect(result.length).toBe(1)
    expect(api.searchAssignments).toHaveBeenCalledTimes(1)
  })

  it('fetches multiple pages when needed', async () => {
    const { api } = await import('@/api/client')

    // First page returns items with more available
    vi.mocked(api.searchAssignments)
      .mockResolvedValueOnce({
        items: Array(100)
          .fill(null)
          .map((_, i) => createMockAssignment('2025-01-15T18:00:00Z', `a-${i}`)),
        totalItemsCount: 150,
      })
      .mockResolvedValueOnce({
        items: Array(50)
          .fill(null)
          .map((_, i) => createMockAssignment('2025-01-15T18:00:00Z', `b-${i}`)),
        totalItemsCount: 150,
      })

    const result = await fetchAllAssignmentPages({})

    expect(result.length).toBe(150)
    expect(api.searchAssignments).toHaveBeenCalledTimes(2)
  })

  it('stops at MAX_FETCH_ALL_PAGES limit', async () => {
    const { api } = await import('@/api/client')

    let callCount = 0
    // Return full pages with increasing totalItemsCount to avoid stall detection
    // The stall detection breaks if totalCount doesn't change between pages
    vi.mocked(api.searchAssignments).mockImplementation(async () => {
      const currentCall = callCount++
      return {
        items: Array(100)
          .fill(null)
          .map((_, i) => createMockAssignment('2025-01-15T18:00:00Z', `item-${currentCall}-${i}`)),
        // Simulate growing dataset to avoid stall detection
        // Each call reports more total items available
        totalItemsCount: 2000 + currentCall * 100,
      }
    })

    const result = await fetchAllAssignmentPages({})

    expect(result.length).toBe(MAX_FETCH_ALL_PAGES * DEFAULT_PAGE_SIZE)
    expect(api.searchAssignments).toHaveBeenCalledTimes(MAX_FETCH_ALL_PAGES)
  })

  it('stops when empty page is returned', async () => {
    const { api } = await import('@/api/client')

    vi.mocked(api.searchAssignments)
      .mockResolvedValueOnce({
        items: [createMockAssignment('2025-01-15T18:00:00Z')],
        totalItemsCount: 100,
      })
      .mockResolvedValueOnce({
        items: [], // Empty page
        totalItemsCount: 100,
      })

    const result = await fetchAllAssignmentPages({})

    expect(result.length).toBe(1)
    expect(api.searchAssignments).toHaveBeenCalledTimes(2)
  })

  it('handles abort signal before first request', async () => {
    const controller = new AbortController()
    controller.abort()

    await expect(fetchAllAssignmentPages({}, controller.signal)).rejects.toThrow('Aborted')
  })

  it('handles abort signal between requests', async () => {
    const { api } = await import('@/api/client')
    const controller = new AbortController()

    vi.mocked(api.searchAssignments).mockImplementation(async () => {
      // Abort after first request
      controller.abort()
      return {
        items: Array(100)
          .fill(null)
          .map((_, i) => createMockAssignment('2025-01-15T18:00:00Z', `a-${i}`)),
        totalItemsCount: 200,
      }
    })

    await expect(fetchAllAssignmentPages({}, controller.signal)).rejects.toThrow('Aborted')
  })

  it('detects stalled responses and breaks', async () => {
    const { api } = await import('@/api/client')

    // Return same totalCount repeatedly (stalled)
    vi.mocked(api.searchAssignments)
      .mockResolvedValueOnce({
        items: Array(100)
          .fill(null)
          .map((_, i) => createMockAssignment('2025-01-15T18:00:00Z', `a-${i}`)),
        totalItemsCount: 200,
      })
      .mockResolvedValueOnce({
        items: Array(100)
          .fill(null)
          .map((_, i) => createMockAssignment('2025-01-15T18:00:00Z', `b-${i}`)),
        totalItemsCount: 200, // Same as before - stalled
      })

    const result = await fetchAllAssignmentPages({})

    // Should break after detecting stall (not fetch third page)
    expect(result.length).toBe(200)
    expect(api.searchAssignments).toHaveBeenCalledTimes(2)
  })

  it('uses correct offset for each page', async () => {
    const { api } = await import('@/api/client')

    vi.mocked(api.searchAssignments)
      .mockResolvedValueOnce({
        items: Array(100)
          .fill(null)
          .map(() => createMockAssignment('2025-01-15T18:00:00Z')),
        totalItemsCount: 200,
      })
      .mockResolvedValueOnce({
        items: Array(100)
          .fill(null)
          .map(() => createMockAssignment('2025-01-15T18:00:00Z')),
        totalItemsCount: 200,
      })

    await fetchAllAssignmentPages({ propertyFilters: [] })

    expect(api.searchAssignments).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ offset: 0, limit: 100 })
    )
    expect(api.searchAssignments).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ offset: 100, limit: 100 })
    )
  })

  it('handles null items in response', async () => {
    const { api } = await import('@/api/client')

    vi.mocked(api.searchAssignments).mockResolvedValue({
      items: null,
      totalItemsCount: 0,
    } as unknown as Awaited<ReturnType<typeof api.searchAssignments>>)

    const result = await fetchAllAssignmentPages({})

    // Empty array from null items should trigger break
    expect(result.length).toBe(0)
  })
})

describe('createDemoQueryResult', () => {
  const mockBaseQuery = {
    data: undefined,
    isLoading: true,
    isFetching: true,
    isSuccess: false,
    isError: false,
    error: null,
    status: 'pending' as const,
    fetchStatus: 'fetching' as const,
    refetch: vi.fn(),
  } as unknown as UseQueryResult<string[], Error>

  it('creates success result with data', () => {
    const data = ['item1', 'item2']
    const result = createDemoQueryResult(mockBaseQuery, data)

    expect(result.data).toBe(data)
    expect(result.isLoading).toBe(false)
    expect(result.isFetching).toBe(false)
    expect(result.isSuccess).toBe(true)
    expect(result.isError).toBe(false)
    expect(result.error).toBeNull()
    expect(result.status).toBe('success')
    expect(result.fetchStatus).toBe('idle')
  })

  it('creates error result when specified', () => {
    const error = new Error('Test error')
    const result = createDemoQueryResult(mockBaseQuery, [], {
      isError: true,
      error,
    })

    expect(result.data).toEqual([])
    expect(result.isSuccess).toBe(false)
    expect(result.isError).toBe(true)
    expect(result.error).toBe(error)
    expect(result.status).toBe('error')
  })

  it('handles null error correctly', () => {
    const result = createDemoQueryResult(mockBaseQuery, [], {
      isError: false,
      error: null,
    })

    expect(result.error).toBeNull()
  })

  it('preserves base query properties', () => {
    const result = createDemoQueryResult(mockBaseQuery, [])

    expect(result.refetch).toBe(mockBaseQuery.refetch)
  })

  it('defaults to success when no options provided', () => {
    const result = createDemoQueryResult(mockBaseQuery, ['data'])

    expect(result.isSuccess).toBe(true)
    expect(result.isError).toBe(false)
    expect(result.error).toBeNull()
  })
})
