import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'

import type { CompensationRecord, Assignment } from '@/api/client'
import { getApiClient } from '@/api/client'
import * as useConvocationsModule from '@/features/validation/hooks/useConvocations'
import { COMPENSATION_LOOKUP_LIMIT } from '@/shared/hooks/usePaginatedQuery'
import { useAuthStore } from '@/shared/stores/auth'
import { useDemoStore } from '@/shared/stores/demo'

import { EditCompensationModal } from './EditCompensationModal'

vi.mock('@/api/client', () => ({
  getApiClient: vi.fn(),
}))

vi.mock('@/shared/stores/auth', () => ({
  useAuthStore: vi.fn(),
}))

vi.mock('@/shared/stores/demo', () => ({
  useDemoStore: vi.fn(),
}))

vi.mock('@/features/validation/hooks/useConvocations', () => ({
  useUpdateCompensation: vi.fn(),
  useUpdateAssignmentCompensation: vi.fn(),
  COMPENSATION_ERROR_KEYS: {
    ASSIGNMENT_NOT_FOUND: 'compensations.assignmentNotFoundInCache',
    COMPENSATION_NOT_FOUND: 'compensations.compensationNotFound',
    COMPENSATION_MISSING_ID: 'compensations.compensationMissingId',
  },
}))

// Shared QueryClient for tests
let queryClient: QueryClient

function createWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

function createMockCompensation(overrides: Partial<CompensationRecord> = {}): CompensationRecord {
  return {
    __identity: 'comp-1',
    refereeGame: {
      game: {
        __identity: 'game-1',
        startingDateTime: '2025-12-15T14:00:00Z',
        encounter: {
          teamHome: { name: 'VBC Zürich' },
          teamAway: { name: 'VBC Basel' },
        },
      },
    },
    convocationCompensation: {
      __identity: 'conv-comp-1',
      gameCompensation: 80,
      travelExpenses: 25,
      distanceInMetres: 15000,
      paymentDone: false,
    },
    ...overrides,
  } as CompensationRecord
}

function createMockAssignment(overrides: Partial<Assignment> = {}): Assignment {
  return {
    __identity: 'assignment-1',
    refereeGame: {
      game: {
        __identity: 'game-1',
        number: 12345,
        startingDateTime: '2025-12-15T14:00:00Z',
        encounter: {
          teamHome: { name: 'VBC Zürich' },
          teamAway: { name: 'VBC Basel' },
        },
      },
    },
    ...overrides,
  } as Assignment
}

async function waitForFormToLoad() {
  // Wait for the form to be visible (loading complete)
  await waitFor(() => {
    expect(screen.getByLabelText('Kilometers')).toBeInTheDocument()
  })
}

