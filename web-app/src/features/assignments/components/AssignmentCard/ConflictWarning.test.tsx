import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import type { AssignmentConflict } from '@/features/assignments/utils/conflict-detection'

import { ConflictDetails, ConflictIndicator } from './ConflictWarning'

// Mock useTranslation
vi.mock('@/shared/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'assignments.conflictWarningTooltip': 'Scheduling conflict',
        'assignments.conflictWarningTitle': 'Potential scheduling conflict',
        'assignments.conflictGap': 'gap',
        'assignments.conflictOverlap': 'overlap',
        'assignments.hall': 'Hall',
      }
      return translations[key] ?? key
    },
    locale: 'en',
  }),
}))

// Mock useDateFormat
vi.mock('@/shared/hooks/useDateFormat', () => ({
  useDateFormat: (dateTime: string) => ({
    dateLabel: 'Mon, Jan 15',
    timeLabel: dateTime ? '14:00' : 'Unknown',
    isToday: false,
    isPast: false,
  }),
}))

function createMockConflict(overrides: Partial<AssignmentConflict> = {}): AssignmentConflict {
  return {
    assignmentId: 'assignment-1',
    conflictingAssignmentId: 'assignment-2',
    gapMinutes: 30,
    conflictingAssignment: {
      gameId: 'game-2',
      homeTeam: 'VBC Zürich',
      awayTeam: 'VBC Basel',
      startTime: '2025-01-15T14:00:00Z',
      endTime: '2025-01-15T16:00:00Z',
      league: 'NLA Men',
      association: 'SVRZ',
      hallName: 'Saalsporthalle',
    },
    ...overrides,
  }
}

describe('ConflictWarning components', () => {
  describe('ConflictIndicator', () => {
    it('should render nothing when no conflicts', () => {
      const { container } = render(<ConflictIndicator conflicts={[]} />)
      expect(container).toBeEmptyDOMElement()
    })

    it('should render warning icon when conflicts exist', () => {
      render(<ConflictIndicator conflicts={[createMockConflict()]} />)

      const indicator = screen.getByLabelText('Scheduling conflict')
      expect(indicator).toBeInTheDocument()
    })

    it('should have proper ARIA attributes', () => {
      render(<ConflictIndicator conflicts={[createMockConflict()]} />)

      const indicator = screen.getByLabelText('Scheduling conflict')
      expect(indicator).toHaveAttribute('title', 'Scheduling conflict')
      expect(indicator).toHaveAttribute('aria-label', 'Scheduling conflict')
    })

    it('should have visual warning styling', () => {
      render(<ConflictIndicator conflicts={[createMockConflict()]} />)

      const indicator = screen.getByLabelText('Scheduling conflict')
      expect(indicator).toHaveClass('bg-red-100')
      expect(indicator).toHaveClass('text-red-700')
    })
  })

  describe('ConflictDetails', () => {
    it('should render nothing when no conflicts', () => {
      const { container } = render(<ConflictDetails conflicts={[]} />)
      expect(container).toBeEmptyDOMElement()
    })

    it('should display conflict warning title', () => {
      render(<ConflictDetails conflicts={[createMockConflict()]} />)

      expect(screen.getByText('Potential scheduling conflict')).toBeInTheDocument()
    })

    it('should display conflicting team names', () => {
      render(<ConflictDetails conflicts={[createMockConflict()]} />)

      expect(screen.getByText('VBC Zürich - VBC Basel')).toBeInTheDocument()
    })

    it('should display association label', () => {
      render(<ConflictDetails conflicts={[createMockConflict()]} />)

      expect(screen.getByText('(SVRZ)')).toBeInTheDocument()
    })

    it('should display hall name', () => {
      render(<ConflictDetails conflicts={[createMockConflict()]} />)

      expect(screen.getByText(/Hall:.*Saalsporthalle/)).toBeInTheDocument()
    })

    it('should display gap in minutes', () => {
      render(<ConflictDetails conflicts={[createMockConflict({ gapMinutes: 30 })]} />)

      expect(screen.getByText(/30min gap/)).toBeInTheDocument()
    })

    it('should display gap in hours and minutes', () => {
      render(<ConflictDetails conflicts={[createMockConflict({ gapMinutes: 90 })]} />)

      expect(screen.getByText(/1h 30min gap/)).toBeInTheDocument()
    })

    it('should display overlap for negative gap', () => {
      render(<ConflictDetails conflicts={[createMockConflict({ gapMinutes: -45 })]} />)

      expect(screen.getByText(/45min overlap/)).toBeInTheDocument()
    })

    it('should display multiple conflicts', () => {
      const conflicts = [
        createMockConflict({
          conflictingAssignmentId: 'game-2',
          conflictingAssignment: {
            gameId: 'game-2',
            homeTeam: 'Team A',
            awayTeam: 'Team B',
            startTime: '2025-01-15T14:00:00Z',
            endTime: '2025-01-15T16:00:00Z',
            league: 'NLA',
            association: 'SVRZ',
            hallName: 'Hall 1',
          },
        }),
        createMockConflict({
          conflictingAssignmentId: 'game-3',
          conflictingAssignment: {
            gameId: 'game-3',
            homeTeam: 'Team C',
            awayTeam: 'Team D',
            startTime: '2025-01-15T15:00:00Z',
            endTime: '2025-01-15T17:00:00Z',
            league: 'NLB',
            association: 'SV',
            hallName: 'Hall 2',
          },
        }),
      ]

      render(<ConflictDetails conflicts={conflicts} />)

      expect(screen.getByText('Team A - Team B')).toBeInTheDocument()
      expect(screen.getByText('Team C - Team D')).toBeInTheDocument()
    })

    it('should not display association when null', () => {
      const conflict = createMockConflict({
        conflictingAssignment: {
          gameId: 'game-2',
          homeTeam: 'Team A',
          awayTeam: 'Team B',
          startTime: '2025-01-15T14:00:00Z',
          endTime: '2025-01-15T16:00:00Z',
          league: 'NLA',
          association: null,
          hallName: 'Hall 1',
        },
      })

      render(<ConflictDetails conflicts={[conflict]} />)

      // Association should not be shown
      expect(screen.queryByText(/\([A-Z]+\)/)).not.toBeInTheDocument()
    })

    it('should not display hall when null', () => {
      const conflict = createMockConflict({
        conflictingAssignment: {
          gameId: 'game-2',
          homeTeam: 'Team A',
          awayTeam: 'Team B',
          startTime: '2025-01-15T14:00:00Z',
          endTime: '2025-01-15T16:00:00Z',
          league: 'NLA',
          association: 'SVRZ',
          hallName: null,
        },
      })

      render(<ConflictDetails conflicts={[conflict]} />)

      expect(screen.queryByText(/Hall:/)).not.toBeInTheDocument()
    })

    it('should have visual warning styling', () => {
      render(<ConflictDetails conflicts={[createMockConflict()]} />)

      const container = screen.getByText('Potential scheduling conflict').closest('div')?.parentElement
      expect(container).toHaveClass('bg-red-50')
      expect(container).toHaveClass('border-red-200')
    })
  })
})
