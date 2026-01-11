import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { Button } from './Button'
import { Modal } from './Modal'
import { ModalFooter } from './ModalFooter'
import { ModalHeader } from './ModalHeader'

describe('Modal', () => {
  it('should not render when closed', () => {
    const onClose = vi.fn()

    render(
      <Modal isOpen={false} onClose={onClose} titleId="test-modal-title">
        <ModalHeader title="Test Modal" titleId="test-modal-title" />
        <p>Modal content</p>
      </Modal>
    )

    expect(
      screen.queryByRole('dialog', { name: /test modal/i, hidden: true })
    ).not.toBeInTheDocument()
  })

  it('should render when open', () => {
    const onClose = vi.fn()

    render(
      <Modal isOpen={true} onClose={onClose} titleId="test-modal-title">
        <ModalHeader title="Test Modal" titleId="test-modal-title" />
        <p>Modal content</p>
      </Modal>
    )

    expect(screen.getByRole('dialog', { name: /test modal/i, hidden: true })).toBeInTheDocument()
    expect(screen.getByText('Modal content')).toBeInTheDocument()
  })

  it('should call onClose when Escape key is pressed', () => {
    const onClose = vi.fn()

    render(
      <Modal isOpen={true} onClose={onClose} titleId="test-modal-title">
        <ModalHeader title="Test Modal" titleId="test-modal-title" />
      </Modal>
    )

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(onClose).toHaveBeenCalledOnce()
  })

  it('should not call onClose when Escape key is pressed and closeOnEscape is false', () => {
    const onClose = vi.fn()

    render(
      <Modal isOpen={true} onClose={onClose} titleId="test-modal-title" closeOnEscape={false}>
        <ModalHeader title="Test Modal" titleId="test-modal-title" />
      </Modal>
    )

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(onClose).not.toHaveBeenCalled()
  })

  it('should call onClose when backdrop is clicked', () => {
    const onClose = vi.fn()

    const { container } = render(
      <Modal isOpen={true} onClose={onClose} titleId="test-modal-title">
        <ModalHeader title="Test Modal" titleId="test-modal-title" />
      </Modal>
    )

    const backdrop = container.querySelector('.fixed.inset-0.bg-black') as HTMLElement
    if (backdrop) {
      fireEvent.click(backdrop)
      expect(onClose).toHaveBeenCalledOnce()
    }
  })

  it('should not call onClose when backdrop is clicked and closeOnBackdrop is false', () => {
    const onClose = vi.fn()

    const { container } = render(
      <Modal isOpen={true} onClose={onClose} titleId="test-modal-title" closeOnBackdrop={false}>
        <ModalHeader title="Test Modal" titleId="test-modal-title" />
      </Modal>
    )

    const backdrop = container.querySelector('.fixed.inset-0.bg-black') as HTMLElement
    if (backdrop) {
      fireEvent.click(backdrop)
      expect(onClose).not.toHaveBeenCalled()
    }
  })

  it('should not call onClose when dialog content is clicked', () => {
    const onClose = vi.fn()

    render(
      <Modal isOpen={true} onClose={onClose} titleId="test-modal-title">
        <ModalHeader title="Test Modal" titleId="test-modal-title" />
        <p>Modal content</p>
      </Modal>
    )

    fireEvent.click(screen.getByText('Modal content'))

    expect(onClose).not.toHaveBeenCalled()
  })

  it('should not allow dismissal when isLoading is true', () => {
    const onClose = vi.fn()

    const { container } = render(
      <Modal isOpen={true} onClose={onClose} titleId="test-modal-title" isLoading={true}>
        <ModalHeader title="Test Modal" titleId="test-modal-title" />
      </Modal>
    )

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()

    const backdrop = container.querySelector('.fixed.inset-0.bg-black') as HTMLElement
    if (backdrop) {
      fireEvent.click(backdrop)
      expect(onClose).not.toHaveBeenCalled()
    }
  })

  it('should apply correct size class', () => {
    const onClose = vi.fn()

    const { rerender } = render(
      <Modal isOpen={true} onClose={onClose} titleId="test-modal-title" size="sm">
        <ModalHeader title="Test Modal" titleId="test-modal-title" />
      </Modal>
    )

    expect(screen.getByRole('dialog', { hidden: true })).toHaveClass('max-w-sm')

    rerender(
      <Modal isOpen={true} onClose={onClose} titleId="test-modal-title" size="lg">
        <ModalHeader title="Test Modal" titleId="test-modal-title" />
      </Modal>
    )

    expect(screen.getByRole('dialog', { hidden: true })).toHaveClass('max-w-lg')
  })

  it('should have proper ARIA attributes', () => {
    const onClose = vi.fn()

    render(
      <Modal isOpen={true} onClose={onClose} titleId="my-dialog-title">
        <ModalHeader title="Accessible Dialog" titleId="my-dialog-title" />
      </Modal>
    )

    const dialog = screen.getByRole('dialog', { hidden: true })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-labelledby', 'my-dialog-title')
  })

  it('should clean up event listeners when unmounted', () => {
    const onClose = vi.fn()

    const { unmount } = render(
      <Modal isOpen={true} onClose={onClose} titleId="test-modal-title">
        <ModalHeader title="Test Modal" titleId="test-modal-title" />
      </Modal>
    )

    unmount()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('should clean up event listeners when modal closes', () => {
    const onClose = vi.fn()

    const { rerender } = render(
      <Modal isOpen={true} onClose={onClose} titleId="test-modal-title">
        <ModalHeader title="Test Modal" titleId="test-modal-title" />
      </Modal>
    )

    rerender(
      <Modal isOpen={false} onClose={onClose} titleId="test-modal-title">
        <ModalHeader title="Test Modal" titleId="test-modal-title" />
      </Modal>
    )

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
  })

  describe('focus trap', () => {
    it('should wrap focus from last to first element on Tab', () => {
      const onClose = vi.fn()

      render(
        <Modal isOpen={true} onClose={onClose} titleId="test-modal-title">
          <ModalHeader title="Test Modal" titleId="test-modal-title" />
          <ModalFooter>
            <Button variant="secondary">First</Button>
            <Button variant="primary">Last</Button>
          </ModalFooter>
        </Modal>
      )

      const firstButton = screen.getByRole('button', { name: 'First', hidden: true })
      const lastButton = screen.getByRole('button', { name: 'Last', hidden: true })

      // Focus the last button
      lastButton.focus()
      expect(document.activeElement).toBe(lastButton)

      // Press Tab - should wrap to first button
      fireEvent.keyDown(document, { key: 'Tab' })
      expect(document.activeElement).toBe(firstButton)
    })

    it('should wrap focus from first to last element on Shift+Tab', () => {
      const onClose = vi.fn()

      render(
        <Modal isOpen={true} onClose={onClose} titleId="test-modal-title">
          <ModalHeader title="Test Modal" titleId="test-modal-title" />
          <ModalFooter>
            <Button variant="secondary">First</Button>
            <Button variant="primary">Last</Button>
          </ModalFooter>
        </Modal>
      )

      const firstButton = screen.getByRole('button', { name: 'First', hidden: true })
      const lastButton = screen.getByRole('button', { name: 'Last', hidden: true })

      // Focus the first button
      firstButton.focus()
      expect(document.activeElement).toBe(firstButton)

      // Press Shift+Tab - should wrap to last button
      fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
      expect(document.activeElement).toBe(lastButton)
    })

    it('should not prevent Tab when not on boundary element', () => {
      const onClose = vi.fn()

      render(
        <Modal isOpen={true} onClose={onClose} titleId="test-modal-title">
          <ModalHeader title="Test Modal" titleId="test-modal-title" />
          <ModalFooter>
            <Button variant="secondary">First</Button>
            <Button variant="primary">Middle</Button>
            <Button variant="danger">Last</Button>
          </ModalFooter>
        </Modal>
      )

      const firstButton = screen.getByRole('button', { name: 'First', hidden: true })
      const middleButton = screen.getByRole('button', { name: 'Middle', hidden: true })

      // Focus the first button
      firstButton.focus()
      expect(document.activeElement).toBe(firstButton)

      // Tab should not wrap since we're on the first, not the last
      const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')
      document.dispatchEvent(event)

      // Since we're on first (not last), Tab should not be prevented
      expect(preventDefaultSpy).not.toHaveBeenCalled()

      // Focus middle button and press Shift+Tab
      middleButton.focus()
      const shiftTabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: true,
        bubbles: true,
      })
      const shiftPreventDefaultSpy = vi.spyOn(shiftTabEvent, 'preventDefault')
      document.dispatchEvent(shiftTabEvent)

      // Since we're on middle (not first), Shift+Tab should not be prevented
      expect(shiftPreventDefaultSpy).not.toHaveBeenCalled()
    })
  })
})

