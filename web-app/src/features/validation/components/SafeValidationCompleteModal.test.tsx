import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { SafeValidationCompleteModal } from './SafeValidationCompleteModal'

// Mock useTranslation hook
vi.mock('@/shared/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'settings.safeValidationCompleteTitle': 'Validation Saved',
        'settings.safeValidationCompleteMessage':
          'Your changes have been saved. Please go to VolleyManager to complete the validation.',
        'settings.safeValidationCompleteButton': 'Open VolleyManager',
        'common.close': 'Close',
      }
      return translations[key] || key
    },
  }),
}))

describe('SafeValidationCompleteModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders nothing when not open', () => {
    render(<SafeValidationCompleteModal {...defaultProps} isOpen={false} />)

    expect(screen.queryByText('Validation Saved')).not.toBeInTheDocument()
  })

  it('renders modal title when open', () => {
    render(<SafeValidationCompleteModal {...defaultProps} />)

    expect(screen.getByText('Validation Saved')).toBeInTheDocument()
  })

  it('renders message explaining next steps', () => {
    render(<SafeValidationCompleteModal {...defaultProps} />)

    expect(screen.getByText(/Your changes have been saved/i)).toBeInTheDocument()
  })

  it('renders close button', () => {
    render(<SafeValidationCompleteModal {...defaultProps} />)

    // Modal uses aria-hidden on backdrop, so use hidden: true option
    const buttons = screen.getAllByRole('button', { hidden: true })
    const closeButton = buttons.find((btn) => btn.textContent === 'Close')
    expect(closeButton).toBeInTheDocument()
  })

  it('renders Open VolleyManager button', () => {
    render(<SafeValidationCompleteModal {...defaultProps} />)

    const buttons = screen.getAllByRole('button', { hidden: true })
    const openButton = buttons.find((btn) => btn.textContent === 'Open VolleyManager')
    expect(openButton).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn()

    render(<SafeValidationCompleteModal isOpen={true} onClose={onClose} />)

    const buttons = screen.getAllByRole('button', { hidden: true })
    const closeButton = buttons.find((btn) => btn.textContent === 'Close')
    expect(closeButton).toBeDefined()
    fireEvent.click(closeButton!)

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('opens VolleyManager and closes when Open VolleyManager button is clicked', () => {
    const onClose = vi.fn()
    const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

    render(<SafeValidationCompleteModal isOpen={true} onClose={onClose} />)

    const buttons = screen.getAllByRole('button', { hidden: true })
    const openButton = buttons.find((btn) => btn.textContent === 'Open VolleyManager')
    expect(openButton).toBeDefined()
    fireEvent.click(openButton!)

    expect(windowOpenSpy).toHaveBeenCalledWith(
      'https://volleymanager.volleyball.ch',
      '_blank',
      'noopener,noreferrer'
    )
    expect(onClose).toHaveBeenCalledTimes(1)

    windowOpenSpy.mockRestore()
  })

  it('renders with proper heading structure', () => {
    render(<SafeValidationCompleteModal {...defaultProps} />)

    // The title should be rendered with the correct ID
    const title = screen.getByText('Validation Saved')
    expect(title).toHaveAttribute('id', 'safe-validation-complete-title')
  })

  it('displays success icon container', () => {
    render(<SafeValidationCompleteModal {...defaultProps} />)

    // Check for the success icon container with SVG
    const svgElements = document.querySelectorAll("svg[aria-hidden='true']")
    expect(svgElements.length).toBeGreaterThan(0)
  })
})
