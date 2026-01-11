import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { CalendarErrorModal } from './CalendarErrorModal'

describe('CalendarErrorModal', () => {
  it('should not render when closed', () => {
    const onAcknowledge = vi.fn()

    render(<CalendarErrorModal isOpen={false} errorType="network" onAcknowledge={onAcknowledge} />)

    expect(
      screen.queryByRole('dialog', { name: /calendar error/i, hidden: true })
    ).not.toBeInTheDocument()
  })

  it('should render when open', () => {
    const onAcknowledge = vi.fn()

    render(<CalendarErrorModal isOpen={true} errorType="network" onAcknowledge={onAcknowledge} />)

    expect(
      screen.getByRole('dialog', { name: /calendar error/i, hidden: true })
    ).toBeInTheDocument()
  })

  it('should display network error message', () => {
    const onAcknowledge = vi.fn()

    render(<CalendarErrorModal isOpen={true} errorType="network" onAcknowledge={onAcknowledge} />)

    expect(screen.getByText(/unable to load your calendar/i)).toBeInTheDocument()
  })

  it('should display invalid code error message', () => {
    const onAcknowledge = vi.fn()

    render(
      <CalendarErrorModal isOpen={true} errorType="invalidCode" onAcknowledge={onAcknowledge} />
    )

    expect(screen.getByText(/calendar code is invalid or has expired/i)).toBeInTheDocument()
  })

  it('should display parse error message', () => {
    const onAcknowledge = vi.fn()

    render(<CalendarErrorModal isOpen={true} errorType="parse" onAcknowledge={onAcknowledge} />)

    expect(screen.getByText(/some calendar data could not be read/i)).toBeInTheDocument()
  })

  it('should call onAcknowledge when OK button is clicked', () => {
    const onAcknowledge = vi.fn()

    render(<CalendarErrorModal isOpen={true} errorType="network" onAcknowledge={onAcknowledge} />)

    fireEvent.click(screen.getByRole('button', { name: /ok/i, hidden: true }))

    expect(onAcknowledge).toHaveBeenCalledOnce()
  })

  it('should call onAcknowledge when Escape key is pressed', () => {
    const onAcknowledge = vi.fn()

    render(<CalendarErrorModal isOpen={true} errorType="network" onAcknowledge={onAcknowledge} />)

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(onAcknowledge).toHaveBeenCalledOnce()
  })

  it('should display error icon', () => {
    const onAcknowledge = vi.fn()

    render(<CalendarErrorModal isOpen={true} errorType="network" onAcknowledge={onAcknowledge} />)

    // Check that the warning icon container is present
    expect(document.querySelector('.bg-red-100, .bg-red-900')).toBeInTheDocument()
  })

  it('should clean up event listener when modal closes', () => {
    const onAcknowledge = vi.fn()

    const { rerender } = render(
      <CalendarErrorModal isOpen={true} errorType="network" onAcknowledge={onAcknowledge} />
    )

    // Close the modal
    rerender(
      <CalendarErrorModal isOpen={false} errorType="network" onAcknowledge={onAcknowledge} />
    )

    // Escape key should not trigger onAcknowledge after modal is closed
    fireEvent.keyDown(document, { key: 'Escape' })

    expect(onAcknowledge).not.toHaveBeenCalled()
  })
})
