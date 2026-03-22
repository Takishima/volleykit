import React from 'react'

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { PageErrorBoundary } from './PageErrorBoundary'

// Mock window.location for navigation tests
Object.defineProperty(window, 'location', {
  value: { href: '' },
  writable: true,
})

// Component that throws an error
function ThrowError({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test application error')
  }
  return <div>Child content</div>
}

// Component that throws a network error
function ThrowNetworkError(): React.ReactNode {
  throw new Error('Failed to fetch data')
}

describe('PageErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset location.href before each test
    window.location.href = ''
    // Suppress console.error for expected errors
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  describe('when no error occurs', () => {
    it('renders children normally', () => {
      render(
        <PageErrorBoundary pageName="TestPage">
          <div>Child content</div>
        </PageErrorBoundary>
      )

      expect(screen.getByText('Child content')).toBeInTheDocument()
    })

    it('does not show error UI when children render successfully', () => {
      render(
        <PageErrorBoundary pageName="TestPage">
          <ThrowError shouldThrow={false} />
        </PageErrorBoundary>
      )

      expect(screen.getByText('Child content')).toBeInTheDocument()
      expect(screen.queryByTestId('page-error-boundary')).not.toBeInTheDocument()
    })
  })

  describe('when an application error occurs', () => {
    it('renders error fallback UI', () => {
      render(
        <PageErrorBoundary pageName="TestPage">
          <ThrowError shouldThrow={true} />
        </PageErrorBoundary>
      )

      expect(screen.getByTestId('page-error-boundary')).toBeInTheDocument()
    })

    it('displays application error title', () => {
      render(
        <PageErrorBoundary pageName="TestPage">
          <ThrowError shouldThrow={true} />
        </PageErrorBoundary>
      )

      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })

    it('displays application error description', () => {
      render(
        <PageErrorBoundary pageName="TestPage">
          <ThrowError shouldThrow={true} />
        </PageErrorBoundary>
      )

      expect(
        screen.getByText(
          'This page encountered an error. You can try again or return to the home page.'
        )
      ).toBeInTheDocument()
    })

    it('displays error details in collapsible section', () => {
      render(
        <PageErrorBoundary pageName="TestPage">
          <ThrowError shouldThrow={true} />
        </PageErrorBoundary>
      )

      expect(screen.getByText('Error details')).toBeInTheDocument()
      expect(screen.getByText('Test application error')).toBeInTheDocument()
    })

    it('shows Try Again button', () => {
      render(
        <PageErrorBoundary pageName="TestPage">
          <ThrowError shouldThrow={true} />
        </PageErrorBoundary>
      )

      expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument()
    })

    it('shows Go Home button', () => {
      render(
        <PageErrorBoundary pageName="TestPage">
          <ThrowError shouldThrow={true} />
        </PageErrorBoundary>
      )

      expect(screen.getByRole('button', { name: /Go Home/i })).toBeInTheDocument()
    })

    it('resets error state when Try Again is clicked and children succeed', () => {
      // Use a stateful component to control throwing behavior
      let shouldThrowNow = true

      function ConditionalError() {
        if (shouldThrowNow) {
          throw new Error('Test application error')
        }
        return <div>Child content</div>
      }

      const { rerender } = render(
        <PageErrorBoundary pageName="TestPage">
          <ConditionalError />
        </PageErrorBoundary>
      )

      expect(screen.getByTestId('page-error-boundary')).toBeInTheDocument()

      // Change the throwing behavior before clicking Try Again
      shouldThrowNow = false

      fireEvent.click(screen.getByRole('button', { name: 'Try Again' }))

      // Force rerender to pick up the new state
      rerender(
        <PageErrorBoundary pageName="TestPage">
          <ConditionalError />
        </PageErrorBoundary>
      )

      expect(screen.getByText('Child content')).toBeInTheDocument()
    })

    it('navigates to home when Go Home is clicked', () => {
      render(
        <PageErrorBoundary pageName="TestPage">
          <ThrowError shouldThrow={true} />
        </PageErrorBoundary>
      )

      fireEvent.click(screen.getByRole('button', { name: /Go Home/i }))

      expect(window.location.href).toBe('/')
    })
  })

  describe('when a network error occurs', () => {
    it('displays network error title', () => {
      render(
        <PageErrorBoundary pageName="TestPage">
          <ThrowNetworkError />
        </PageErrorBoundary>
      )

      expect(screen.getByText('Connection Problem')).toBeInTheDocument()
    })

    it('displays network error description', () => {
      render(
        <PageErrorBoundary pageName="TestPage">
          <ThrowNetworkError />
        </PageErrorBoundary>
      )

      expect(
        screen.getByText(
          'Unable to load this page due to a connection issue. Please check your internet connection.'
        )
      ).toBeInTheDocument()
    })
  })

  describe('styling', () => {
    it('renders warning icon with aria-hidden', () => {
      const { container } = render(
        <PageErrorBoundary pageName="TestPage">
          <ThrowError shouldThrow={true} />
        </PageErrorBoundary>
      )

      const iconContainer = container.querySelector('[aria-hidden="true"]')
      expect(iconContainer).toBeInTheDocument()
    })

    it('has centered layout', () => {
      render(
        <PageErrorBoundary pageName="TestPage">
          <ThrowError shouldThrow={true} />
        </PageErrorBoundary>
      )

      const container = screen.getByTestId('page-error-boundary')
      expect(container).toHaveClass('flex')
      expect(container).toHaveClass('flex-col')
      expect(container).toHaveClass('items-center')
      expect(container).toHaveClass('justify-center')
    })
  })
})
