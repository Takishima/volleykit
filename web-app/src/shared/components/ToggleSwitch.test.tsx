import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { ToggleSwitch } from './ToggleSwitch'

describe('ToggleSwitch', () => {
  describe('rendering', () => {
    it('renders with correct aria attributes when checked', () => {
      const handleChange = vi.fn()
      render(<ToggleSwitch checked={true} onChange={handleChange} label="Test toggle" />)

      const toggle = screen.getByRole('switch')
      expect(toggle).toHaveAttribute('aria-checked', 'true')
      expect(toggle).toHaveAttribute('aria-label', 'Test toggle')
    })

    it('renders with correct aria attributes when unchecked', () => {
      const handleChange = vi.fn()
      render(<ToggleSwitch checked={false} onChange={handleChange} label="Test toggle" />)

      const toggle = screen.getByRole('switch')
      expect(toggle).toHaveAttribute('aria-checked', 'false')
    })

    it('applies primary variant styles by default', () => {
      const handleChange = vi.fn()
      render(<ToggleSwitch checked={true} onChange={handleChange} label="Test toggle" />)

      const toggle = screen.getByRole('switch')
      expect(toggle).toHaveClass('bg-primary-600')
    })

    it('applies success variant styles when specified', () => {
      const handleChange = vi.fn()
      render(
        <ToggleSwitch
          checked={true}
          onChange={handleChange}
          label="Test toggle"
          variant="success"
        />
      )

      const toggle = screen.getByRole('switch')
      expect(toggle).toHaveClass('bg-success-600')
    })

    it('applies disabled styles when disabled', () => {
      const handleChange = vi.fn()
      render(
        <ToggleSwitch checked={false} onChange={handleChange} label="Test toggle" disabled={true} />
      )

      const toggle = screen.getByRole('switch')
      expect(toggle).toBeDisabled()
      expect(toggle).toHaveClass('cursor-not-allowed')
      expect(toggle).toHaveClass('opacity-50')
    })
  })

  describe('interactions', () => {
    it('calls onChange when clicked', () => {
      const handleChange = vi.fn()
      render(<ToggleSwitch checked={false} onChange={handleChange} label="Test toggle" />)

      const toggle = screen.getByRole('switch')
      fireEvent.click(toggle)

      expect(handleChange).toHaveBeenCalledTimes(1)
    })

    it('does not call onChange when disabled and clicked', () => {
      const handleChange = vi.fn()
      render(
        <ToggleSwitch checked={false} onChange={handleChange} label="Test toggle" disabled={true} />
      )

      const toggle = screen.getByRole('switch')
      fireEvent.click(toggle)

      expect(handleChange).not.toHaveBeenCalled()
    })
  })
})
