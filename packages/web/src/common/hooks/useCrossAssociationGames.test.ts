import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, act, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import {
  fetchCalendarAssignments,
  type CalendarAssignment,
} from '@/common/services/calendar/calendar-api'
import { useAuthStore, type Occupation, type UserProfile } from '@/common/stores/auth'
import {
  useCrossAssociationGamesStore,
  buildNoticeKey,
  toLocalDateKey,
} from '@/common/stores/cross-association-games'

import { useCrossAssociationGameNotices } from './useCrossAssociationGames'

vi.mock('@/common/services/calendar/calendar-api', () => ({
  fetchCalendarAssignments: vi.fn(),
}))

function isoDaysFromNow(days: number, hour = 18): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  date.setHours(hour, 0, 0, 0)
  return date.toISOString()
}

function makeCalendarAssignment(startTime: string, association: string | null): CalendarAssignment {
  return { startTime, association } as CalendarAssignment
}

function createOccupation(overrides: Partial<Occupation> = {}): Occupation {
  return { id: 'occ-1', type: 'referee', associationCode: 'SVRZ', ...overrides }
}

function createUser(occupations: Occupation[]): UserProfile {
  return { id: 'user-1', firstName: 'Test', lastName: 'User', occupations }
}

const TWO_ASSOCIATION_USER = createUser([
  createOccupation({ id: 'occ-svrz', associationCode: 'SVRZ' }),
  createOccupation({ id: 'occ-svrba', associationCode: 'SVRBA' }),
])

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

function renderNotices() {
  return renderHook(() => useCrossAssociationGameNotices(), { wrapper: createWrapper() })
}

beforeEach(() => {
  vi.mocked(fetchCalendarAssignments).mockReset()
  vi.mocked(fetchCalendarAssignments).mockResolvedValue([])
  act(() => {
    useAuthStore.setState({
      status: 'authenticated',
      user: TWO_ASSOCIATION_USER,
      dataSource: 'api',
      calendarCode: 'ABC123',
      activeOccupationId: 'occ-svrz',
      isAssociationSwitching: false,
    })
    useCrossAssociationGamesStore.setState({ dismissedNotices: [] })
  })
})

describe('useCrossAssociationGameNotices', () => {
  it('reports a game today in another association', async () => {
    const gameDate = isoDaysFromNow(0)
    vi.mocked(fetchCalendarAssignments).mockResolvedValue([
      makeCalendarAssignment(gameDate, 'SVRBA'),
    ])

    const { result } = renderNotices()

    await waitFor(() =>
      expect(result.current).toEqual([
        {
          occupationId: 'occ-svrba',
          associationCode: 'SVRBA',
          gameDate,
          day: 'today',
          noticeKey: buildNoticeKey('SVRBA', toLocalDateKey(gameDate), 'today'),
        },
      ])
    )
  })

  it('prefers a game today over one tomorrow in the same association', async () => {
    vi.mocked(fetchCalendarAssignments).mockResolvedValue([
      makeCalendarAssignment(isoDaysFromNow(1), 'SVRBA'),
      makeCalendarAssignment(isoDaysFromNow(0), 'SVRBA'),
    ])

    const { result } = renderNotices()

    await waitFor(() => expect(result.current).toHaveLength(1))
    expect(result.current[0]?.day).toBe('today')
  })

  it('reports a game tomorrow when there is none today', async () => {
    vi.mocked(fetchCalendarAssignments).mockResolvedValue([
      makeCalendarAssignment(isoDaysFromNow(1), 'SVRBA'),
    ])

    const { result } = renderNotices()

    await waitFor(() => expect(result.current).toHaveLength(1))
    expect(result.current[0]?.day).toBe('tomorrow')
  })

  it('ignores the active association, unknown associations, and games further out', async () => {
    vi.mocked(fetchCalendarAssignments).mockResolvedValue([
      makeCalendarAssignment(isoDaysFromNow(0), 'SVRZ'), // active association
      makeCalendarAssignment(isoDaysFromNow(0), null), // no association info
      makeCalendarAssignment(isoDaysFromNow(0), 'SVRI'), // no matching occupation
      makeCalendarAssignment(isoDaysFromNow(3), 'SVRBA'), // too far out
    ])

    const { result } = renderNotices()

    await waitFor(() => expect(fetchCalendarAssignments).toHaveBeenCalled())
    expect(result.current).toEqual([])
  })

  it('ignores dismissed notices', async () => {
    const gameDate = isoDaysFromNow(0)
    vi.mocked(fetchCalendarAssignments).mockResolvedValue([
      makeCalendarAssignment(gameDate, 'SVRBA'),
    ])
    act(() => {
      useCrossAssociationGamesStore
        .getState()
        .dismissNotice(buildNoticeKey('SVRBA', toLocalDateKey(gameDate), 'today'))
    })

    const { result } = renderNotices()

    await waitFor(() => expect(fetchCalendarAssignments).toHaveBeenCalled())
    expect(result.current).toEqual([])
  })

  it('does not fetch outside API mode', () => {
    act(() => {
      useAuthStore.setState({ dataSource: 'demo' })
    })

    const { result } = renderNotices()

    expect(fetchCalendarAssignments).not.toHaveBeenCalled()
    expect(result.current).toEqual([])
  })

  it('does not fetch without a calendar code', () => {
    act(() => {
      useAuthStore.setState({ calendarCode: null })
    })

    const { result } = renderNotices()

    expect(fetchCalendarAssignments).not.toHaveBeenCalled()
    expect(result.current).toEqual([])
  })

  it('does not fetch for single-association users', () => {
    act(() => {
      useAuthStore.setState({
        user: createUser([createOccupation({ id: 'occ-svrz', associationCode: 'SVRZ' })]),
      })
    })

    const { result } = renderNotices()

    expect(fetchCalendarAssignments).not.toHaveBeenCalled()
    expect(result.current).toEqual([])
  })
})
