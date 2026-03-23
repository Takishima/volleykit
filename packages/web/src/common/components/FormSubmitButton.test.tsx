import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { FormSubmitButton } from './FormSubmitButton'

// Mock useFormStatus from react-dom
const mockUseFormStatus = vi.fn()
vi.mock('react-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-dom')>()
  return {
    ...actual,
    useFormStatus: () => mockUseFormStatus(),
  }
})

describe('FormSubmitButton', () => {
  it('should render as a submit button', () => {
    mockUseFormStatus.mockReturnValue({ pending: false })

    render(<FormSubmitButton variant="primary">Save</FormSubmitButton>)

    const button = screen.getByRole('button', { name: 'Save' })
    expect(button).toHaveAttribute('type', 'submit')
  })

  it('should show loading state when form is pending', () => {
    mockUseFormStatus.mockReturnValue({ pending: true })

    render(<FormSubmitButton variant="primary">Save</FormSubmitButton>)

    const button = screen.getByRole('button', { name: 'Save' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
  })

  it('should be enabled when form is not pending', () => {
    mockUseFormStatus.mockReturnValue({ pending: false })

    render(<FormSubmitButton variant="primary">Save</FormSubmitButton>)

    const button = screen.getByRole('button', { name: 'Save' })
    expect(button).not.toBeDisabled()
  })

  it('should respect additional disabled prop', () => {
    mockUseFormStatus.mockReturnValue({ pending: false })

    render(
      <FormSubmitButton variant="primary" disabled>
        Save
      </FormSubmitButton>
    )

    const button = screen.getByRole('button', { name: 'Save' })
    expect(button).toBeDisabled()
  })

  it('should pass variant and other props to Button', () => {
    mockUseFormStatus.mockReturnValue({ pending: false })

    render(
      <FormSubmitButton variant="success" className="flex-1">
        Confirm
      </FormSubmitButton>
    )

    const button = screen.getByRole('button', { name: 'Confirm' })
    expect(button).toHaveClass('flex-1')
  })
})
