import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import type { Assignment } from '@/api/client'

import { useDailyGameBadge, countTodaysGames } from './useDailyGameBadge'

// Mock the badge service
const mockSetBadge = vi.fn().mockResolvedValue({ success: true })
const mockClearBadge = vi.fn().mockResolvedValue({ success: true })
const mockIsSupported = vi.fn(() => true)

vi.mock('@/shared/services/badge', () => ({
  badgeService: {
    isSupported: () => mockIsSupported(),
    setBadge: (count: number) => mockSetBadge(count),
    clearBadge: () => mockClearBadge(),
  },
  badgeOperations: {
    resetCache: vi.fn(),
    getLastBadgeCount: vi.fn(() => null),
  },
}))

// Helper to create a mock assignment with a specific date
function createMockAssignment(
  dateTime: string,
  status: 'active' | 'cancelled' | 'archived' = 'active'
): Assignment {
  return {
    __identity: `assignment-${Math.random()}`,
    refereeConvocationStatus: status,
    refereePosition: 'head-one',
    refereeGame: {
      game: {
        startingDateTime: dateTime,
      },
    },
  } as Assignment
}

// Helper to get today's date at a specific time
function getTodayAt(hours: number, minutes = 0): string {
  const today = new Date()
  today.setHours(hours, minutes, 0, 0)
  return today.toISOString()
}

// Helper to get tomorrow's date
function getTomorrow(): string {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(14, 0, 0, 0)
  return tomorrow.toISOString()
}

// Helper to get yesterday's date
function getYesterday(): string {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  yesterday.setHours(14, 0, 0, 0)
  return yesterday.toISOString()
}

describe('countTodaysGames', () => {
  it('returns 0 for empty array', () => {
    expect(countTodaysGames([])).toBe(0)
  })

  it('counts active assignments for today', () => {
    const assignments = [
      createMockAssignment(getTodayAt(10)),
      createMockAssignment(getTodayAt(14)),
      createMockAssignment(getTodayAt(18)),
    ]

    expect(countTodaysGames(assignments)).toBe(3)
  })

  it('excludes cancelled assignments', () => {
    const assignments = [
      createMockAssignment(getTodayAt(10), 'active'),
      createMockAssignment(getTodayAt(14), 'cancelled'),
      createMockAssignment(getTodayAt(18), 'active'),
    ]

    expect(countTodaysGames(assignments)).toBe(2)
  })

  it('excludes archived assignments', () => {
    const assignments = [
      createMockAssignment(getTodayAt(10), 'active'),
      createMockAssignment(getTodayAt(14), 'archived'),
    ]

    expect(countTodaysGames(assignments)).toBe(1)
  })

  it('excludes assignments not for today', () => {
    const assignments = [
      createMockAssignment(getTodayAt(10), 'active'),
      createMockAssignment(getTomorrow(), 'active'),
      createMockAssignment(getYesterday(), 'active'),
    ]

    expect(countTodaysGames(assignments)).toBe(1)
  })

  it('handles assignments without dates', () => {
    const assignments = [
      createMockAssignment(getTodayAt(10)),
      {
        __identity: 'no-date',
        refereeConvocationStatus: 'active',
        refereePosition: 'head-one',
        refereeGame: {
          game: {},
        },
      } as Assignment,
    ]

    expect(countTodaysGames(assignments)).toBe(1)
  })

  it('handles assignments with null refereeGame', () => {
    const assignments = [
      createMockAssignment(getTodayAt(10)),
      {
        __identity: 'no-game',
        refereeConvocationStatus: 'active',
        refereePosition: 'head-one',
      } as Assignment,
    ]

    expect(countTodaysGames(assignments)).toBe(1)
  })

  it('handles invalid date strings gracefully', () => {
    const assignments = [createMockAssignment(getTodayAt(10)), createMockAssignment('not-a-date')]

    // Invalid dates should be filtered out (isToday returns false for Invalid Date)
    expect(countTodaysGames(assignments)).toBe(1)
  })
})

describe('useDailyGameBadge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsSupported.mockReturnValue(true)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("returns today's game count", () => {
    const assignments = [createMockAssignment(getTodayAt(10)), createMockAssignment(getTodayAt(14))]

    const { result } = renderHook(() => useDailyGameBadge(assignments))

    expect(result.current.todaysGameCount).toBe(2)
  })

  it('returns isSupported status', () => {
    const { result } = renderHook(() => useDailyGameBadge([]))

    expect(result.current.isSupported).toBe(true)
  })

  it('returns false when API is not supported', () => {
    mockIsSupported.mockReturnValue(false)

    const { result } = renderHook(() => useDailyGameBadge([]))

    expect(result.current.isSupported).toBe(false)
  })

  it('provides updateBadge function', () => {
    const { result } = renderHook(() => useDailyGameBadge([]))

    expect(typeof result.current.updateBadge).toBe('function')
  })

  it('provides clearBadge function', () => {
    const { result } = renderHook(() => useDailyGameBadge([]))

    expect(typeof result.current.clearBadge).toBe('function')
  })

  it('respects enabled option', () => {
    const assignments = [createMockAssignment(getTodayAt(10))]

    const { result } = renderHook(() => useDailyGameBadge(assignments, { enabled: false }))

    expect(result.current.todaysGameCount).toBe(1)
    // Badge should not be set when disabled
    expect(mockSetBadge).not.toHaveBeenCalled()
  })

  it('updates count when assignments change', () => {
    const initialAssignments = [createMockAssignment(getTodayAt(10))]
    const updatedAssignments = [
      createMockAssignment(getTodayAt(10)),
      createMockAssignment(getTodayAt(14)),
      createMockAssignment(getTodayAt(18)),
    ]

    const { result, rerender } = renderHook(({ assignments }) => useDailyGameBadge(assignments), {
      initialProps: { assignments: initialAssignments },
    })

    expect(result.current.todaysGameCount).toBe(1)

    rerender({ assignments: updatedAssignments })

    expect(result.current.todaysGameCount).toBe(3)
  })

  it('returns 0 for empty assignments', () => {
    const { result } = renderHook(() => useDailyGameBadge([]))

    expect(result.current.todaysGameCount).toBe(0)
  })

  it('calls setBadge on mount when there are games today', async () => {
    const assignments = [createMockAssignment(getTodayAt(10)), createMockAssignment(getTodayAt(14))]

    renderHook(() => useDailyGameBadge(assignments))

    // Wait for useEffect to run
    await vi.waitFor(() => {
      expect(mockSetBadge).toHaveBeenCalledWith(2)
    })
  })

  it('does not call setBadge when not supported', async () => {
    mockIsSupported.mockReturnValue(false)

    const assignments = [createMockAssignment(getTodayAt(10))]
    renderHook(() => useDailyGameBadge(assignments))

    // Give time for any potential calls
    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(mockSetBadge).not.toHaveBeenCalled()
  })
})
