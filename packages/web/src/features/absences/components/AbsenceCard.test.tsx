import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { AbsenceCard } from './AbsenceCard'

import type { RefereeAbsence } from '@/api/client'

vi.mock('@/common/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'absences.entryLabel': 'Absence',
        'absences.noReason': 'No reason given',
        'absences.readOnly': 'Locked',
        'absences.readOnlyTooltip': 'Set by the association',
      }
      return map[key] ?? key
    },
  }),
}))

vi.mock('@/common/hooks/useDateFormat', () => ({
  useDateFormat: (dateString: string | undefined | null) => ({
    date: dateString ? new Date(dateString) : null,
    dateLabel: dateString ? `label:${dateString.slice(0, 10)}` : '',
    timeLabel: '',
    isToday: false,
    isTomorrow: false,
    isPast: false,
  }),
}))

function createAbsence(overrides: Partial<RefereeAbsence> = {}): RefereeAbsence {
  return {
    __identity: '11111111-1111-4111-8111-111111111111',
    fromDate: '2027-01-14T05:00:00.000000+00:00',
    toDate: '2027-01-17T22:59:59.000000+00:00',
    detailedReason: 'Ski holidays',
    _permissions: { object: { delete: true, update: true, create: true } },
    ...overrides,
  }
}

describe('AbsenceCard', () => {
  it('renders the date range for a multi-day absence', () => {
    render(<AbsenceCard absence={createAbsence()} />)
    expect(screen.getByText('label:2027-01-14 – label:2027-01-17')).toBeInTheDocument()
  })

  it('renders a single date for a single-day absence', () => {
    render(
      <AbsenceCard
        absence={createAbsence({
          fromDate: '2027-01-02T05:00:00.000000+00:00',
          toDate: '2027-01-02T22:59:59.000000+00:00',
        })}
      />
    )
    expect(screen.getByText('label:2027-01-02')).toBeInTheDocument()
  })

  it('renders the reason', () => {
    render(<AbsenceCard absence={createAbsence()} />)
    expect(screen.getByText('Ski holidays')).toBeInTheDocument()
  })

  it('falls back to a placeholder when the reason is empty', () => {
    render(<AbsenceCard absence={createAbsence({ detailedReason: '' })} />)
    expect(screen.getByText('No reason given')).toBeInTheDocument()
  })

  it('shows the locked badge for a read-only absence', () => {
    render(
      <AbsenceCard
        absence={createAbsence({
          _permissions: { object: { delete: false, update: false, create: false } },
        })}
      />
    )
    expect(screen.getByText('Locked')).toBeInTheDocument()
  })

  it('does not show the locked badge for an editable absence', () => {
    render(<AbsenceCard absence={createAbsence()} />)
    expect(screen.queryByText('Locked')).not.toBeInTheDocument()
  })
})
