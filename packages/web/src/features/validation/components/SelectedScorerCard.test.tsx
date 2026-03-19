import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import type { ValidatedPersonSearchResult } from '@/api/validation'

import { SelectedScorerCard } from './SelectedScorerCard'

const mockScorer: ValidatedPersonSearchResult = {
  __identity: 'a1111111-1111-4111-a111-111111111111',
  firstName: 'Hans',
  lastName: 'Müller',
  displayName: 'Hans Müller',
  associationId: 12345,
  birthday: '1985-03-15T00:00:00+00:00',
  gender: 'm',
}

describe('SelectedScorerCard', () => {
  it('displays scorer name', () => {
    render(<SelectedScorerCard scorer={mockScorer} onClear={vi.fn()} />)

    expect(screen.getByText('Hans Müller')).toBeInTheDocument()
  })

  it('displays association ID', () => {
    render(<SelectedScorerCard scorer={mockScorer} onClear={vi.fn()} />)

    expect(screen.getByText('ID: 12345')).toBeInTheDocument()
  })

  it('displays formatted birthday with DOB label', () => {
    render(<SelectedScorerCard scorer={mockScorer} onClear={vi.fn()} />)

    // formatDOB returns DD.MM.YY format (Swiss format) with DOB label
    expect(screen.getByText('DOB: 15.03.85')).toBeInTheDocument()
  })

  it('calls onClear when clear button is clicked', () => {
    const onClear = vi.fn()
    render(<SelectedScorerCard scorer={mockScorer} onClear={onClear} />)

    const clearButton = screen.getByRole('button', { name: /close/i })
    fireEvent.click(clearButton)

    expect(onClear).toHaveBeenCalledTimes(1)
  })

  it('does not display association ID if not present', () => {
    const scorerWithoutId = { ...mockScorer, associationId: undefined }
    render(<SelectedScorerCard scorer={scorerWithoutId} onClear={vi.fn()} />)

    expect(screen.queryByText(/ID:/)).not.toBeInTheDocument()
  })

  it('does not display birthday if not present', () => {
    const scorerWithoutBirthday = { ...mockScorer, birthday: undefined }
    render(<SelectedScorerCard scorer={scorerWithoutBirthday} onClear={vi.fn()} />)

    expect(screen.queryByText('15.03.85')).not.toBeInTheDocument()
  })

  describe('displayBirthday fallback prop', () => {
    it('displays birthday from displayBirthday prop when scorer is not available', () => {
      render(
        <SelectedScorerCard
          displayName="Jane Doe"
          displayBirthday="1990-06-20T00:00:00+00:00"
          readOnly
        />
      )

      expect(screen.getByText('Jane Doe')).toBeInTheDocument()
      expect(screen.getByText('DOB: 20.06.90')).toBeInTheDocument()
    })

    it('displays birthday from displayBirthday when scorer has no birthday', () => {
      const scorerWithoutBirthday = { ...mockScorer, birthday: undefined }
      render(
        <SelectedScorerCard
          scorer={scorerWithoutBirthday}
          displayBirthday="1988-12-01T00:00:00+00:00"
          onClear={vi.fn()}
        />
      )

      expect(screen.getByText('DOB: 01.12.88')).toBeInTheDocument()
    })

    it('prefers scorer.birthday over displayBirthday prop', () => {
      render(
        <SelectedScorerCard
          scorer={mockScorer}
          displayBirthday="1999-01-01T00:00:00+00:00"
          onClear={vi.fn()}
        />
      )

      // Should show scorer's birthday (15.03.85), not displayBirthday
      expect(screen.getByText('DOB: 15.03.85')).toBeInTheDocument()
      expect(screen.queryByText('DOB: 01.01.99')).not.toBeInTheDocument()
    })
  })

  describe('metadata row visibility', () => {
    it('shows metadata row with only birthday when no association ID', () => {
      const scorerWithBirthdayOnly = {
        ...mockScorer,
        associationId: undefined,
        birthday: '1992-07-15T00:00:00+00:00',
      }
      render(<SelectedScorerCard scorer={scorerWithBirthdayOnly} onClear={vi.fn()} />)

      // Should show birthday but not ID
      expect(screen.getByText('DOB: 15.07.92')).toBeInTheDocument()
      expect(screen.queryByText(/ID:/)).not.toBeInTheDocument()
    })

    it('shows metadata row with only association ID when no birthday', () => {
      const scorerWithIdOnly = { ...mockScorer, birthday: undefined }
      render(<SelectedScorerCard scorer={scorerWithIdOnly} onClear={vi.fn()} />)

      expect(screen.getByText('ID: 12345')).toBeInTheDocument()
      expect(screen.queryByText(/DOB:/)).not.toBeInTheDocument()
    })

    it('hides metadata row when neither association ID nor birthday present', () => {
      const scorerWithNoMetadata = {
        ...mockScorer,
        associationId: undefined,
        birthday: undefined,
      }
      render(<SelectedScorerCard scorer={scorerWithNoMetadata} onClear={vi.fn()} />)

      // Only the name should be visible, no metadata row
      expect(screen.getByText('Hans Müller')).toBeInTheDocument()
      expect(screen.queryByText(/ID:/)).not.toBeInTheDocument()
      expect(screen.queryByText(/DOB:/)).not.toBeInTheDocument()
    })
  })
})
