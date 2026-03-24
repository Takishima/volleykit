import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, it, expect, vi } from 'vitest'

import { OnCallCard } from './OnCallCard'
import type { OnCallAssignment } from '../hooks/useMyOnCallAssignments'

// Stub external dependencies
vi.mock('@/common/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'onCall.duty': 'On-call duty',
      }
      return map[key] ?? key
    },
  }),
}))

vi.mock('@/common/hooks/useDateFormat', () => ({
  useDateFormat: (_date: string) => ({
    dateLabel: 'Sa 15.03',
    timeLabel: '12:00',
    isToday: false,
  }),
}))

function renderWithProviders(ui: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

function createOnCallAssignment(overrides: Partial<OnCallAssignment> = {}): OnCallAssignment {
  return {
    id: 'entry-1-NLA',
    date: '2026-03-15T12:00:00.000Z',
    weekday: 'Sa',
    calendarWeek: 11,
    league: 'NLA',
    backupEntry: {
      __identity: 'entry-1',
      date: '2026-03-15T00:00:00.000Z',
      weekday: 'Sa',
      calendarWeek: 11,
    },
    assignment: { __identity: 'assignment-1' } as OnCallAssignment['assignment'],
    ...overrides,
  }
}

describe('OnCallCard', () => {
  it('renders the on-call duty label', () => {
    renderWithProviders(<OnCallCard assignment={createOnCallAssignment()} />)
    expect(screen.getByText('On-call duty')).toBeInTheDocument()
  })

  it('renders the NLA league badge', () => {
    renderWithProviders(<OnCallCard assignment={createOnCallAssignment({ league: 'NLA' })} />)
    expect(screen.getByText('NLA')).toBeInTheDocument()
  })

  it('renders the NLB league badge', () => {
    renderWithProviders(<OnCallCard assignment={createOnCallAssignment({ league: 'NLB' })} />)
    expect(screen.getByText('NLB')).toBeInTheDocument()
  })

  it('renders the date label from useDateFormat', () => {
    renderWithProviders(<OnCallCard assignment={createOnCallAssignment()} />)
    expect(screen.getByText('Sa 15.03')).toBeInTheDocument()
  })

  it('renders the time label from useDateFormat', () => {
    renderWithProviders(<OnCallCard assignment={createOnCallAssignment()} />)
    expect(screen.getByText('12:00')).toBeInTheDocument()
  })

  it('has an aria-label combining duty, league, and date', () => {
    const { container } = renderWithProviders(
      <OnCallCard assignment={createOnCallAssignment({ league: 'NLA' })} />
    )
    const card = container.querySelector('[aria-label]')
    expect(card).toHaveAttribute('aria-label', 'On-call duty NLA - Sa 15.03')
  })
})
