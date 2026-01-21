import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

import { ModalFooter } from './ModalFooter'

describe('ModalFooter', () => {
  describe('rendering', () => {
    it('renders children correctly', () => {
      render(
        <ModalFooter>
          <button>Cancel</button>
          <button>Confirm</button>
        </ModalFooter>
      )

      expect(screen.getByText('Cancel')).toBeInTheDocument()
      expect(screen.getByText('Confirm')).toBeInTheDocument()
    })

    it('renders single child', () => {
      render(
        <ModalFooter>
          <button>OK</button>
        </ModalFooter>
      )

      expect(screen.getByText('OK')).toBeInTheDocument()
    })

    it('renders complex children', () => {
      render(
        <ModalFooter>
          <div data-testid="custom-content">
            <span>Custom</span>
            <button>Action</button>
          </div>
        </ModalFooter>
      )

      expect(screen.getByTestId('custom-content')).toBeInTheDocument()
      expect(screen.getByText('Custom')).toBeInTheDocument()
      expect(screen.getByText('Action')).toBeInTheDocument()
    })
  })

  describe('divider', () => {
    it('does not show divider by default', () => {
      const { container } = render(
        <ModalFooter>
          <button>OK</button>
        </ModalFooter>
      )

      const footer = container.firstChild as HTMLElement
      expect(footer).not.toHaveClass('border-t')
      expect(footer).not.toHaveClass('pt-4')
    })

    it('does not show divider when divider is false', () => {
      const { container } = render(
        <ModalFooter divider={false}>
          <button>OK</button>
        </ModalFooter>
      )

      const footer = container.firstChild as HTMLElement
      expect(footer).not.toHaveClass('border-t')
      expect(footer).not.toHaveClass('pt-4')
    })

    it('shows divider when divider is true', () => {
      const { container } = render(
        <ModalFooter divider>
          <button>OK</button>
        </ModalFooter>
      )

      const footer = container.firstChild as HTMLElement
      expect(footer).toHaveClass('border-t')
      expect(footer).toHaveClass('pt-4')
    })
  })

  describe('layout', () => {
    it('applies flex container with gap to children wrapper', () => {
      const { container } = render(
        <ModalFooter>
          <button>Cancel</button>
          <button>Confirm</button>
        </ModalFooter>
      )

      const flexContainer = container.querySelector('.flex.gap-3')
      expect(flexContainer).toBeInTheDocument()
    })

    it('wraps children in flex container', () => {
      render(
        <ModalFooter>
          <button>Cancel</button>
          <button>Confirm</button>
        </ModalFooter>
      )

      const cancelButton = screen.getByText('Cancel')
      const confirmButton = screen.getByText('Confirm')

      // Both buttons should have the same parent (the flex container)
      expect(cancelButton.parentElement).toBe(confirmButton.parentElement)
      expect(cancelButton.parentElement).toHaveClass('flex')
      expect(cancelButton.parentElement).toHaveClass('gap-3')
    })
  })

  describe('dark mode classes', () => {
    it('includes dark mode border class when divider is true', () => {
      const { container } = render(
        <ModalFooter divider>
          <button>OK</button>
        </ModalFooter>
      )

      const footer = container.firstChild as HTMLElement
      expect(footer).toHaveClass('dark:border-border-default-dark')
    })
  })
})
