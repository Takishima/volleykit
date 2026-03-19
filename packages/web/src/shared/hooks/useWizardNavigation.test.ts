import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import {
  useWizardNavigation,
  type WizardStep,
  type UseWizardNavigationOptions,
} from './useWizardNavigation'

const createSteps = (count: number, optionalIndices: number[] = []): WizardStep[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `step-${i}`,
    label: `Step ${i + 1}`,
    isOptional: optionalIndices.includes(i),
  }))

describe('useWizardNavigation', () => {
  describe('initial state', () => {
    it('should start at step 0 by default', () => {
      const steps = createSteps(3)
      const { result } = renderHook(() => useWizardNavigation({ steps }))

      expect(result.current.currentStepIndex).toBe(0)
      expect(result.current.currentStep).toEqual(steps[0])
    })

    it('should start at initialStepIndex when provided', () => {
      const steps = createSteps(3)
      const { result } = renderHook(() => useWizardNavigation({ steps, initialStepIndex: 1 }))

      expect(result.current.currentStepIndex).toBe(1)
      expect(result.current.currentStep).toEqual(steps[1])
    })

    it('should clamp initialStepIndex to valid range', () => {
      const steps = createSteps(3)

      // Too high
      const { result: resultHigh } = renderHook(() =>
        useWizardNavigation({ steps, initialStepIndex: 10 })
      )
      expect(resultHigh.current.currentStepIndex).toBe(2) // Last step

      // Negative
      const { result: resultNeg } = renderHook(() =>
        useWizardNavigation({ steps, initialStepIndex: -5 })
      )
      expect(resultNeg.current.currentStepIndex).toBe(0) // First step
    })

    it('should return correct totalSteps', () => {
      const steps = createSteps(5)
      const { result } = renderHook(() => useWizardNavigation({ steps }))

      expect(result.current.totalSteps).toBe(5)
    })

    it('should throw error for empty steps array', () => {
      expect(() => {
        renderHook(() => useWizardNavigation({ steps: [] }))
      }).toThrow('useWizardNavigation: steps array cannot be empty')
    })
  })

  describe('isFirstStep and isLastStep flags', () => {
    it('should set isFirstStep true on first step', () => {
      const steps = createSteps(3)
      const { result } = renderHook(() => useWizardNavigation({ steps }))

      expect(result.current.isFirstStep).toBe(true)
      expect(result.current.isLastStep).toBe(false)
    })

    it('should set isLastStep true on last step', () => {
      const steps = createSteps(3)
      const { result } = renderHook(() => useWizardNavigation({ steps, initialStepIndex: 2 }))

      expect(result.current.isFirstStep).toBe(false)
      expect(result.current.isLastStep).toBe(true)
    })

    it('should set both true for single-step wizard', () => {
      const steps = createSteps(1)
      const { result } = renderHook(() => useWizardNavigation({ steps }))

      expect(result.current.isFirstStep).toBe(true)
      expect(result.current.isLastStep).toBe(true)
    })

    it('should set neither on middle step', () => {
      const steps = createSteps(3)
      const { result } = renderHook(() => useWizardNavigation({ steps, initialStepIndex: 1 }))

      expect(result.current.isFirstStep).toBe(false)
      expect(result.current.isLastStep).toBe(false)
    })
  })

  describe('canGoNext and canGoBack flags', () => {
    it('should allow goNext from first step', () => {
      const steps = createSteps(3)
      const { result } = renderHook(() => useWizardNavigation({ steps }))

      expect(result.current.canGoNext).toBe(true)
      expect(result.current.canGoBack).toBe(false)
    })

    it('should allow goBack from last step', () => {
      const steps = createSteps(3)
      const { result } = renderHook(() => useWizardNavigation({ steps, initialStepIndex: 2 }))

      expect(result.current.canGoNext).toBe(false)
      expect(result.current.canGoBack).toBe(true)
    })

    it('should allow both from middle step', () => {
      const steps = createSteps(3)
      const { result } = renderHook(() => useWizardNavigation({ steps, initialStepIndex: 1 }))

      expect(result.current.canGoNext).toBe(true)
      expect(result.current.canGoBack).toBe(true)
    })

    it('should not allow navigation for single-step wizard', () => {
      const steps = createSteps(1)
      const { result } = renderHook(() => useWizardNavigation({ steps }))

      expect(result.current.canGoNext).toBe(false)
      expect(result.current.canGoBack).toBe(false)
    })
  })

  describe('goNext', () => {
    it('should advance to next step', () => {
      const steps = createSteps(3)
      const { result } = renderHook(() => useWizardNavigation({ steps }))

      act(() => {
        result.current.goNext()
      })

      expect(result.current.currentStepIndex).toBe(1)
      expect(result.current.currentStep).toEqual(steps[1])
    })

    it('should not go past last step', () => {
      const steps = createSteps(3)
      const { result } = renderHook(() => useWizardNavigation({ steps, initialStepIndex: 2 }))

      act(() => {
        result.current.goNext()
      })

      expect(result.current.currentStepIndex).toBe(2)
    })

    it('should call onStepChange when navigating', () => {
      const steps = createSteps(3)
      const onStepChange = vi.fn()
      const { result } = renderHook(() => useWizardNavigation({ steps, onStepChange }))

      act(() => {
        result.current.goNext()
      })

      expect(onStepChange).toHaveBeenCalledWith(0, 1)
    })
  })

  describe('goBack', () => {
    it('should go to previous step', () => {
      const steps = createSteps(3)
      const { result } = renderHook(() => useWizardNavigation({ steps, initialStepIndex: 2 }))

      act(() => {
        result.current.goBack()
      })

      expect(result.current.currentStepIndex).toBe(1)
      expect(result.current.currentStep).toEqual(steps[1])
    })

    it('should not go past first step', () => {
      const steps = createSteps(3)
      const { result } = renderHook(() => useWizardNavigation({ steps }))

      act(() => {
        result.current.goBack()
      })

      expect(result.current.currentStepIndex).toBe(0)
    })

    it('should call onStepChange when navigating back', () => {
      const steps = createSteps(3)
      const onStepChange = vi.fn()
      const { result } = renderHook(() =>
        useWizardNavigation({ steps, initialStepIndex: 2, onStepChange })
      )

      act(() => {
        result.current.goBack()
      })

      expect(onStepChange).toHaveBeenCalledWith(2, 1)
    })
  })

  describe('goToStep', () => {
    it('should jump to specific step', () => {
      const steps = createSteps(5)
      const { result } = renderHook(() => useWizardNavigation({ steps }))

      act(() => {
        result.current.goToStep(3)
      })

      expect(result.current.currentStepIndex).toBe(3)
      expect(result.current.currentStep).toEqual(steps[3])
    })

    it('should clamp to last step when index is too high', () => {
      const steps = createSteps(3)
      const { result } = renderHook(() => useWizardNavigation({ steps }))

      act(() => {
        result.current.goToStep(10)
      })

      expect(result.current.currentStepIndex).toBe(2)
    })

    it('should clamp to first step when index is negative', () => {
      const steps = createSteps(3)
      const { result } = renderHook(() => useWizardNavigation({ steps, initialStepIndex: 1 }))

      act(() => {
        result.current.goToStep(-5)
      })

      expect(result.current.currentStepIndex).toBe(0)
    })

    it('should not call onStepChange when navigating to current step', () => {
      const steps = createSteps(3)
      const onStepChange = vi.fn()
      const { result } = renderHook(() =>
        useWizardNavigation({ steps, initialStepIndex: 1, onStepChange })
      )

      act(() => {
        result.current.goToStep(1)
      })

      expect(onStepChange).not.toHaveBeenCalled()
    })

    it('should call onStepChange with correct indices', () => {
      const steps = createSteps(5)
      const onStepChange = vi.fn()
      const { result } = renderHook(() =>
        useWizardNavigation({ steps, initialStepIndex: 1, onStepChange })
      )

      act(() => {
        result.current.goToStep(4)
      })

      expect(onStepChange).toHaveBeenCalledWith(1, 4)
    })
  })

  describe('resetToStart', () => {
    it('should reset to first step', () => {
      const steps = createSteps(3)
      const { result } = renderHook(() => useWizardNavigation({ steps, initialStepIndex: 2 }))

      act(() => {
        result.current.resetToStart()
      })

      expect(result.current.currentStepIndex).toBe(0)
      expect(result.current.isFirstStep).toBe(true)
    })

    it('should clear stepsMarkedDone', () => {
      const steps = createSteps(3)
      const { result } = renderHook(() => useWizardNavigation({ steps }))

      act(() => {
        result.current.setStepDone(0, true)
        result.current.setStepDone(1, true)
      })

      expect(result.current.stepsMarkedDone.size).toBe(2)

      act(() => {
        result.current.resetToStart()
      })

      expect(result.current.stepsMarkedDone.size).toBe(0)
    })

    it('should maintain stable reference', () => {
      const steps = createSteps(3)
      const { result, rerender } = renderHook(() => useWizardNavigation({ steps }))

      const firstRef = result.current.resetToStart
      rerender()

      expect(result.current.resetToStart).toBe(firstRef)
    })
  })

  describe('setStepDone', () => {
    it('should mark step as done', () => {
      const steps = createSteps(3)
      const { result } = renderHook(() => useWizardNavigation({ steps }))

      expect(result.current.stepsMarkedDone.has(0)).toBe(false)

      act(() => {
        result.current.setStepDone(0, true)
      })

      expect(result.current.stepsMarkedDone.has(0)).toBe(true)
    })

    it('should unmark step when set to false', () => {
      const steps = createSteps(3)
      const { result } = renderHook(() => useWizardNavigation({ steps }))

      act(() => {
        result.current.setStepDone(0, true)
      })
      expect(result.current.stepsMarkedDone.has(0)).toBe(true)

      act(() => {
        result.current.setStepDone(0, false)
      })
      expect(result.current.stepsMarkedDone.has(0)).toBe(false)
    })

    it('should not create new Set reference when marking already-marked step', () => {
      const steps = createSteps(3)
      const { result } = renderHook(() => useWizardNavigation({ steps }))

      act(() => {
        result.current.setStepDone(0, true)
      })
      const setRef = result.current.stepsMarkedDone

      act(() => {
        result.current.setStepDone(0, true)
      })

      expect(result.current.stepsMarkedDone).toBe(setRef)
    })

    it('should not create new Set reference when unmarking already-unmarked step', () => {
      const steps = createSteps(3)
      const { result } = renderHook(() => useWizardNavigation({ steps }))

      const setRef = result.current.stepsMarkedDone

      act(() => {
        result.current.setStepDone(0, false)
      })

      expect(result.current.stepsMarkedDone).toBe(setRef)
    })

    it('should track multiple steps as done', () => {
      const steps = createSteps(5)
      const { result } = renderHook(() => useWizardNavigation({ steps }))

      act(() => {
        result.current.setStepDone(0, true)
        result.current.setStepDone(2, true)
        result.current.setStepDone(4, true)
      })

      expect(result.current.stepsMarkedDone.has(0)).toBe(true)
      expect(result.current.stepsMarkedDone.has(1)).toBe(false)
      expect(result.current.stepsMarkedDone.has(2)).toBe(true)
      expect(result.current.stepsMarkedDone.has(3)).toBe(false)
      expect(result.current.stepsMarkedDone.has(4)).toBe(true)
    })
  })

  describe('allRequiredStepsDone', () => {
    it('should be false when no steps are marked', () => {
      const steps = createSteps(3)
      const { result } = renderHook(() => useWizardNavigation({ steps }))

      expect(result.current.allRequiredStepsDone).toBe(false)
    })

    it('should be true when all steps are marked as done', () => {
      const steps = createSteps(3)
      const { result } = renderHook(() => useWizardNavigation({ steps }))

      act(() => {
        result.current.setStepDone(0, true)
        result.current.setStepDone(1, true)
        result.current.setStepDone(2, true)
      })

      expect(result.current.allRequiredStepsDone).toBe(true)
    })

    it('should ignore optional steps', () => {
      const steps = createSteps(3, [1]) // Step 1 is optional
      const { result } = renderHook(() => useWizardNavigation({ steps }))

      // Mark only required steps (0 and 2)
      act(() => {
        result.current.setStepDone(0, true)
        result.current.setStepDone(2, true)
      })

      expect(result.current.allRequiredStepsDone).toBe(true)
    })

    it('should be false if any required step is not done', () => {
      const steps = createSteps(3, [1]) // Step 1 is optional
      const { result } = renderHook(() => useWizardNavigation({ steps }))

      // Mark only step 0, step 2 is still required
      act(() => {
        result.current.setStepDone(0, true)
      })

      expect(result.current.allRequiredStepsDone).toBe(false)
    })

    it('should be true when all steps are optional and none marked', () => {
      const steps = createSteps(3, [0, 1, 2]) // All optional
      const { result } = renderHook(() => useWizardNavigation({ steps }))

      expect(result.current.allRequiredStepsDone).toBe(true)
    })
  })

  describe('callback stability', () => {
    it('should provide working goNext after step changes', () => {
      const steps = createSteps(3)
      const { result } = renderHook(() => useWizardNavigation({ steps }))

      // Navigate forward
      act(() => {
        result.current.goNext()
      })

      expect(result.current.currentStepIndex).toBe(1)

      // goNext should still work after step change
      act(() => {
        result.current.goNext()
      })

      expect(result.current.currentStepIndex).toBe(2)
    })

    it('should maintain stable setStepDone reference', () => {
      const steps = createSteps(3)
      const { result, rerender } = renderHook(() => useWizardNavigation({ steps }))

      const firstRef = result.current.setStepDone
      rerender()

      expect(result.current.setStepDone).toBe(firstRef)
    })
  })

  describe('steps prop changes', () => {
    it('should update currentStep when steps array changes', () => {
      const initialSteps = createSteps(3)
      const { result, rerender } = renderHook(
        (props: UseWizardNavigationOptions<WizardStep>) => useWizardNavigation(props),
        { initialProps: { steps: initialSteps } }
      )

      expect(result.current.currentStep.label).toBe('Step 1')

      const newSteps = [
        { id: 'new-1', label: 'New Step 1' },
        { id: 'new-2', label: 'New Step 2' },
        { id: 'new-3', label: 'New Step 3' },
      ]

      rerender({ steps: newSteps })

      expect(result.current.currentStep.label).toBe('New Step 1')
    })

    it('should update totalSteps when steps array changes', () => {
      const { result, rerender } = renderHook(
        (props: UseWizardNavigationOptions<WizardStep>) => useWizardNavigation(props),
        { initialProps: { steps: createSteps(3) } }
      )

      expect(result.current.totalSteps).toBe(3)

      rerender({ steps: createSteps(5) })

      expect(result.current.totalSteps).toBe(5)
    })
  })
})
