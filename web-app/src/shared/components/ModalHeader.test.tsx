import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { ModalHeader } from './ModalHeader'

// Mock useTranslation
vi.mock('@/shared/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'common.close': 'Close',
      }
      return translations[key] || key
    },
  }),
}))

describe('ModalHeader', () => {
  const defaultProps = {
    title: 'Test Modal',
    titleId: 'test-modal-title',
  }

  describe('rendering', () => {
    it('renders the title correctly', () => {
      render(<ModalHeader {...defaultProps} />)
      expect(screen.getByText('Test Modal')).toBeInTheDocument()
    })

    it('renders with the correct title id', () => {
      render(<ModalHeader {...defaultProps} />)
      const title = screen.getByRole('heading', { level: 2 })
      expect(title).toHaveAttribute('id', 'test-modal-title')
    })

    it('renders as an h2 element', () => {
      render(<ModalHeader {...defaultProps} />)
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument()
    })
  })

  describe('title sizes', () => {
    it('applies xl size by default', () => {
      render(<ModalHeader {...defaultProps} />)
      const title = screen.getByRole('heading', { level: 2 })
      expect(title).toHaveClass('text-xl')
    })

    it('applies base size when specified', () => {
      render(<ModalHeader {...defaultProps} titleSize="base" />)
      const title = screen.getByRole('heading', { level: 2 })
      expect(title).toHaveClass('text-base')
    })

    it('applies lg size when specified', () => {
      render(<ModalHeader {...defaultProps} titleSize="lg" />)
      const title = screen.getByRole('heading', { level: 2 })
      expect(title).toHaveClass('text-lg')
    })

    it('applies xl size when specified', () => {
      render(<ModalHeader {...defaultProps} titleSize="xl" />)
      const title = screen.getByRole('heading', { level: 2 })
      expect(title).toHaveClass('text-xl')
    })
  })

  describe('icon', () => {
    it('renders without icon by default', () => {
      const { container } = render(<ModalHeader {...defaultProps} />)
      // The title should not have the flex container with gap-3 when no icon
      const titleContainer = container.querySelector('.flex.items-center.gap-3')
      expect(titleContainer).not.toBeInTheDocument()
    })

    it('renders icon when provided', () => {
      render(<ModalHeader {...defaultProps} icon={<span data-testid="test-icon">Icon</span>} />)
      expect(screen.getByTestId('test-icon')).toBeInTheDocument()
    })

    it('adds flex container styling when icon is provided', () => {
      const { container } = render(
        <ModalHeader {...defaultProps} icon={<span data-testid="test-icon">Icon</span>} />
      )
      const flexContainer = container.querySelector('.flex.items-center.gap-3')
      expect(flexContainer).toBeInTheDocument()
    })
  })

  describe('subtitle', () => {
    it('does not render subtitle by default', () => {
      render(<ModalHeader {...defaultProps} />)
      expect(screen.queryByText('Subtitle text')).not.toBeInTheDocument()
    })

    it('renders subtitle when provided as string', () => {
      render(<ModalHeader {...defaultProps} subtitle="Subtitle text" />)
      expect(screen.getByText('Subtitle text')).toBeInTheDocument()
    })

    it('renders subtitle when provided as ReactNode', () => {
      render(
        <ModalHeader
          {...defaultProps}
          subtitle={<span data-testid="custom-subtitle">Custom Subtitle</span>}
        />
      )
      expect(screen.getByTestId('custom-subtitle')).toBeInTheDocument()
    })

    it('applies correct subtitle styling', () => {
      render(<ModalHeader {...defaultProps} subtitle="Subtitle text" />)
      const subtitle = screen.getByText('Subtitle text')
      expect(subtitle).toHaveClass('text-sm')
      expect(subtitle).toHaveClass('mt-1')
    })
  })

  describe('close button', () => {
    it('does not render close button when onClose is not provided', () => {
      render(<ModalHeader {...defaultProps} />)
      expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument()
    })

    it('renders close button when onClose is provided', () => {
      const handleClose = vi.fn()
      render(<ModalHeader {...defaultProps} onClose={handleClose} />)
      expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()
    })

    it('calls onClose when close button is clicked', () => {
      const handleClose = vi.fn()
      render(<ModalHeader {...defaultProps} onClose={handleClose} />)

      fireEvent.click(screen.getByRole('button', { name: 'Close' }))

      expect(handleClose).toHaveBeenCalledTimes(1)
    })

    it('has correct aria-label for accessibility', () => {
      const handleClose = vi.fn()
      render(<ModalHeader {...defaultProps} onClose={handleClose} />)

      const closeButton = screen.getByRole('button', { name: 'Close' })
      expect(closeButton).toHaveAttribute('aria-label', 'Close')
    })

    it('has type="button" attribute', () => {
      const handleClose = vi.fn()
      render(<ModalHeader {...defaultProps} onClose={handleClose} />)

      const closeButton = screen.getByRole('button', { name: 'Close' })
      expect(closeButton).toHaveAttribute('type', 'button')
    })
  })

  describe('combined props', () => {
    it('renders with all props provided', () => {
      const handleClose = vi.fn()
      render(
        <ModalHeader
          title="Full Modal"
          titleId="full-modal-title"
          titleSize="lg"
          icon={<span data-testid="icon">Icon</span>}
          subtitle="A subtitle"
          onClose={handleClose}
        />
      )

      expect(screen.getByText('Full Modal')).toBeInTheDocument()
      expect(screen.getByTestId('icon')).toBeInTheDocument()
      expect(screen.getByText('A subtitle')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 2 })).toHaveClass('text-lg')
    })
  })
})
