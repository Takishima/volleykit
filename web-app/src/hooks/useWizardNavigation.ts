import { useState, useCallback, useMemo } from "react";

export interface WizardStep {
  id: string;
  label: string;
  isOptional?: boolean;
}

export interface UseWizardNavigationOptions<T extends WizardStep> {
  steps: T[];
  initialStepIndex?: number;
  onStepChange?: (fromIndex: number, toIndex: number) => void;
}

export interface UseWizardNavigationResult<T extends WizardStep> {
  /** Current step index (0-based) */
  currentStepIndex: number;
  /** Current step object */
  currentStep: T;
  /** Total number of steps */
  totalSteps: number;
  /** Whether currently on the first step */
  isFirstStep: boolean;
  /** Whether currently on the last step */
  isLastStep: boolean;
  /** Go to next step (no-op if already on last) */
  goNext: () => void;
  /** Go to previous step (no-op if already on first) */
  goBack: () => void;
  /** Go to specific step by index */
  goToStep: (index: number) => void;
  /** Reset to first step (stable reference, safe to use in useEffect dependencies) */
  resetToStart: () => void;
  /** Check if can go to next step */
  canGoNext: boolean;
  /** Check if can go back */
  canGoBack: boolean;
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
  const [currentStepIndex, setCurrentStepIndex] = useState(
    Math.max(0, Math.min(initialStepIndex, steps.length - 1)),
  );

  const totalSteps = steps.length;
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === totalSteps - 1;
  const canGoNext = !isLastStep;
  const canGoBack = !isFirstStep;

  const currentStep = useMemo(
    () => steps[currentStepIndex] ?? steps[0]!,
    [steps, currentStepIndex],
  );

  const goToStep = useCallback(
    (index: number) => {
      const clampedIndex = Math.max(0, Math.min(index, steps.length - 1));
      if (clampedIndex !== currentStepIndex) {
        onStepChange?.(currentStepIndex, clampedIndex);
        setCurrentStepIndex(clampedIndex);
      }
    },
    [currentStepIndex, steps.length, onStepChange],
  );

  const goNext = useCallback(() => {
    if (canGoNext) {
      goToStep(currentStepIndex + 1);
    }
  }, [canGoNext, currentStepIndex, goToStep]);

  const goBack = useCallback(() => {
    if (canGoBack) {
      goToStep(currentStepIndex - 1);
    }
  }, [canGoBack, currentStepIndex, goToStep]);

  // Stable function that resets to first step without depending on currentStepIndex
  const resetToStart = useCallback(() => {
    setCurrentStepIndex(0);
  }, []);

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
  };
}
