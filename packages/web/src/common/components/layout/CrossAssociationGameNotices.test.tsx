import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import {
  fetchCalendarAssignments,
  type CalendarAssignment,
} from '@/common/services/calendar/calendar-api'
import { useAuthStore, type Occupation, type UserProfile } from '@/common/stores/auth'
import { useCrossAssociationGamesStore } from '@/common/stores/cross-association-games'
import { setLocale } from '@/i18n'

import { CrossAssociationGameNotices } from './CrossAssociationGameNotices'

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

const user: UserProfile = {
  id: 'user-1',
  firstName: 'Test',
  lastName: 'User',
  occupations: [
    createOccupation({ id: 'occ-svrz', associationCode: 'SVRZ' }),
    createOccupation({ id: 'occ-svrba', associationCode: 'SVRBA' }),
  ],
}

function renderNotices(onSwitch = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <CrossAssociationGameNotices onSwitch={onSwitch} />
    </QueryClientProvider>
  )
}

beforeEach(async () => {
  await setLocale('en')
  // Fixed local noon so "today at 18:00" test dates are always in the future
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(new Date(2026, 8, 17, 12, 0, 0))
  vi.mocked(fetchCalendarAssignments).mockReset()
  vi.mocked(fetchCalendarAssignments).mockResolvedValue([])
  act(() => {
    useAuthStore.setState({
      status: 'authenticated',
      user,
      dataSource: 'api',
      calendarCode: 'ABC123',
      activeOccupationId: 'occ-svrz',
      isAssociationSwitching: false,
    })
    useCrossAssociationGamesStore.setState({ dismissedNotices: [] })
  })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('CrossAssociationGameNotices', () => {
  it('renders an empty live region when no other association has an imminent game', () => {
    renderNotices()

    // The aria-live container stays mounted so AT announces later notices
    expect(screen.getByTestId('cross-association-game-notices')).toBeEmptyDOMElement()
  })

  it('shows a notice for a game today in another association', async () => {
    vi.mocked(fetchCalendarAssignments).mockResolvedValue([
      makeCalendarAssignment(isoDaysFromNow(0), 'SVRBA'),
    ])

    renderNotices()

    expect(await screen.findByText('Game today in SVRBA')).toBeInTheDocument()
  })

  it('shows a tomorrow notice when there is no game today', async () => {
    vi.mocked(fetchCalendarAssignments).mockResolvedValue([
      makeCalendarAssignment(isoDaysFromNow(1), 'SVRBA'),
    ])

    renderNotices()

    expect(await screen.findByText('Game tomorrow in SVRBA')).toBeInTheDocument()
  })

  it('switches to the association when the notice is clicked', async () => {
    const onSwitch = vi.fn()
    vi.mocked(fetchCalendarAssignments).mockResolvedValue([
      makeCalendarAssignment(isoDaysFromNow(0), 'SVRBA'),
    ])

    renderNotices(onSwitch)
    const clickUser = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    await clickUser.click(await screen.findByText('Game today in SVRBA'))

    expect(onSwitch).toHaveBeenCalledWith('occ-svrba')
  })

  it('hides the notice after dismissal', async () => {
    vi.mocked(fetchCalendarAssignments).mockResolvedValue([
      makeCalendarAssignment(isoDaysFromNow(0), 'SVRBA'),
    ])

    renderNotices()
    await screen.findByText('Game today in SVRBA')
    const clickUser = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    await clickUser.click(screen.getByRole('button', { name: 'Dismiss notification' }))

    expect(screen.queryByText('Game today in SVRBA')).not.toBeInTheDocument()
    expect(screen.getByTestId('cross-association-game-notices')).toBeEmptyDOMElement()
  })

  it('disables switching while an association switch is in progress', async () => {
    vi.mocked(fetchCalendarAssignments).mockResolvedValue([
      makeCalendarAssignment(isoDaysFromNow(0), 'SVRBA'),
    ])
    act(() => {
      useAuthStore.setState({ isAssociationSwitching: true })
    })

    renderNotices()

    expect(await screen.findByText('Game today in SVRBA')).toBeDisabled()
  })
})
