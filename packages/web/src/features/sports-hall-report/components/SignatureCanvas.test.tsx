import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { SignatureCanvas } from './SignatureCanvas'

// Mock signature_pad
const mockOn = vi.fn()
const mockOff = vi.fn()
const mockClear = vi.fn()
const mockIsEmpty = vi.fn().mockReturnValue(true)
const mockToDataURL = vi.fn().mockReturnValue('data:image/png;base64,test')
const mockToData = vi.fn().mockReturnValue([])
const mockFromData = vi.fn()
const mockAddEventListener = vi.fn()

vi.mock('signature_pad', () => {
  function MockSignaturePad() {
    return {
      on: mockOn,
      off: mockOff,
      clear: mockClear,
      isEmpty: mockIsEmpty,
      toDataURL: mockToDataURL,
      toData: mockToData,
      fromData: mockFromData,
      addEventListener: mockAddEventListener,
    }
  }
  return { default: MockSignaturePad }
})

// Mock useTranslation
vi.mock('@/shared/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'common.cancel': 'Cancel',
        'pdf.wizard.signature.title': 'Sign',
        'pdf.wizard.signature.clear': 'Clear',
        'pdf.wizard.signature.done': 'Done',
        'pdf.wizard.signature.drawHint': 'Draw your signature',
        'pdf.wizard.signature.rotateLandscape': 'Rotate to landscape',
      }
      return translations[key] ?? key
    },
  }),
}))

// Mock matchMedia for orientation
const mockMatchMedia = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()

  // Default to landscape mode
  mockMatchMedia.mockImplementation((query: string) => ({
    matches: query === '(orientation: portrait)' ? false : true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
  window.matchMedia = mockMatchMedia
})

describe('SignatureCanvas', () => {
  const defaultProps = {
    onComplete: vi.fn(),
    onCancel: vi.fn(),
  }

  it('renders the signature dialog with correct ARIA attributes', () => {
    render(<SignatureCanvas {...defaultProps} />)

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-label', 'Sign')
  })

  it('renders Cancel, Clear, and Done buttons', () => {
    render(<SignatureCanvas {...defaultProps} />)

    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /done/i })).toBeInTheDocument()
  })

  it('disables Clear and Done buttons when canvas is empty', () => {
    render(<SignatureCanvas {...defaultProps} />)

    expect(screen.getByRole('button', { name: /clear/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /done/i })).toBeDisabled()
  })

  it('calls onCancel when Cancel button is clicked', () => {
    const onCancel = vi.fn()
    render(<SignatureCanvas onComplete={vi.fn()} onCancel={onCancel} />)

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))

    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('calls onCancel when Escape key is pressed', () => {
    const onCancel = vi.fn()
    render(<SignatureCanvas onComplete={vi.fn()} onCancel={onCancel} />)

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('shows draw hint when canvas is empty and in landscape', () => {
    render(<SignatureCanvas {...defaultProps} />)

    expect(screen.getByText('Draw your signature')).toBeInTheDocument()
  })

  it('shows portrait orientation hint when in portrait mode', () => {
    mockMatchMedia.mockImplementation((query: string) => ({
      matches: query === '(orientation: portrait)' ? true : false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))

    render(<SignatureCanvas {...defaultProps} />)

    expect(screen.getByText('Rotate to landscape')).toBeInTheDocument()
  })

  it('locks body scroll when mounted', () => {
    render(<SignatureCanvas {...defaultProps} />)

    expect(document.body.style.overflow).toBe('hidden')
    expect(document.body.style.overscrollBehavior).toBe('none')
  })

  it('restores body scroll when unmounted', () => {
    document.body.style.overflow = 'auto'
    document.body.style.overscrollBehavior = 'auto'

    const { unmount } = render(<SignatureCanvas {...defaultProps} />)

    expect(document.body.style.overflow).toBe('hidden')

    unmount()

    expect(document.body.style.overflow).toBe('auto')
    expect(document.body.style.overscrollBehavior).toBe('auto')
  })

  describe('touch event isolation from PullToRefresh', () => {
    it('stops touchstart propagation on the overlay', () => {
      render(<SignatureCanvas {...defaultProps} />)

      const dialog = screen.getByRole('dialog')
      const event = new TouchEvent('touchstart', {
        bubbles: true,
        cancelable: true,
        touches: [new Touch({ identifier: 0, target: dialog, clientX: 100, clientY: 100 })],
      })
      const stopPropagationSpy = vi.spyOn(event, 'stopPropagation')

      dialog.dispatchEvent(event)

      expect(stopPropagationSpy).toHaveBeenCalled()
    })

    it('stops touchmove propagation on the overlay', () => {
      render(<SignatureCanvas {...defaultProps} />)

      const dialog = screen.getByRole('dialog')
      const event = new TouchEvent('touchmove', {
        bubbles: true,
        cancelable: true,
        touches: [new Touch({ identifier: 0, target: dialog, clientX: 100, clientY: 200 })],
      })
      const stopPropagationSpy = vi.spyOn(event, 'stopPropagation')

      dialog.dispatchEvent(event)

      expect(stopPropagationSpy).toHaveBeenCalled()
    })

    it('stops touchend propagation on the overlay', () => {
      render(<SignatureCanvas {...defaultProps} />)

      const dialog = screen.getByRole('dialog')
      const event = new TouchEvent('touchend', {
        bubbles: true,
        cancelable: true,
        changedTouches: [new Touch({ identifier: 0, target: dialog, clientX: 100, clientY: 200 })],
      })
      const stopPropagationSpy = vi.spyOn(event, 'stopPropagation')

      dialog.dispatchEvent(event)

      expect(stopPropagationSpy).toHaveBeenCalled()
    })

    it('does not propagate touch events to parent PullToRefresh handlers', () => {
      const parentTouchStart = vi.fn()
      const parentTouchMove = vi.fn()
      const parentTouchEnd = vi.fn()

      render(
        <div
          onTouchStart={parentTouchStart}
          onTouchMove={parentTouchMove}
          onTouchEnd={parentTouchEnd}
        >
          <SignatureCanvas {...defaultProps} />
        </div>
      )

      const dialog = screen.getByRole('dialog')

      // Simulate a drawing gesture (touchstart → touchmove → touchend)
      fireEvent.touchStart(dialog, {
        touches: [{ clientX: 100, clientY: 100, identifier: 0 }],
      })
      fireEvent.touchMove(dialog, {
        touches: [{ clientX: 100, clientY: 200, identifier: 0 }],
      })
      fireEvent.touchEnd(dialog, {
        changedTouches: [{ clientX: 100, clientY: 200, identifier: 0 }],
      })

      // None of these should reach the parent (simulating PullToRefresh)
      expect(parentTouchStart).not.toHaveBeenCalled()
      expect(parentTouchMove).not.toHaveBeenCalled()
      expect(parentTouchEnd).not.toHaveBeenCalled()
    })
  })
})
