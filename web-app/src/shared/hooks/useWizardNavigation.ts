import { useState, useCallback, useMemo } from 'react'

export interface WizardStep {
  id: string
  label: string
  isOptional?: boolean
  /** Whether the step has validation errors that should be highlighted */
  isInvalid?: boolean
  /** Whether the step is read-only (already finalized externally) */
  isReadOnly?: boolean
}

export interface UseWizardNavigationOptions<T extends WizardStep> {
  steps: T[]
  initialStepIndex?: number
  onStepChange?: (fromIndex: number, toIndex: number) => void
}

export interface UseWizardNavigationResult<T extends WizardStep> {
  /** Current step index (0-based) */
  currentStepIndex: number
  /** Current step object */
  currentStep: T
  /** Total number of steps */
  totalSteps: number
  /** Whether currently on the first step */
  isFirstStep: boolean
  /** Whether currently on the last step */
  isLastStep: boolean
  /** Go to next step (no-op if already on last) */
  goNext: () => void
  /** Go to previous step (no-op if already on first) */
  goBack: () => void
  /** Go to specific step by index */
  goToStep: (index: number) => void
  /** Reset to first step (stable reference, safe to use in useEffect dependencies) */
  resetToStart: () => void
  /** Check if can go to next step */
  canGoNext: boolean
  /** Check if can go back */
  canGoBack: boolean
  /** Set of step indices that user has marked as done */
  stepsMarkedDone: ReadonlySet<number>
  /** Mark a step as done or not done */
  setStepDone: (index: number, done: boolean) => void
  /** Whether all required steps have been marked as done */
  allRequiredStepsDone: boolean
}

/**
 * Hook for managing wizard step navigation.
 *
 * Provides step state management with callbacks for step changes.
 * Use the `onStepChange` callback to trigger saves when navigating.
 *
 * @template T - The step type, must extend WizardStep
 */
export function useWizardNavigation<T extends WizardStep>({
  steps,
  initialStepIndex = 0,
  onStepChange,
}: UseWizardNavigationOptions<T>): UseWizardNavigationResult<T> {
  // Validate that steps array is not empty to prevent runtime errors
  if (steps.length === 0) {
    throw new Error('useWizardNavigation: steps array cannot be empty')
  }

  const clampedInitialIndex = Math.max(0, Math.min(initialStepIndex, steps.length - 1))

  const [currentStepIndex, setCurrentStepIndex] = useState(clampedInitialIndex)

  const [stepsMarkedDone, setStepsMarkedDone] = useState<Set<number>>(() => new Set())

  const totalSteps = steps.length
  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex === totalSteps - 1
  const canGoNext = !isLastStep
  const canGoBack = !isFirstStep

  // Safe access: steps.length > 0 is validated above, and currentStepIndex is clamped
  // to valid range [0, steps.length-1], so the element is guaranteed to exist
  const currentStep = useMemo((): T => {
    const step = steps[currentStepIndex]
    if (!step) {
      throw new Error(`useWizardNavigation: step at index ${currentStepIndex} not found`)
    }
    return step
  }, [steps, currentStepIndex])

  const goToStep = useCallback(
    (index: number) => {
      const clampedIndex = Math.max(0, Math.min(index, steps.length - 1))
      if (clampedIndex !== currentStepIndex) {
        onStepChange?.(currentStepIndex, clampedIndex)
        setCurrentStepIndex(clampedIndex)
      }
    },
    [currentStepIndex, steps.length, onStepChange]
  )

  const setStepDone = useCallback((index: number, done: boolean) => {
    setStepsMarkedDone((prev) => {
      if (done && prev.has(index)) return prev
      if (!done && !prev.has(index)) return prev
      const next = new Set(prev)
      if (done) {
        next.add(index)
      } else {
        next.delete(index)
      }
      return next
    })
  }, [])

  const goNext = useCallback(() => {
    if (canGoNext) {
      goToStep(currentStepIndex + 1)
    }
  }, [canGoNext, currentStepIndex, goToStep])

  const goBack = useCallback(() => {
    if (canGoBack) {
      goToStep(currentStepIndex - 1)
    }
  }, [canGoBack, currentStepIndex, goToStep])

  // Stable function that resets to first step without depending on currentStepIndex
  const resetToStart = useCallback(() => {
    setCurrentStepIndex(0)
    setStepsMarkedDone(new Set())
  }, [])

  // Check if all required (non-optional) steps have been marked as done
  const allRequiredStepsDone = useMemo(() => {
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]
      if (!step?.isOptional && !stepsMarkedDone.has(i)) {
        return false
      }
    }
    return true
  }, [steps, stepsMarkedDone])

  return {
    currentStepIndex,
    currentStep,
    totalSteps,
    isFirstStep,
    isLastStep,
    goNext,
    goBack,
    goToStep,
    resetToStart,
    canGoNext,
    canGoBack,
    stepsMarkedDone,
    setStepDone,
    allRequiredStepsDone,
  }
}
