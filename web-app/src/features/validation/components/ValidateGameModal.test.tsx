import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import type { Assignment } from '@/api/client'
import * as useNominationListModule from '@/features/validation/hooks/useNominationList'
import * as useValidationStateModule from '@/features/validation/hooks/useValidationState'

import { ValidateGameModal } from './ValidateGameModal'

vi.mock('@/features/validation/hooks/useNominationList')
vi.mock('@/features/validation/hooks/useValidationState')

vi.mock('@/features/validation/hooks/useScorerSearch', () => ({
  useScorerSearch: vi.fn(() => ({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
  })),
  parseSearchInput: vi.fn((input: string) => {
    if (!input.trim()) return {}
    return { lastName: input }
  }),
}))

vi.mock('@/shared/stores/auth', () => ({
  useAuthStore: vi.fn((selector) => selector({ dataSource: 'api' })),
}))

vi.mock('@/shared/stores/settings', () => ({
  useSettingsStore: vi.fn((selector) => {
    const state = {
      isSafeModeEnabled: false,
      isOCREnabled: false,
    }
    // Handle both selector function and direct access patterns
    return typeof selector === 'function' ? selector(state) : state
  }),
}))

function createMockAssignment(overrides: Partial<Assignment> = {}): Assignment {
  return {
    __identity: 'assignment-1',
    refereePosition: 'head-one',
    refereeGame: {
      game: {
        __identity: 'game-1',
        startingDateTime: '2025-12-15T14:00:00Z',
        encounter: {
          teamHome: { name: 'VBC Zürich' },
          teamAway: { name: 'VBC Basel' },
        },
        hall: {
          name: 'Sporthalle Zürich',
          primaryPostalAddress: {
            city: 'Zürich',
          },
        },
      },
    },
    ...overrides,
  } as Assignment
}

// Shared QueryClient to avoid memory issues from creating many instances
let queryClient: QueryClient

function createWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('ValidateGameModal', () => {
  const mockOnClose = vi.fn()

  beforeEach(() => {
    // Create fresh QueryClient for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })

    mockOnClose.mockClear()
    vi.mocked(useNominationListModule.useNominationList).mockReturnValue({
      nominationList: null,
      players: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    })
    vi.mocked(useValidationStateModule.useValidationState).mockReturnValue({
      state: {
        homeRoster: {
          reviewed: false,
          playerModifications: { added: [], removed: [] },
          coachModifications: { added: new Map(), removed: new Set() },
        },
        awayRoster: {
          reviewed: false,
          playerModifications: { added: [], removed: [] },
          coachModifications: { added: new Map(), removed: new Set() },
        },
        scorer: { selected: null },
        scoresheet: { file: null, uploaded: false },
      },
      isDirty: false,
      completionStatus: {
        homeRoster: false,
        awayRoster: false,
        scorer: false,
        scoresheet: true,
      },
      isAllRequiredComplete: false,
      isValidated: false,
      validatedInfo: null,
      pendingScorer: null,
      scoresheetNotRequired: false,
      setHomeRosterModifications: vi.fn(),
      setAwayRosterModifications: vi.fn(),
      setScorer: vi.fn(),
      setScoresheet: vi.fn(),
      reset: vi.fn(),
      saveProgress: vi.fn().mockResolvedValue(undefined),
      finalizeValidation: vi.fn().mockResolvedValue(undefined),
      isSaving: false,
      isFinalizing: false,
      isLoadingGameDetails: false,
      gameDetailsError: null,
      homeNominationList: null,
      awayNominationList: null,
    })
  })

  afterEach(() => {
    // Clean up renders and clear QueryClient cache
    cleanup()
    queryClient.clear()
  })

  describe('rendering', () => {
    it('does not render when isOpen is false', () => {
      const { container } = render(
        <ValidateGameModal
          assignment={createMockAssignment()}
          isOpen={false}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      )
      expect(container.firstChild).toBeNull()
    })

    it('renders modal with correct title when open', () => {
      render(
        <ValidateGameModal
          assignment={createMockAssignment()}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      )
      expect(screen.getByRole('dialog', { hidden: true })).toBeInTheDocument()
      expect(screen.getByText('Validate Game Details')).toBeInTheDocument()
    })

    it('displays team names', () => {
      render(
        <ValidateGameModal
          assignment={createMockAssignment()}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      )
      expect(screen.getByText('VBC Zürich vs VBC Basel')).toBeInTheDocument()
    })

    it('shows step indicator with 4 steps', () => {
      render(
        <ValidateGameModal
          assignment={createMockAssignment()}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      )
      // Step indicator should show step 1 of 4
      expect(screen.getByText('Step 1 of 4')).toBeInTheDocument()
    })
  })

  describe('wizard navigation', () => {
    it('shows Home Roster panel by default (first step)', () => {
      render(
        <ValidateGameModal
          assignment={createMockAssignment()}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      )
      // Home Roster panel shows team name and empty roster message
      expect(screen.getByText('VBC Zürich')).toBeInTheDocument()
      expect(screen.getByText('No players in roster')).toBeInTheDocument()
    })

    it('shows Cancel button on first step', () => {
      render(
        <ValidateGameModal
          assignment={createMockAssignment()}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      )
      expect(screen.getByRole('button', { name: /Cancel/i, hidden: true })).toBeInTheDocument()
    })

    it('shows Validate button on first step', () => {
      render(
        <ValidateGameModal
          assignment={createMockAssignment()}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      )
      expect(screen.getByRole('button', { name: /Validate/i, hidden: true })).toBeInTheDocument()
    })

    it('advances to Away Roster panel when Validate is clicked', async () => {
      render(
        <ValidateGameModal
          assignment={createMockAssignment()}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      )

      fireEvent.click(screen.getByRole('button', { name: /Validate/i, hidden: true }))

      await waitFor(() => {
        // Away Roster panel shows team name
        expect(screen.getByText('VBC Basel')).toBeInTheDocument()
      })
    })

    it('shows Previous button after first step', async () => {
      render(
        <ValidateGameModal
          assignment={createMockAssignment()}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      )

      // Go to step 2
      fireEvent.click(screen.getByRole('button', { name: /Validate/i, hidden: true }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Previous/i, hidden: true })).toBeInTheDocument()
      })
    })

    it('goes back to Home Roster when Previous is clicked from step 2', async () => {
      render(
        <ValidateGameModal
          assignment={createMockAssignment()}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      )

      // Go to step 2
      fireEvent.click(screen.getByRole('button', { name: /Validate/i, hidden: true }))

      await waitFor(() => {
        expect(screen.getByText('VBC Basel')).toBeInTheDocument()
      })

      // Go back to step 1
      fireEvent.click(screen.getByRole('button', { name: /Previous/i, hidden: true }))

      await waitFor(() => {
        expect(screen.getByText('VBC Zürich')).toBeInTheDocument()
        expect(screen.getByText('No players in roster')).toBeInTheDocument()
      })
    })

    it('shows Scorer panel on step 3', async () => {
      render(
        <ValidateGameModal
          assignment={createMockAssignment()}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      )

      // Navigate to step 3
      fireEvent.click(screen.getByRole('button', { name: /Validate/i, hidden: true }))
      await waitFor(() => expect(screen.getByText('Step 2 of 4')).toBeInTheDocument())

      fireEvent.click(screen.getByRole('button', { name: /Validate/i, hidden: true }))
      await waitFor(() => expect(screen.getByText('Step 3 of 4')).toBeInTheDocument())

      // ScorerPanel now shows search input and no-selection message
      expect(screen.getByPlaceholderText('Search scorer by name...')).toBeInTheDocument()
      expect(screen.getByText(/No scorer selected/)).toBeInTheDocument()
    })

    it('shows Scoresheet panel and Finish button on step 4', async () => {
      render(
        <ValidateGameModal
          assignment={createMockAssignment()}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      )

      // Navigate to step 4 using step indicator (since Validate on step 3 is disabled without scorer)
      // Use exact match to avoid matching "Scan Scoresheet" button
      const scoresheetStep = screen.getByRole('button', {
        name: 'Scoresheet',
        hidden: true,
      })
      fireEvent.click(scoresheetStep)

      await waitFor(() => expect(screen.getByText('Step 4 of 4')).toBeInTheDocument())

      expect(screen.getByText('Upload Scoresheet')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Finish/i, hidden: true })).toBeInTheDocument()
    })

    it('updates step indicator when navigating', async () => {
      render(
        <ValidateGameModal
          assignment={createMockAssignment()}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      )

      expect(screen.getByText('Step 1 of 4')).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: /Validate/i, hidden: true }))
      await waitFor(() => {
        expect(screen.getByText('Step 2 of 4')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /Validate/i, hidden: true }))
      await waitFor(() => {
        expect(screen.getByText('Step 3 of 4')).toBeInTheDocument()
      })
    })
  })

  describe('modal interactions', () => {
    it('calls onClose when Cancel button is clicked on first step', async () => {
      render(
        <ValidateGameModal
          assignment={createMockAssignment()}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      )

      fireEvent.click(screen.getByRole('button', { name: /Cancel/i, hidden: true }))

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled()
      })
    })

    it('calls onClose when Escape key is pressed', async () => {
      render(
        <ValidateGameModal
          assignment={createMockAssignment()}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      )

      fireEvent.keyDown(document, { key: 'Escape' })

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled()
      })
    })

    it('closes when clicking backdrop', async () => {
      render(
        <ValidateGameModal
          assignment={createMockAssignment()}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      )

      // Click on backdrop (parent of dialog)
      const backdrop = screen.getByRole('dialog', {
        hidden: true,
      }).parentElement
      fireEvent.click(backdrop!)

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled()
      })
    })

    it('does not close when clicking inside the modal', () => {
      render(
        <ValidateGameModal
          assignment={createMockAssignment()}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      )

      const dialog = screen.getByRole('dialog', { hidden: true })
      fireEvent.click(dialog)
      expect(mockOnClose).not.toHaveBeenCalled()
    })

    it('resets to first step when modal is reopened with new key', async () => {
      const assignment = createMockAssignment()
      const Wrapper = createWrapper()
      const { rerender } = render(
        <Wrapper>
          <ValidateGameModal
            key={assignment.__identity}
            assignment={assignment}
            isOpen={true}
            onClose={mockOnClose}
          />
        </Wrapper>
      )

      // Navigate to step 4 using step indicator
      // Use exact match to avoid matching "Scan Scoresheet" button
      const scoresheetStep = screen.getByRole('button', {
        name: 'Scoresheet',
        hidden: true,
      })
      fireEvent.click(scoresheetStep)

      await waitFor(() => expect(screen.getByText('Step 4 of 4')).toBeInTheDocument())

      // Reopen modal with new key (simulates opening for different assignment)
      const newAssignment = createMockAssignment({ __identity: 'new-id' })
      rerender(
        <Wrapper>
          <ValidateGameModal
            key={newAssignment.__identity}
            assignment={newAssignment}
            isOpen={true}
            onClose={mockOnClose}
          />
        </Wrapper>
      )

      // Should be back to step 1 (component remounted due to key change)
      await waitFor(() => {
        expect(screen.getByText('Step 1 of 4')).toBeInTheDocument()
      })
      expect(screen.getByText('VBC Zürich')).toBeInTheDocument()
      expect(screen.getByText('No players in roster')).toBeInTheDocument()
    })
  })

  describe('validation state', () => {
    it('renders Finish button on last step', async () => {
      render(
        <ValidateGameModal
          assignment={createMockAssignment()}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      )

      // Navigate to last step using step indicator
      // Use exact match to avoid matching "Scan Scoresheet" button
      const scoresheetStep = screen.getByRole('button', {
        name: 'Scoresheet',
        hidden: true,
      })
      fireEvent.click(scoresheetStep)

      await waitFor(() => expect(screen.getByText('Step 4 of 4')).toBeInTheDocument())

      expect(screen.getByRole('button', { name: /Finish/i, hidden: true })).toBeInTheDocument()
    })

    it('disables Finish button when previous panels are not validated', async () => {
      render(
        <ValidateGameModal
          assignment={createMockAssignment()}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      )

      // Navigate to last step using step indicator (not Validate button)
      // This allows us to reach the last step without validating previous steps
      // Use exact match to avoid matching "Scan Scoresheet" button
      const scoresheetStep = screen.getByRole('button', {
        name: 'Scoresheet',
        hidden: true,
      })
      fireEvent.click(scoresheetStep)

      await waitFor(() => expect(screen.getByText('Step 4 of 4')).toBeInTheDocument())

      const finishButton = screen.getByRole('button', {
        name: /Finish/i,
        hidden: true,
      })
      expect(finishButton).toBeDisabled()
    })

    it('disables Validate button on scorer panel when no scorer is selected', async () => {
      render(
        <ValidateGameModal
          assignment={createMockAssignment()}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      )

      // Validate first two panels to reach step 3
      fireEvent.click(screen.getByRole('button', { name: /Validate/i, hidden: true }))
      await waitFor(() => expect(screen.getByText('Step 2 of 4')).toBeInTheDocument())

      fireEvent.click(screen.getByRole('button', { name: /Validate/i, hidden: true }))
      await waitFor(() => expect(screen.getByText('Step 3 of 4')).toBeInTheDocument())

      // Validate button should be disabled because no scorer is selected
      const validateButton = screen.getByRole('button', {
        name: /Validate/i,
        hidden: true,
      })
      expect(validateButton).toBeDisabled()
    })

    it('renders both Cancel and Validate buttons on first step', () => {
      render(
        <ValidateGameModal
          assignment={createMockAssignment()}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      )

      expect(screen.getByRole('button', { name: /Cancel/i, hidden: true })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Validate/i, hidden: true })).toBeInTheDocument()
    })
  })

  describe('validated state from assignment data', () => {
    it('shows validated mode when assignment has closedAt even if game details query is stale', () => {
      // Simulate: game details query returns stale data (isValidated: false)
      // but the assignment list already has closedAt set (validated externally on volleymanager)
      vi.mocked(useValidationStateModule.useValidationState).mockReturnValue({
        state: {
          homeRoster: {
            reviewed: false,
            playerModifications: { added: [], removed: [] },
            coachModifications: { added: new Map(), removed: new Set() },
          },
          awayRoster: {
            reviewed: false,
            playerModifications: { added: [], removed: [] },
            coachModifications: { added: new Map(), removed: new Set() },
          },
          scorer: { selected: null },
          scoresheet: { file: null, uploaded: false },
        },
        isDirty: false,
        completionStatus: {
          homeRoster: false,
          awayRoster: false,
          scorer: false,
          scoresheet: true,
        },
        isAllRequiredComplete: false,
        isValidated: false, // Stale game details - doesn't know it's validated yet
        validatedInfo: null,
        pendingScorer: null,
        scoresheetNotRequired: false,
        setHomeRosterModifications: vi.fn(),
        setAwayRosterModifications: vi.fn(),
        setScorer: vi.fn(),
        setScoresheet: vi.fn(),
        reset: vi.fn(),
        saveProgress: vi.fn().mockResolvedValue(undefined),
        finalizeValidation: vi.fn().mockResolvedValue(undefined),
        isSaving: false,
        isFinalizing: false,
        isLoadingGameDetails: false,
        gameDetailsError: null,
        homeNominationList: null,
        awayNominationList: null,
      })

      // Assignment has closedAt from the assignments list (fresh data)
      const assignmentWithClosedAt = createMockAssignment({
        refereeGame: {
          game: {
            __identity: 'game-1',
            startingDateTime: '2025-12-15T14:00:00Z',
            encounter: {
              teamHome: { name: 'VBC Zürich' },
              teamAway: { name: 'VBC Basel' },
            },
            hall: {
              name: 'Sporthalle Zürich',
              primaryPostalAddress: { city: 'Zürich' },
            },
            scoresheet: {
              closedAt: '2025-12-15T16:00:00Z',
            },
          },
        },
      } as Partial<Assignment>)

      render(
        <ValidateGameModal
          assignment={assignmentWithClosedAt}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      )

      // Should show "Already Validated" banner
      expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument()
      expect(screen.getByText('This game has already been validated')).toBeInTheDocument()

      // Should show validated mode buttons (Next instead of Cancel/Validate on step 1)
      expect(screen.getByRole('button', { name: 'Next', hidden: true })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Cancel', hidden: true })).not.toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: 'Validate', hidden: true })
      ).not.toBeInTheDocument()
    })
  })
})
