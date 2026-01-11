import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import type { CompensationRecord } from '@/api/client'
import * as useConvocations from '@/features/validation/hooks/useConvocations'

import { CompensationsPage } from './CompensationsPage'

import type { UseQueryResult } from '@tanstack/react-query'

// Mock useTour to disable tour mode during tests (see src/test/mocks.ts for shared pattern)
const mockUseTour = vi.hoisted(() => ({
  useTour: () => ({
    isActive: false,
    isTourMode: false,
    showDummyData: false,
    startTour: vi.fn(),
    endTour: vi.fn(),
    currentStep: 0,
    nextStep: vi.fn(),
    shouldShow: false,
  }),
}))

vi.mock('@/features/validation/hooks/useConvocations')
vi.mock('@/shared/hooks/useTour', () => mockUseTour)
vi.mock('@/shared/hooks/useCompensationActions', () => ({
  useCompensationActions: () => ({
    editCompensationModal: {
      isOpen: false,
      compensation: null,
      open: vi.fn(),
      close: vi.fn(),
    },
    handleGeneratePDF: vi.fn(),
  }),
}))

// Use a date 7 days in the past to ensure it shows in the "Pending (Past)" tab
function getPastGameDate(): string {
  const date = new Date()
  date.setDate(date.getDate() - 7)
  return date.toISOString()
}

function createMockCompensation(overrides: Partial<CompensationRecord> = {}): CompensationRecord {
  return {
    __identity: `compensation-${Math.random()}`,
    refereeConvocationStatus: 'active',
    refereePosition: 'head-one',
    refereeGame: {
      game: {
        startingDateTime: getPastGameDate(),
        encounter: {
          teamHome: { name: 'Team A' },
          teamAway: { name: 'Team B' },
        },
        hall: { name: 'Main Arena' },
      },
    },
    convocationCompensation: {
      paymentDone: false,
      gameCompensation: 100,
      travelExpenses: 50,
      costFormatted: 'CHF 150.00',
    },
    ...overrides,
  } as CompensationRecord
}

function createMockQueryResult(
  data: CompensationRecord[] | undefined,
  isLoading = false,
  error: Error | null = null
): UseQueryResult<CompensationRecord[], Error> {
  return {
    data,
    isLoading,
    isFetching: false,
    isError: !!error,
    error,
    isSuccess: !isLoading && !error && !!data,
    status: isLoading ? 'pending' : error ? 'error' : 'success',
    refetch: vi.fn(),
  } as unknown as UseQueryResult<CompensationRecord[], Error>
}

describe('CompensationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default mocks - single useCompensations hook with dynamic filter
    vi.mocked(useConvocations.useCompensations).mockReturnValue(createMockQueryResult([]))
  })

  describe('Tab Navigation', () => {
    it('should default to Pending (Past) tab', () => {
      render(<CompensationsPage />)

      const pendingPastTab = screen.getByRole('tab', { name: /pending \(past\)/i })
      expect(pendingPastTab).toHaveClass('border-primary-500')
      expect(pendingPastTab).toHaveAttribute('aria-selected', 'true')
    })

    it('should switch to Closed tab when clicked', () => {
      render(<CompensationsPage />)

      fireEvent.click(screen.getByRole('tab', { name: /^closed$/i }))

      const closedTab = screen.getByRole('tab', { name: /^closed$/i })
      expect(closedTab).toHaveClass('border-primary-500')
      expect(closedTab).toHaveAttribute('aria-selected', 'true')
    })

    it('should have proper ARIA attributes on tablist', () => {
      render(<CompensationsPage />)

      const tablist = screen.getByRole('tablist')
      expect(tablist).toHaveAttribute('aria-label')
    })

    it('should support keyboard navigation with arrow keys', () => {
      render(<CompensationsPage />)

      const pendingPastTab = screen.getByRole('tab', { name: /pending \(past\)/i })
      pendingPastTab.focus()

      // Press right arrow to go to Pending (Future) tab
      fireEvent.keyDown(pendingPastTab, { key: 'ArrowRight' })

      const pendingFutureTab = screen.getByRole('tab', { name: /pending \(future\)/i })
      expect(pendingFutureTab).toHaveAttribute('aria-selected', 'true')

      // Press right arrow to go to Closed tab
      fireEvent.keyDown(pendingFutureTab, { key: 'ArrowRight' })

      const closedTab = screen.getByRole('tab', { name: /^closed$/i })
      expect(closedTab).toHaveAttribute('aria-selected', 'true')

      // Press right arrow wraps around to first tab (Pending Past)
      fireEvent.keyDown(closedTab, { key: 'ArrowRight' })
      expect(pendingPastTab).toHaveAttribute('aria-selected', 'true')

      // Press left arrow to go back to Closed tab
      fireEvent.keyDown(pendingPastTab, { key: 'ArrowLeft' })
      expect(closedTab).toHaveAttribute('aria-selected', 'true')
    })
  })

  describe('Content Display', () => {
    it('should show loading state', () => {
      vi.mocked(useConvocations.useCompensations).mockReturnValue(
        createMockQueryResult(undefined, true)
      )

      render(<CompensationsPage />)

      expect(screen.getByText(/loading/i)).toBeInTheDocument()
    })

    it('should show error state with retry button', () => {
      vi.mocked(useConvocations.useCompensations).mockReturnValue(
        createMockQueryResult(undefined, false, new Error('Failed to load'))
      )

      render(<CompensationsPage />)

      expect(screen.getByText(/failed to load/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
    })

    it('should show empty state when no compensations', () => {
      vi.mocked(useConvocations.useCompensations).mockReturnValue(createMockQueryResult([]))

      render(<CompensationsPage />)

      // Default tab is now Pending (Past), so the empty state is for pending past compensations
      expect(
        screen.getByRole('heading', { name: /no pending past compensations/i })
      ).toBeInTheDocument()
    })

    it('should show compensations when data is available', () => {
      const compensation = createMockCompensation()
      vi.mocked(useConvocations.useCompensations).mockReturnValue(
        createMockQueryResult([compensation])
      )

      render(<CompensationsPage />)

      expect(screen.getByText(/Team A vs Team B/i)).toBeInTheDocument()
    })
  })

  describe('Data Fetching', () => {
    it('should call useCompensations with false for Pending (Past) tab (default)', () => {
      render(<CompensationsPage />)

      expect(useConvocations.useCompensations).toHaveBeenCalledWith(false)
    })

    it('should call useCompensations with true for Closed tab', () => {
      render(<CompensationsPage />)

      fireEvent.click(screen.getByRole('tab', { name: /^closed$/i }))

      expect(useConvocations.useCompensations).toHaveBeenCalledWith(true)
    })

    it('should call useCompensations with false for Pending (Future) tab', () => {
      render(<CompensationsPage />)

      fireEvent.click(screen.getByRole('tab', { name: /pending \(future\)/i }))

      expect(useConvocations.useCompensations).toHaveBeenCalledWith(false)
    })
  })
})