describe('ModalHeader', () => {
  it('should render title with correct id', () => {
    render(<ModalHeader title="My Title" titleId="my-title" />)

    const heading = screen.getByRole('heading', { name: 'My Title' })
    expect(heading).toHaveAttribute('id', 'my-title')
  })

  it('should render icon when provided', () => {
    render(
      <ModalHeader
        title="With Icon"
        titleId="icon-title"
        icon={<span data-testid="test-icon">Icon</span>}
      />
    )

    expect(screen.getByTestId('test-icon')).toBeInTheDocument()
  })

  it('should render subtitle when provided', () => {
    render(<ModalHeader title="Main Title" titleId="subtitle-title" subtitle="Subtitle text" />)

    expect(screen.getByText('Subtitle text')).toBeInTheDocument()
  })

  it('should apply correct title size class', () => {
    const { rerender } = render(<ModalHeader title="Title" titleId="title" titleSize="base" />)

    expect(screen.getByRole('heading')).toHaveClass('text-base')

    rerender(<ModalHeader title="Title" titleId="title" titleSize="lg" />)
    expect(screen.getByRole('heading')).toHaveClass('text-lg')

    rerender(<ModalHeader title="Title" titleId="title" titleSize="xl" />)
    expect(screen.getByRole('heading')).toHaveClass('text-xl')
  })
})

describe('ModalFooter', () => {
  it('should render children', () => {
    render(
      <ModalFooter>
        <Button variant="secondary">Cancel</Button>
        <Button variant="primary">Confirm</Button>
      </ModalFooter>
    )

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument()
  })

  it('should render divider when divider prop is true', () => {
    const { container } = render(
      <ModalFooter divider>
        <Button variant="primary">Action</Button>
      </ModalFooter>
    )

    expect(container.firstChild).toHaveClass('border-t')
  })

  it('should not render divider when divider prop is false', () => {
    const { container } = render(
      <ModalFooter divider={false}>
        <Button variant="primary">Action</Button>
      </ModalFooter>
    )

    expect(container.firstChild).not.toHaveClass('border-t')
  })
})
