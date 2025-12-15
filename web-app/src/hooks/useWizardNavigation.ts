import { useState, useCallback, useMemo } from "react";

export interface WizardStep {
  id: string;
  label: string;
  isOptional?: boolean;
}

export interface UseWizardNavigationOptions {
  steps: WizardStep[];
  initialStepIndex?: number;
  onStepChange?: (fromIndex: number, toIndex: number) => void;
}

export interface UseWizardNavigationResult {
  /** Current step index (0-based) */
  currentStepIndex: number;
  /** Current step object */
  currentStep: WizardStep;
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
 */
export function useWizardNavigation({
  steps,
  initialStepIndex = 0,
  onStepChange,
}: UseWizardNavigationOptions): UseWizardNavigationResult {
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

  return {
    currentStepIndex,
    currentStep,
    totalSteps,
    isFirstStep,
    isLastStep,
    goNext,
    goBack,
    goToStep,
    canGoNext,
    canGoBack,
  };
}