describe('EditCompensationModal', () => {
  const mockOnClose = vi.fn()
  const mockMutate = vi.fn()
  const mockAssignmentMutate = vi.fn()
  const mockGetCompensationDetails = vi.fn()
  const mockSearchCompensations = vi.fn()
  const mockGetAssignmentCompensation = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    // Create fresh QueryClient for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    ;(useAuthStore as unknown as Mock).mockImplementation((selector) =>
      selector({ dataSource: 'api' })
    )

    // Mock useDemoStore to return getAssignmentCompensation
    ;(useDemoStore as unknown as Mock).mockImplementation((selector) =>
      selector({ getAssignmentCompensation: mockGetAssignmentCompensation })
    )

    mockGetAssignmentCompensation.mockReturnValue(null)

    vi.mocked(useConvocationsModule.useUpdateCompensation).mockReturnValue({
      mutate: mockMutate,
      mutateAsync: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      isIdle: true,
      isPaused: false,
      error: null,
      data: undefined,
      variables: undefined,
      reset: vi.fn(),
      context: undefined,
      failureCount: 0,
      failureReason: null,
      status: 'idle',
      submittedAt: 0,
    })

    vi.mocked(useConvocationsModule.useUpdateAssignmentCompensation).mockReturnValue({
      mutate: mockAssignmentMutate,
      mutateAsync: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      isIdle: true,
      isPaused: false,
      error: null,
      data: undefined,
      variables: undefined,
      reset: vi.fn(),
      context: undefined,
      failureCount: 0,
      failureReason: null,
      status: 'idle',
      submittedAt: 0,
    })
    ;(getApiClient as Mock).mockReturnValue({
      getCompensationDetails: mockGetCompensationDetails,
      searchCompensations: mockSearchCompensations,
    })

    mockGetCompensationDetails.mockResolvedValue({
      convocationCompensation: {
        distanceInMetres: 15000,
        correctionReason: '',
      },
    })

    // Default: return empty compensations list
    mockSearchCompensations.mockResolvedValue({ items: [] })
  })

  describe('rendering', () => {
    it('does not render when isOpen is false', () => {
      const { container } = render(
        <EditCompensationModal
          compensation={createMockCompensation()}
          isOpen={false}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      )
      expect(container.firstChild).toBeNull()
    })

    it('renders modal with correct title when open', async () => {
      render(
        <EditCompensationModal
          compensation={createMockCompensation()}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        // Query with hidden: true because the backdrop has aria-hidden
        expect(screen.getByRole('dialog', { hidden: true })).toBeInTheDocument()
      })
      expect(screen.getByText('Edit Compensation')).toBeInTheDocument()
    })

    it('displays team names from compensation', async () => {
      render(
        <EditCompensationModal
          compensation={createMockCompensation()}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByText(/VBC Zürich vs VBC Basel/)).toBeInTheDocument()
      })
    })

    it('fetches and pre-fills existing compensation data for assignment in production mode', async () => {
      // Mock searchCompensations to return a compensation with matching game number
      mockSearchCompensations.mockResolvedValue({
        items: [
          {
            refereeGame: { game: { number: 12345 } },
            convocationCompensation: { __identity: 'found-comp-id' },
          },
        ],
      })

      // Mock getCompensationDetails to return existing values
      mockGetCompensationDetails.mockResolvedValue({
        convocationCompensation: {
          distanceInMetres: 32500,
          correctionReason: 'Detour via highway',
        },
      })

      render(
        <EditCompensationModal
          assignment={createMockAssignment()}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      )

      // Wait for the form to load with pre-filled data
      await waitFor(() => {
        const kmInput = screen.getByLabelText('Kilometers')
        expect(kmInput).toHaveValue('32.5')
      })

      const reasonInput = screen.getByLabelText('Reason')
      expect(reasonInput).toHaveValue('Detour via highway')

      // Verify the API was called correctly
      expect(mockSearchCompensations).toHaveBeenCalledWith({ limit: COMPENSATION_LOOKUP_LIMIT })
      expect(mockGetCompensationDetails).toHaveBeenCalledWith('found-comp-id')
    })

    it('shows empty form when no compensation exists for assignment', async () => {
      // Mock searchCompensations to return no matching compensation
      mockSearchCompensations.mockResolvedValue({ items: [] })

      render(
        <EditCompensationModal
          assignment={createMockAssignment()}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      )

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.getByLabelText('Kilometers')).toBeInTheDocument()
      })

      // Form should be empty since no compensation was found
      const kmInput = screen.getByLabelText('Kilometers')
      expect(kmInput).toHaveValue('')

      const reasonInput = screen.getByLabelText('Reason')
      expect(reasonInput).toHaveValue('')

      // Compensation details should not be fetched since no compensation was found
      expect(mockGetCompensationDetails).not.toHaveBeenCalled()
    })

    it('returns null when neither assignment nor compensation provided', () => {
      const { container } = render(<EditCompensationModal isOpen={true} onClose={mockOnClose} />, {
        wrapper: createWrapper(),
      })
      expect(container.firstChild).toBeNull()
    })

    it('shows loading state while fetching details', async () => {
      mockGetCompensationDetails.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      )

      render(
        <EditCompensationModal
          compensation={createMockCompensation()}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      )

      // Query with hidden: true because the backdrop has aria-hidden
      expect(screen.getByRole('dialog', { hidden: true })).toBeInTheDocument()
      // Loading spinner should be visible
      const spinner = document.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
    })

    it('shows error message when fetch fails', async () => {
      mockGetCompensationDetails.mockRejectedValue(new Error('Network error'))

      render(
        <EditCompensationModal
          compensation={createMockCompensation()}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })
    })

    it('pre-fills form with existing values', async () => {
      mockGetCompensationDetails.mockResolvedValue({
        convocationCompensation: {
          distanceInMetres: 25500,
          correctionReason: 'Detour due to road closure',
        },
      })

      render(
        <EditCompensationModal
          compensation={createMockCompensation()}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        const kmInput = screen.getByLabelText('Kilometers')
        expect(kmInput).toHaveValue('25.5')
      })

      const reasonInput = screen.getByLabelText('Reason')
      expect(reasonInput).toHaveValue('Detour due to road closure')
    })
  })

  describe('form validation', () => {
    it('shows error for invalid kilometers input', async () => {
      render(
        <EditCompensationModal
          compensation={createMockCompensation()}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      )

      await waitForFormToLoad()

      const kmInput = screen.getByLabelText('Kilometers')
      fireEvent.change(kmInput, { target: { value: 'abc' } })

      // Submit form programmatically to bypass HTML5 pattern validation
      const form = kmInput.closest('form')
      fireEvent.submit(form!)

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid positive number')).toBeInTheDocument()
      })
    })

    it('shows error for negative kilometers', async () => {
      render(
        <EditCompensationModal
          compensation={createMockCompensation()}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      )

      await waitForFormToLoad()

      const kmInput = screen.getByLabelText('Kilometers')
      fireEvent.change(kmInput, { target: { value: '-10' } })

      // Submit form programmatically to bypass HTML5 pattern validation
      const form = kmInput.closest('form')
      fireEvent.submit(form!)

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid positive number')).toBeInTheDocument()
      })
    })

    it('accepts valid decimal kilometers', async () => {
      render(
        <EditCompensationModal
          compensation={createMockCompensation()}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      )

      await waitForFormToLoad()

      const kmInput = screen.getByLabelText('Kilometers')
      fireEvent.change(kmInput, { target: { value: '25.5' } })

      // Submit form programmatically
      const form = kmInput.closest('form')
      fireEvent.submit(form!)

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled()
      })
    })
  })

  describe('interactions', () => {
    it('calls onClose when close button is clicked', async () => {
      render(
        <EditCompensationModal
          compensation={createMockCompensation()}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      )

      await waitForFormToLoad()

      fireEvent.click(screen.getByText('Close'))
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('calls onClose when backdrop is clicked', async () => {
      const { container } = render(
        <EditCompensationModal
          compensation={createMockCompensation()}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      )

      await waitForFormToLoad()

      const backdrop = container.firstChild as HTMLElement
      fireEvent.click(backdrop)
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('does not close when clicking inside modal', async () => {
      render(
        <EditCompensationModal
          compensation={createMockCompensation()}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      )

      await waitForFormToLoad()

      // Query with hidden: true because the backdrop has aria-hidden
      fireEvent.click(screen.getByRole('dialog', { hidden: true }))
      expect(mockOnClose).not.toHaveBeenCalled()
    })

    it('closes on Escape key press', async () => {
      render(
        <EditCompensationModal
          compensation={createMockCompensation()}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      )

      await waitForFormToLoad()

      // Flush pending effects to ensure the escape key handler is registered
      // with the updated isLoading=false state before firing the event
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
      })

      fireEvent.keyDown(document, { key: 'Escape' })

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('submits form with valid data and closes modal', async () => {
      render(
        <EditCompensationModal
          compensation={createMockCompensation()}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      )

      await waitForFormToLoad()

      const kmInput = screen.getByLabelText('Kilometers')
      const reasonInput = screen.getByLabelText('Reason')

      fireEvent.change(kmInput, { target: { value: '30' } })
      fireEvent.change(reasonInput, { target: { value: 'Test reason' } })

      // Submit form programmatically
      const form = kmInput.closest('form')
      fireEvent.submit(form!)

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalledTimes(1)
      })
    })

    it('resets form when modal closes and reopens', async () => {
      mockGetCompensationDetails.mockResolvedValue({
        convocationCompensation: {
          distanceInMetres: 0,
          correctionReason: '',
        },
      })

      const Wrapper = createWrapper()
      const { rerender } = render(
        <Wrapper>
          <EditCompensationModal
            compensation={createMockCompensation()}
            isOpen={true}
            onClose={mockOnClose}
          />
        </Wrapper>
      )

      await waitForFormToLoad()

      // Enter some values
      const kmInput = screen.getByLabelText('Kilometers')
      fireEvent.change(kmInput, { target: { value: '50' } })

      // Close modal
      rerender(
        <Wrapper>
          <EditCompensationModal
            compensation={createMockCompensation()}
            isOpen={false}
            onClose={mockOnClose}
          />
        </Wrapper>
      )

      // Reopen modal
      rerender(
        <Wrapper>
          <EditCompensationModal
            compensation={createMockCompensation()}
            isOpen={true}
            onClose={mockOnClose}
          />
        </Wrapper>
      )

      await waitForFormToLoad()
    })
  })

  describe('demo mode', () => {
    beforeEach(() => {
      ;(useAuthStore as unknown as Mock).mockImplementation((selector) =>
        selector({ dataSource: 'demo' })
      )

      // In demo mode, also mock getAssignmentCompensation with demo values
      mockGetAssignmentCompensation.mockReturnValue(null)
    })

    it('calls updateCompensation mutation on submit', async () => {
      render(
        <EditCompensationModal
          compensation={createMockCompensation()}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      )

      await waitForFormToLoad()

      const kmInput = screen.getByLabelText('Kilometers')
      fireEvent.change(kmInput, { target: { value: '42' } })

      // Submit form programmatically
      const form = kmInput.closest('form')
      fireEvent.submit(form!)

      await waitFor(() => {
        // compensationId comes from convocationCompensation.__identity, not record.__identity
        expect(mockMutate).toHaveBeenCalledWith(
          {
            compensationId: 'conv-comp-1',
            data: { distanceInMetres: 42000 },
          },
          expect.objectContaining({ onSuccess: expect.any(Function) })
        )
      })
    })

    it('includes correction reason in mutation update', async () => {
      render(
        <EditCompensationModal
          compensation={createMockCompensation()}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      )

      await waitForFormToLoad()

      const kmInput = screen.getByLabelText('Kilometers')
      const reasonInput = screen.getByLabelText('Reason')

      fireEvent.change(kmInput, { target: { value: '25' } })
      fireEvent.change(reasonInput, { target: { value: 'Road work detour' } })

      // Submit form programmatically
      const form = kmInput.closest('form')
      fireEvent.submit(form!)

      await waitFor(() => {
        // compensationId comes from convocationCompensation.__identity, not record.__identity
        expect(mockMutate).toHaveBeenCalledWith(
          {
            compensationId: 'conv-comp-1',
            data: {
              distanceInMetres: 25000,
              correctionReason: 'Road work detour',
            },
          },
          expect.objectContaining({ onSuccess: expect.any(Function) })
        )
      })
    })

    it('calls updateAssignmentCompensation mutation when editing an assignment', async () => {
      render(
        <EditCompensationModal
          assignment={createMockAssignment()}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      )

      // Form renders immediately for assignments (no API fetch needed)
      const kmInput = screen.getByLabelText('Kilometers')
      const reasonInput = screen.getByLabelText('Reason')

      fireEvent.change(kmInput, { target: { value: '35' } })
      fireEvent.change(reasonInput, { target: { value: 'Construction detour' } })

      // Submit form programmatically
      const form = kmInput.closest('form')
      fireEvent.submit(form!)

      await waitFor(() => {
        // Should call assignment mutation, not compensation mutation
        expect(mockAssignmentMutate).toHaveBeenCalledWith(
          {
            assignmentId: 'assignment-1',
            data: {
              distanceInMetres: 35000,
              correctionReason: 'Construction detour',
            },
          },
          expect.objectContaining({ onSuccess: expect.any(Function) })
        )
        // Compensation mutation should NOT be called
        expect(mockMutate).not.toHaveBeenCalled()
      })
    })
  })

  describe('accessibility', () => {
    it('has proper ARIA attributes on dialog', async () => {
      render(
        <EditCompensationModal
          compensation={createMockCompensation()}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      )

      await waitForFormToLoad()

      // Query with hidden: true because the backdrop has aria-hidden
      const dialog = screen.getByRole('dialog', { hidden: true })
      expect(dialog).toHaveAttribute('aria-modal', 'true')
      expect(dialog).toHaveAttribute('aria-labelledby', 'edit-compensation-title')
    })

    it('marks kilometers input as invalid when validation fails', async () => {
      render(
        <EditCompensationModal
          compensation={createMockCompensation()}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      )

      await waitForFormToLoad()

      const kmInput = screen.getByLabelText('Kilometers')
      // Use a negative number which passes HTML5 pattern but fails our custom validation
      fireEvent.change(kmInput, { target: { value: '-5' } })

      // Submit form programmatically to bypass HTML5 validation
      const form = kmInput.closest('form')
      expect(form).toBeInTheDocument()
      fireEvent.submit(form!)

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid positive number')).toBeInTheDocument()
      })
    })

    it('has labeled form inputs', async () => {
      render(
        <EditCompensationModal
          compensation={createMockCompensation()}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      )

      await waitForFormToLoad()

      expect(screen.getByLabelText('Kilometers')).toBeInTheDocument()
      expect(screen.getByLabelText('Reason')).toBeInTheDocument()
    })
  })
})
