import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import * as authStore from '@/common/stores/auth'

import { AbsencesPage } from './AbsencesPage'

import type { RefereeAbsence } from '@/api/client'
import type { ReactNode } from 'react'

const mockUseAbsences = vi.fn()
vi.mock('./hooks/useAbsences', () => ({
  useAbsences: () => mockUseAbsences() as unknown,
}))

vi.mock('./components/AbsenceCard', () => ({
  AbsenceCard: () => <div data-testid="absence-card" />,
}))

vi.mock('@/common/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    tInterpolate: (key: string) => key,
  }),
}))

// Automock keeps the module shape (other exports stay mocked, not missing)
vi.mock('@/common/stores/auth')

vi.mock('@/common/components/PullToRefresh', () => ({
  PullToRefresh: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

function createAbsence(overrides: Partial<RefereeAbsence> = {}): RefereeAbsence {
  return {
    __identity: '11111111-1111-4111-8111-111111111111',
    fromDate: '2020-01-02T05:00:00.000000+00:00',
    toDate: '2020-01-02T22:59:59.000000+00:00',
    detailedReason: 'Past entry',
    ...overrides,
  }
}

function renderPage(absences: RefereeAbsence[], { hasMore = false } = {}) {
  mockUseAbsences.mockReturnValue({
    data: {
      absences,
      totalItemsCount: hasMore ? absences.length + 1 : absences.length,
      hasMore,
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  })
  render(
    <MemoryRouter>
      <AbsencesPage />
    </MemoryRouter>
  )
}

function renderPastTab(absences: RefereeAbsence[], options: { hasMore?: boolean } = {}) {
  renderPage(absences, options)
  fireEvent.click(screen.getByText('absences.past'))
}

describe('AbsencesPage', () => {
  beforeEach(() => {
    mockUseAbsences.mockReset()

    vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
      selector({
        isCalendarMode: () => false,
      } as unknown as ReturnType<typeof authStore.useAuthStore.getState>)
    )
  })

  it('shows no truncation note when the server returned everything', () => {
    renderPastTab([createAbsence()])

    expect(screen.getByTestId('absence-card')).toBeInTheDocument()
    expect(screen.queryByText('absences.truncatedNote')).not.toBeInTheDocument()
  })

  it('discloses truncation on the Past tab when the server holds more rows', () => {
    renderPastTab([createAbsence()], { hasMore: true })

    expect(screen.getAllByText('absences.truncatedNote')).toHaveLength(1)
  })

  it('does not render past entries or the note on the Upcoming tab', () => {
    renderPage([createAbsence()], { hasMore: true })

    expect(screen.queryByText('absences.truncatedNote')).not.toBeInTheDocument()
    expect(screen.getByText('absences.noUpcomingTitle')).toBeInTheDocument()
  })

  it('links back to settings', () => {
    renderPage([])

    const backLink = screen.getByLabelText('absences.backToSettings')
    expect(backLink).toHaveAttribute('href', '/settings')
  })
})
