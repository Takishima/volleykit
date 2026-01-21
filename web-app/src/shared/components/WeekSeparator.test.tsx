import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import type { WeekInfo } from '@/shared/utils/date-helpers'

import { WeekSeparator } from './WeekSeparator'

// Mock useDateLocale to return undefined (uses default date-fns locale)
vi.mock('@/shared/hooks/useDateFormat', () => ({
  useDateLocale: () => undefined,
}))

describe('WeekSeparator', () => {
  describe('date range formatting', () => {
    it('formats dates within the same month correctly', () => {
      const week: WeekInfo = {
        key: '2025-W03',
        weekStart: new Date(2025, 0, 13), // Jan 13
        weekEnd: new Date(2025, 0, 19), // Jan 19
        weekNumber: 3,
        year: 2025,
      }

      render(<WeekSeparator week={week} />)

      // Should show "Jan 13 – 19" format (same month)
      expect(screen.getByText(/Jan 13 – 19/)).toBeInTheDocument()
    })

    it('formats dates spanning different months within the same year correctly', () => {
      const week: WeekInfo = {
        key: '2025-W05',
        weekStart: new Date(2025, 0, 27), // Jan 27
        weekEnd: new Date(2025, 1, 2), // Feb 2
        weekNumber: 5,
        year: 2025,
      }

      render(<WeekSeparator week={week} />)

      // Should show "Jan 27 – Feb 2" format (different months, same year)
      expect(screen.getByText(/Jan 27 – Feb 2/)).toBeInTheDocument()
    })

    it('formats dates spanning different years correctly', () => {
      const week: WeekInfo = {
        key: '2025-W01',
        weekStart: new Date(2024, 11, 30), // Dec 30, 2024
        weekEnd: new Date(2025, 0, 5), // Jan 5, 2025
        weekNumber: 1,
        year: 2025,
      }

      render(<WeekSeparator week={week} />)

      // Should show "Dec 30, 2024 – Jan 5, 2025" format (different years)
      expect(screen.getByText(/Dec 30, 2024 – Jan 5, 2025/)).toBeInTheDocument()
    })
  })

  describe('rendering', () => {
    it('renders as a div with col-span-full class', () => {
      const week: WeekInfo = {
        key: '2025-W10',
        weekStart: new Date(2025, 2, 3), // Mar 3
        weekEnd: new Date(2025, 2, 9), // Mar 9
        weekNumber: 10,
        year: 2025,
      }

      const { container } = render(<WeekSeparator week={week} />)

      const separator = container.firstChild as HTMLElement
      expect(separator).toHaveClass('col-span-full')
    })

    it('renders two divider lines', () => {
      const week: WeekInfo = {
        key: '2025-W10',
        weekStart: new Date(2025, 2, 3),
        weekEnd: new Date(2025, 2, 9),
        weekNumber: 10,
        year: 2025,
      }

      const { container } = render(<WeekSeparator week={week} />)

      // Find divider lines by their styling class
      const dividers = container.querySelectorAll('.h-px.flex-1')
      expect(dividers).toHaveLength(2)
    })

    it('renders date range text with appropriate styling', () => {
      const week: WeekInfo = {
        key: '2025-W10',
        weekStart: new Date(2025, 2, 3),
        weekEnd: new Date(2025, 2, 9),
        weekNumber: 10,
        year: 2025,
      }

      render(<WeekSeparator week={week} />)

      const dateText = screen.getByText(/Mar 3 – 9/)
      expect(dateText).toHaveClass('text-xs')
      expect(dateText).toHaveClass('whitespace-nowrap')
    })
  })

  describe('edge cases', () => {
    it('handles the last week of the year correctly', () => {
      const week: WeekInfo = {
        key: '2025-W52',
        weekStart: new Date(2025, 11, 22), // Dec 22
        weekEnd: new Date(2025, 11, 28), // Dec 28
        weekNumber: 52,
        year: 2025,
      }

      render(<WeekSeparator week={week} />)

      expect(screen.getByText(/Dec 22 – 28/)).toBeInTheDocument()
    })

    it('handles February dates correctly', () => {
      const week: WeekInfo = {
        key: '2025-W09',
        weekStart: new Date(2025, 1, 24), // Feb 24
        weekEnd: new Date(2025, 2, 2), // Mar 2
        weekNumber: 9,
        year: 2025,
      }

      render(<WeekSeparator week={week} />)

      expect(screen.getByText(/Feb 24 – Mar 2/)).toBeInTheDocument()
    })
  })
})
