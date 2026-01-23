/**
 * Tests for useAssignments hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import {
  useAssignments,
  useAssignmentDetails,
  getDateRangeForPeriod,
  sortByGameDate,
  getGameTimestamp,
  DEFAULT_PAGE_SIZE,
  DEFAULT_DATE_RANGE_DAYS,
  THIS_WEEK_DAYS,
  NEXT_MONTH_DAYS,
  type AssignmentsApiClient,
  type DatePeriod,
} from './useAssignments'

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

describe('getDateRangeForPeriod', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return upcoming date range', () => {
    const result = getDateRangeForPeriod('upcoming')

    expect(new Date(result.from).toISOString()).toContain('2024-06-15')
    const toDate = new Date(result.to)
    expect(toDate.getFullYear()).toBe(2025) // ~365 days from now
  })

  it('should return past date range', () => {
    const result = getDateRangeForPeriod('past')

    const fromDate = new Date(result.from)
    const toDate = new Date(result.to)

    // From should be ~365 days ago
    expect(fromDate.getFullYear()).toBe(2023)
    // To should be yesterday
    expect(toDate.toISOString()).toContain('2024-06-14')
  })

  it('should return thisWeek date range', () => {
    const result = getDateRangeForPeriod('thisWeek')

    const fromDate = new Date(result.from)
    const toDate = new Date(result.to)

    expect(fromDate.toISOString()).toContain('2024-06-15')
    expect(toDate.toISOString()).toContain('2024-06-22') // 7 days later
  })

  it('should return nextMonth date range', () => {
    const result = getDateRangeForPeriod('nextMonth')

    const fromDate = new Date(result.from)
    const toDate = new Date(result.to)

    expect(fromDate.toISOString()).toContain('2024-06-15')
    expect(toDate.toISOString()).toContain('2024-07-15') // 30 days later
  })

  it('should return custom date range', () => {
    const customRange = {
      from: new Date('2024-01-01'),
      to: new Date('2024-01-31'),
    }

    const result = getDateRangeForPeriod('custom', customRange)

    expect(new Date(result.from).toISOString()).toContain('2024-01-01')
    expect(new Date(result.to).toISOString()).toContain('2024-01-31')
  })

  it('should fallback to upcoming for custom without range', () => {
    const result = getDateRangeForPeriod('custom')

    // Should behave like 'upcoming'
    expect(new Date(result.from).toISOString()).toContain('2024-06-15')
  })
})

describe('sortByGameDate', () => {
  const createAssignment = (date: string | null) => ({
    refereeGame: {
      game: {
        startingDateTime: date,
      },
    },
  })

  it('should sort assignments by date ascending', () => {
    const items = [
      createAssignment('2024-06-20T10:00:00Z'),
      createAssignment('2024-06-15T10:00:00Z'),
      createAssignment('2024-06-25T10:00:00Z'),
    ]

    const sorted = sortByGameDate(items)

    expect(sorted[0].refereeGame?.game?.startingDateTime).toContain('2024-06-15')
    expect(sorted[1].refereeGame?.game?.startingDateTime).toContain('2024-06-20')
    expect(sorted[2].refereeGame?.game?.startingDateTime).toContain('2024-06-25')
  })

  it('should sort assignments by date descending', () => {
    const items = [
      createAssignment('2024-06-20T10:00:00Z'),
      createAssignment('2024-06-15T10:00:00Z'),
      createAssignment('2024-06-25T10:00:00Z'),
    ]

    const sorted = sortByGameDate(items, true)

    expect(sorted[0].refereeGame?.game?.startingDateTime).toContain('2024-06-25')
    expect(sorted[1].refereeGame?.game?.startingDateTime).toContain('2024-06-20')
    expect(sorted[2].refereeGame?.game?.startingDateTime).toContain('2024-06-15')
  })

  it('should handle null dates', () => {
    const items = [
      createAssignment('2024-06-20T10:00:00Z'),
      createAssignment(null),
      createAssignment('2024-06-15T10:00:00Z'),
    ]

    const sorted = sortByGameDate(items)

    // Null dates should be at the end in ascending order
    expect(sorted[0].refereeGame?.game?.startingDateTime).toContain('2024-06-15')
    expect(sorted[1].refereeGame?.game?.startingDateTime).toContain('2024-06-20')
    expect(sorted[2].refereeGame?.game?.startingDateTime).toBeNull()
  })

  it('should not mutate original array', () => {
    const items = [
      createAssignment('2024-06-20T10:00:00Z'),
      createAssignment('2024-06-15T10:00:00Z'),
    ]

    const original = [...items]
    sortByGameDate(items)

    expect(items[0].refereeGame?.game?.startingDateTime).toBe(
      original[0].refereeGame?.game?.startingDateTime
    )
  })

  it('should handle empty array', () => {
    const sorted = sortByGameDate([])
    expect(sorted).toEqual([])
  })
})

describe('getGameTimestamp', () => {
  it('should return timestamp for valid date', () => {
    const assignment = {
      refereeGame: {
        game: {
          startingDateTime: '2024-06-15T10:00:00Z',
        },
      },
    }

    const timestamp = getGameTimestamp(assignment)
    expect(timestamp).toBe(new Date('2024-06-15T10:00:00Z').getTime())
  })

  it('should return 0 for null date', () => {
    const assignment = {
      refereeGame: {
        game: {
          startingDateTime: null,
        },
      },
    }

    expect(getGameTimestamp(assignment)).toBe(0)
  })

  it('should return 0 for missing game', () => {
    const assignment = {
      refereeGame: {},
    }

    expect(getGameTimestamp(assignment)).toBe(0)
  })

  it('should return 0 for missing refereeGame', () => {
    const assignment = {}
    expect(getGameTimestamp(assignment)).toBe(0)
  })
})

describe('useAssignments', () => {
  const mockApiClient: AssignmentsApiClient = {
    searchAssignments: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch assignments with default period', async () => {
    const mockAssignments = [
      { id: '1', refereeGame: { game: { gameNumber: 'G001' } } },
      { id: '2', refereeGame: { game: { gameNumber: 'G002' } } },
    ]

    vi.mocked(mockApiClient.searchAssignments).mockResolvedValue({
      items: mockAssignments,
      totalItemsCount: 2,
    })

    const { result } = renderHook(
      () =>
        useAssignments({
          apiClient: mockApiClient,
        }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toHaveLength(2)
    expect(mockApiClient.searchAssignments).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: DEFAULT_PAGE_SIZE,
        offset: 0,
        sortDirection: 'asc', // Upcoming period
      })
    )
  })

  it('should fetch assignments with past period', async () => {
    vi.mocked(mockApiClient.searchAssignments).mockResolvedValue({
      items: [],
      totalItemsCount: 0,
    })

    const { result } = renderHook(
      () =>
        useAssignments({
          apiClient: mockApiClient,
          period: 'past',
        }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockApiClient.searchAssignments).toHaveBeenCalledWith(
      expect.objectContaining({
        sortDirection: 'desc', // Past period sorts descending
      })
    )
  })

  it('should not fetch when disabled', async () => {
    renderHook(
      () =>
        useAssignments({
          apiClient: mockApiClient,
          enabled: false,
        }),
      { wrapper: createWrapper() }
    )

    // Wait a tick to ensure no fetch was made
    await new Promise((r) => setTimeout(r, TEST_TICK_MS))

    expect(mockApiClient.searchAssignments).not.toHaveBeenCalled()
  })

  it('should include association key in query', async () => {
    vi.mocked(mockApiClient.searchAssignments).mockResolvedValue({
      items: [],
      totalItemsCount: 0,
    })

    const { result } = renderHook(
      () =>
        useAssignments({
          apiClient: mockApiClient,
          associationKey: 'RVNO',
        }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // The query was made - association key is in the query key, not the API call
    expect(mockApiClient.searchAssignments).toHaveBeenCalled()
  })

  it('should return empty array when API returns null items', async () => {
    vi.mocked(mockApiClient.searchAssignments).mockResolvedValue({
      items: undefined as any,
      totalItemsCount: 0,
    })

    const { result } = renderHook(
      () =>
        useAssignments({
          apiClient: mockApiClient,
        }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual([])
  })

  it('should handle API errors', async () => {
    vi.mocked(mockApiClient.searchAssignments).mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(
      () =>
        useAssignments({
          apiClient: mockApiClient,
        }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error?.message).toBe('Network error')
  })
})

describe('useAssignmentDetails', () => {
  const mockApiClient: AssignmentsApiClient = {
    searchAssignments: vi.fn(),
    getAssignmentDetails: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch assignment details', async () => {
    const mockAssignment = {
      id: 'assign-123',
      refereeGame: {
        game: { gameNumber: 'G001', hall: { name: 'Test Hall' } },
      },
    }

    vi.mocked(mockApiClient.getAssignmentDetails!).mockResolvedValue(mockAssignment as any)

    const { result } = renderHook(() => useAssignmentDetails('assign-123', mockApiClient), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.id).toBe('assign-123')
  })

  it('should not fetch when id is null', async () => {
    const { result } = renderHook(() => useAssignmentDetails(null, mockApiClient), {
      wrapper: createWrapper(),
    })

    // Should be in disabled state
    expect(result.current.fetchStatus).toBe('idle')
    expect(mockApiClient.getAssignmentDetails).not.toHaveBeenCalled()
  })

  it('should return null when getAssignmentDetails is not provided', async () => {
    const apiWithoutDetails: AssignmentsApiClient = {
      searchAssignments: vi.fn(),
      // No getAssignmentDetails
    }

    const { result } = renderHook(() => useAssignmentDetails('assign-123', apiWithoutDetails), {
      wrapper: createWrapper(),
    })

    // Should be in disabled state
    expect(result.current.fetchStatus).toBe('idle')
  })
})

describe('constants', () => {
  it('should export correct constants', () => {
    expect(DEFAULT_PAGE_SIZE).toBe(50)
    expect(DEFAULT_DATE_RANGE_DAYS).toBe(365)
    expect(THIS_WEEK_DAYS).toBe(7)
    expect(NEXT_MONTH_DAYS).toBe(30)
  })
})
