import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import type { WizardStep } from '@/shared/hooks/useWizardNavigation'

import { WizardStepIndicator } from './WizardStepIndicator'

vi.mock('@/shared/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    locale: 'en',
  }),
}))

const mockSteps: WizardStep[] = [
  { id: 'step1', label: 'Step 1' },
  { id: 'step2', label: 'Step 2' },
  { id: 'step3', label: 'Step 3', isOptional: true },
  { id: 'step4', label: 'Step 4' },
]

describe('WizardStepIndicator', () => {
  it('renders all steps with correct numbers', () => {
    render(
      <WizardStepIndicator steps={mockSteps} currentStepIndex={0} stepsMarkedDone={new Set()} />
    )

    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
  })

  it('marks current step with aria-current', () => {
    render(
      <WizardStepIndicator steps={mockSteps} currentStepIndex={1} stepsMarkedDone={new Set()} />
    )

    const buttons = screen.getAllByRole('button')
    expect(buttons[0]).not.toHaveAttribute('aria-current')
    expect(buttons[1]).toHaveAttribute('aria-current', 'step')
    expect(buttons[2]).not.toHaveAttribute('aria-current')
  })

  it('shows checkmark for completed non-optional steps', () => {
    render(
      <WizardStepIndicator
        steps={mockSteps}
        currentStepIndex={3}
        stepsMarkedDone={new Set([0, 1])}
      />
    )

    // Completed steps should show checkmark (via Check icon)
    const buttons = screen.getAllByRole('button')

    // Step 1 (index 0) is marked done, not optional, not current - should show checkmark
    expect(buttons[0]!.querySelector('svg')).toBeInTheDocument()
    // Step 2 (index 1) is marked done, not optional, not current - should show checkmark
    expect(buttons[1]!.querySelector('svg')).toBeInTheDocument()
    // Step 3 (index 2) is optional - no checkmark even if marked done
    expect(buttons[2]).toHaveTextContent('3')
    // Step 4 (index 3) is current - shows number, not checkmark
    expect(buttons[3]).toHaveTextContent('4')
  })

  it('does not show checkmark for optional steps even when marked done', () => {
    render(
      <WizardStepIndicator
        steps={mockSteps}
        currentStepIndex={3}
        stepsMarkedDone={new Set([0, 1, 2])} // All done including optional step 3
      />
    )

    const buttons = screen.getAllByRole('button')
    // Optional step (index 2) should show number, not checkmark
    expect(buttons[2]).toHaveTextContent('3')
    expect(buttons[2]!.querySelector('svg')).not.toBeInTheDocument()
  })

  it('shows number instead of checkmark for current step even if marked done', () => {
    render(
      <WizardStepIndicator
        steps={mockSteps}
        currentStepIndex={1}
        stepsMarkedDone={new Set([0, 1])}
      />
    )

    const buttons = screen.getAllByRole('button')
    // Current step (index 1) should show number even though it's marked done
    expect(buttons[1]).toHaveTextContent('2')
  })

  it('calls onStepClick when clickable and step is clicked', () => {
    const handleStepClick = vi.fn()
    render(
      <WizardStepIndicator
        steps={mockSteps}
        currentStepIndex={0}
        stepsMarkedDone={new Set()}
        onStepClick={handleStepClick}
        clickable={true}
      />
    )

    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[2]!)

    expect(handleStepClick).toHaveBeenCalledWith(2)
  })

  it('does not call onStepClick when clickable is false', () => {
    const handleStepClick = vi.fn()
    render(
      <WizardStepIndicator
        steps={mockSteps}
        currentStepIndex={0}
        stepsMarkedDone={new Set()}
        onStepClick={handleStepClick}
        clickable={false}
      />
    )

    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[2]!)

    expect(handleStepClick).not.toHaveBeenCalled()
  })

  it('handles Enter key press when clickable', () => {
    const handleStepClick = vi.fn()
    render(
      <WizardStepIndicator
        steps={mockSteps}
        currentStepIndex={0}
        stepsMarkedDone={new Set()}
        onStepClick={handleStepClick}
        clickable={true}
      />
    )

    const buttons = screen.getAllByRole('button')
    fireEvent.keyDown(buttons[1]!, { key: 'Enter' })

    expect(handleStepClick).toHaveBeenCalledWith(1)
  })

  it('handles Space key press when clickable', () => {
    const handleStepClick = vi.fn()
    render(
      <WizardStepIndicator
        steps={mockSteps}
        currentStepIndex={0}
        stepsMarkedDone={new Set()}
        onStepClick={handleStepClick}
        clickable={true}
      />
    )

    const buttons = screen.getAllByRole('button')
    fireEvent.keyDown(buttons[1]!, { key: ' ' })

    expect(handleStepClick).toHaveBeenCalledWith(1)
  })

  it('does not trigger callback on keyboard press when not clickable', () => {
    const handleStepClick = vi.fn()
    render(
      <WizardStepIndicator
        steps={mockSteps}
        currentStepIndex={0}
        stepsMarkedDone={new Set()}
        onStepClick={handleStepClick}
        clickable={false}
      />
    )

    const buttons = screen.getAllByRole('button')
    fireEvent.keyDown(buttons[1]!, { key: 'Enter' })
    fireEvent.keyDown(buttons[1]!, { key: ' ' })

    expect(handleStepClick).not.toHaveBeenCalled()
  })

  it('has aria-disabled when not clickable', () => {
    render(
      <WizardStepIndicator
        steps={mockSteps}
        currentStepIndex={0}
        stepsMarkedDone={new Set()}
        clickable={false}
      />
    )

    const buttons = screen.getAllByRole('button')
    buttons.forEach((button) => {
      expect(button).toHaveAttribute('aria-disabled', 'true')
    })
  })

  it('does not have aria-disabled when clickable', () => {
    render(
      <WizardStepIndicator
        steps={mockSteps}
        currentStepIndex={0}
        stepsMarkedDone={new Set()}
        clickable={true}
      />
    )

    const buttons = screen.getAllByRole('button')
    buttons.forEach((button) => {
      expect(button).toHaveAttribute('aria-disabled', 'false')
    })
  })

  it('has navigation role with aria-label', () => {
    render(
      <WizardStepIndicator steps={mockSteps} currentStepIndex={0} stepsMarkedDone={new Set()} />
    )

    const nav = screen.getByRole('navigation')
    expect(nav).toHaveAttribute('aria-label', 'common.wizardProgress')
  })

  it('includes step label in aria-label for each button', () => {
    render(
      <WizardStepIndicator steps={mockSteps} currentStepIndex={1} stepsMarkedDone={new Set([0])} />
    )

    const buttons = screen.getAllByRole('button')

    // Non-current, completed step
    expect(buttons[0]).toHaveAttribute('aria-label', 'Step 1 common.stepIndicatorDone')
    // Current step
    expect(buttons[1]).toHaveAttribute('aria-label', 'Step 2 common.stepIndicatorCurrent')
    // Not current, not completed
    expect(buttons[2]).toHaveAttribute('aria-label', 'Step 3')
  })

  it('renders connector lines between steps', () => {
    const { container } = render(
      <WizardStepIndicator steps={mockSteps} currentStepIndex={2} stepsMarkedDone={new Set()} />
    )

    // There should be 3 connector lines (between 4 steps)
    const connectors = container.querySelectorAll('.w-8.h-0\\.5')
    expect(connectors).toHaveLength(3)
  })

  it('applies primary color to connector lines up to and including current step', () => {
    const { container } = render(
      <WizardStepIndicator steps={mockSteps} currentStepIndex={2} stepsMarkedDone={new Set()} />
    )

    const connectors = container.querySelectorAll('.w-8.h-0\\.5')

    // First connector (before step 2) - should be primary
    expect(connectors[0]).toHaveClass('bg-primary-500')
    // Second connector (before step 3) - should be primary (step 3 is current)
    expect(connectors[1]).toHaveClass('bg-primary-500')
    // Third connector (before step 4) - should not be primary
    expect(connectors[2]).not.toHaveClass('bg-primary-500')
  })

  it('defaults clickable to false', () => {
    const handleStepClick = vi.fn()
    render(
      <WizardStepIndicator
        steps={mockSteps}
        currentStepIndex={0}
        stepsMarkedDone={new Set()}
        onStepClick={handleStepClick}
        // clickable prop not provided, should default to false
      />
    )

    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[1]!)

    expect(handleStepClick).not.toHaveBeenCalled()
  })

  it('renders correctly with empty stepsMarkedDone set', () => {
    render(
      <WizardStepIndicator steps={mockSteps} currentStepIndex={0} stepsMarkedDone={new Set()} />
    )

    const buttons = screen.getAllByRole('button')
    // All steps should show numbers, no checkmarks
    expect(buttons[0]).toHaveTextContent('1')
    expect(buttons[1]).toHaveTextContent('2')
    expect(buttons[2]).toHaveTextContent('3')
    expect(buttons[3]).toHaveTextContent('4')
  })

  it('renders single step correctly', () => {
    const singleStep: WizardStep[] = [{ id: 'only', label: 'Only Step' }]

    render(
      <WizardStepIndicator steps={singleStep} currentStepIndex={0} stepsMarkedDone={new Set()} />
    )

    expect(screen.getByText('1')).toBeInTheDocument()
    // No connector lines for single step
    const { container } = render(
      <WizardStepIndicator steps={singleStep} currentStepIndex={0} stepsMarkedDone={new Set()} />
    )
    const connectors = container.querySelectorAll('.w-8.h-0\\.5')
    expect(connectors).toHaveLength(0)
  })
})
