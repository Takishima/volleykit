import React from 'react'

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { ModalErrorBoundary } from './ModalErrorBoundary'

// Component that throws an error
function ThrowError({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test modal error')
  }
  return <div>Modal content</div>
}

// Component that throws a network error
function ThrowNetworkError(): React.ReactNode {
  throw new Error('Failed to fetch data')
}

describe('ModalErrorBoundary', () => {
  const mockOnClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    // Suppress console.error for expected errors
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  describe('when no error occurs', () => {
    it('renders children normally', () => {
      render(
        <ModalErrorBoundary modalName="TestModal" onClose={mockOnClose}>
          <div>Modal content</div>
        </ModalErrorBoundary>
      )

      expect(screen.getByText('Modal content')).toBeInTheDocument()
    })

    it('does not show error UI when children render successfully', () => {
      render(
        <ModalErrorBoundary modalName="TestModal" onClose={mockOnClose}>
          <ThrowError shouldThrow={false} />
        </ModalErrorBoundary>
      )

      expect(screen.getByText('Modal content')).toBeInTheDocument()
      expect(screen.queryByTestId('modal-error-boundary')).not.toBeInTheDocument()
    })
  })

  describe('when an application error occurs', () => {
    it('renders error fallback UI', () => {
      render(
        <ModalErrorBoundary modalName="TestModal" onClose={mockOnClose}>
          <ThrowError shouldThrow={true} />
        </ModalErrorBoundary>
      )

      expect(screen.getByTestId('modal-error-boundary')).toBeInTheDocument()
    })

    it('displays application error title', () => {
      render(
        <ModalErrorBoundary modalName="TestModal" onClose={mockOnClose}>
          <ThrowError shouldThrow={true} />
        </ModalErrorBoundary>
      )

      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })

    it('displays application error description', () => {
      render(
        <ModalErrorBoundary modalName="TestModal" onClose={mockOnClose}>
          <ThrowError shouldThrow={true} />
        </ModalErrorBoundary>
      )

      expect(
        screen.getByText('Something went wrong with this action. Please try again.')
      ).toBeInTheDocument()
    })

    it('displays error details in collapsible section', () => {
      render(
        <ModalErrorBoundary modalName="TestModal" onClose={mockOnClose}>
          <ThrowError shouldThrow={true} />
        </ModalErrorBoundary>
      )

      expect(screen.getByText('Error details')).toBeInTheDocument()
      expect(screen.getByText('Test modal error')).toBeInTheDocument()
    })

    it('shows Try Again button', () => {
      render(
        <ModalErrorBoundary modalName="TestModal" onClose={mockOnClose}>
          <ThrowError shouldThrow={true} />
        </ModalErrorBoundary>
      )

      expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument()
    })

    it('shows Close button when onClose is provided', () => {
      render(
        <ModalErrorBoundary modalName="TestModal" onClose={mockOnClose}>
          <ThrowError shouldThrow={true} />
        </ModalErrorBoundary>
      )

      expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()
    })

    it('does not show Close button when onClose is not provided', () => {
      render(
        <ModalErrorBoundary modalName="TestModal">
          <ThrowError shouldThrow={true} />
        </ModalErrorBoundary>
      )

      // Should only have Try Again button
      const buttons = screen.getAllByRole('button')
      expect(buttons).toHaveLength(1)
      expect(buttons[0]).toHaveTextContent('Try Again')
    })

    it('resets error state when Try Again is clicked and children succeed', () => {
      // Use a stateful component to control throwing behavior
      let shouldThrowNow = true

      function ConditionalError() {
        if (shouldThrowNow) {
          throw new Error('Test modal error')
        }
        return <div>Modal content</div>
      }

      const { rerender } = render(
        <ModalErrorBoundary modalName="TestModal" onClose={mockOnClose}>
          <ConditionalError />
        </ModalErrorBoundary>
      )

      expect(screen.getByTestId('modal-error-boundary')).toBeInTheDocument()

      // Change the throwing behavior before clicking Try Again
      shouldThrowNow = false

      fireEvent.click(screen.getByRole('button', { name: 'Try Again' }))

      // Force rerender to pick up the new state
      rerender(
        <ModalErrorBoundary modalName="TestModal" onClose={mockOnClose}>
          <ConditionalError />
        </ModalErrorBoundary>
      )

      expect(screen.getByText('Modal content')).toBeInTheDocument()
    })

    it('calls onClose when Close button is clicked', () => {
      render(
        <ModalErrorBoundary modalName="TestModal" onClose={mockOnClose}>
          <ThrowError shouldThrow={true} />
        </ModalErrorBoundary>
      )

      fireEvent.click(screen.getByRole('button', { name: 'Close' }))

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('when a network error occurs', () => {
    it('displays network error title', () => {
      render(
        <ModalErrorBoundary modalName="TestModal" onClose={mockOnClose}>
          <ThrowNetworkError />
        </ModalErrorBoundary>
      )

      expect(screen.getByText('Connection Problem')).toBeInTheDocument()
    })

    it('displays network error description', () => {
      render(
        <ModalErrorBoundary modalName="TestModal" onClose={mockOnClose}>
          <ThrowNetworkError />
        </ModalErrorBoundary>
      )

      expect(
        screen.getByText('Unable to complete this action due to a connection issue.')
      ).toBeInTheDocument()
    })
  })

  describe('styling', () => {
    it('renders warning icon with aria-hidden', () => {
      const { container } = render(
        <ModalErrorBoundary modalName="TestModal" onClose={mockOnClose}>
          <ThrowError shouldThrow={true} />
        </ModalErrorBoundary>
      )

      const iconContainer = container.querySelector('[aria-hidden="true"]')
      expect(iconContainer).toBeInTheDocument()
    })

    it('has centered layout', () => {
      render(
        <ModalErrorBoundary modalName="TestModal" onClose={mockOnClose}>
          <ThrowError shouldThrow={true} />
        </ModalErrorBoundary>
      )

      const container = screen.getByTestId('modal-error-boundary')
      expect(container).toHaveClass('flex')
      expect(container).toHaveClass('flex-col')
      expect(container).toHaveClass('items-center')
      expect(container).toHaveClass('justify-center')
    })

    it('has compact padding for modal context', () => {
      render(
        <ModalErrorBoundary modalName="TestModal" onClose={mockOnClose}>
          <ThrowError shouldThrow={true} />
        </ModalErrorBoundary>
      )

      const container = screen.getByTestId('modal-error-boundary')
      expect(container).toHaveClass('p-6')
    })
  })
})
