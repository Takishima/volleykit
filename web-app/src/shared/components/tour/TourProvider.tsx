import { useEffect, useCallback, useRef } from "react";
import { useTourStore } from "@/shared/stores/tour";
import { getTourDefinition, getTourStepCount } from "./definitions";
import { TourSpotlight } from "./TourSpotlight";
import { TourTooltip } from "./TourTooltip";

interface TourProviderProps {
  children: React.ReactNode;
}

export function TourProvider({ children }: TourProviderProps) {
  const {
    activeTour,
    currentStep,
    nextStep,
    previousStep,
    completeTour,
    dismissTour,
  } = useTourStore();

  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Get current tour definition and step
  const tourDefinition = activeTour ? getTourDefinition(activeTour) : null;
  const currentStepData = tourDefinition?.steps[currentStep];
  const totalSteps = activeTour ? getTourStepCount(activeTour) : 0;
  const isLastStep = currentStep === totalSteps - 1;
  const isFirstStep = currentStep === 0;

  // Freeze spotlight position during swipe steps to keep drawer visible
  const isSwipeStep = currentStepData?.completionEvent?.type === "swipe";

  // Handle step completion
  const handleStepComplete = useCallback(() => {
    if (isLastStep) {
      completeTour();
    } else {
      nextStep();
    }
  }, [isLastStep, completeTour, nextStep]);

  // Handle manual next button click
  const handleNext = useCallback(() => {
    handleStepComplete();
  }, [handleStepComplete]);

  // Handle previous button click
  const handlePrevious = useCallback(() => {
    previousStep();
  }, [previousStep]);

  // Handle skip/dismiss
  const handleDismiss = useCallback(() => {
    dismissTour();
  }, [dismissTour]);

  // Set up auto-advance timer for "auto" completion events
  useEffect(() => {
    if (!currentStepData?.completionEvent) return;

    const { type, delay } = currentStepData.completionEvent;

    if (type === "auto" && delay) {
      autoAdvanceTimerRef.current = setTimeout(() => {
        handleStepComplete();
      }, delay);
    }

    return () => {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
        autoAdvanceTimerRef.current = null;
      }
    };
  }, [currentStepData, handleStepComplete]);

  // Set up event listeners for click and swipe completion events
  useEffect(() => {
    if (!currentStepData?.completionEvent) return;

    const { type, selector } = currentStepData.completionEvent;
    const targetSelector = selector || currentStepData.targetSelector;

    if (type === "click") {
      const handleClick = (e: MouseEvent) => {
        const target = e.target as Element;
        const clickedElement = target.closest(targetSelector);
        if (clickedElement) {
          // Small delay to let the click action complete visually
          setTimeout(() => {
            handleStepComplete();
          }, 300);
        }
      };

      document.addEventListener("click", handleClick, { capture: true });
      return () => document.removeEventListener("click", handleClick, { capture: true });
    }

    if (type === "swipe") {
      // Listen for swipe completion by detecting touch/pointer events
      // We'll detect when the swipeable card action is triggered
      const handleSwipe = () => {
        setTimeout(() => {
          handleStepComplete();
        }, 500);
      };

      // Use a custom event that SwipeableCard can dispatch
      const targetElement = document.querySelector(targetSelector);
      if (targetElement) {
        targetElement.addEventListener("tour-swipe-complete", handleSwipe);
        return () => targetElement.removeEventListener("tour-swipe-complete", handleSwipe);
      }
    }

    return undefined;
  }, [currentStepData, handleStepComplete]);

  // Don't render spotlight if no active tour or step
  if (!activeTour || !currentStepData) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      <TourSpotlight
        targetSelector={currentStepData.targetSelector}
        placement={currentStepData.placement}
        onDismiss={handleDismiss}
        freezePosition={isSwipeStep}
        disableBlur={isSwipeStep}
      >
        <TourTooltip
          titleKey={currentStepData.titleKey}
          descriptionKey={currentStepData.descriptionKey}
          currentStep={currentStep}
          totalSteps={totalSteps}
          onSkip={handleDismiss}
          onNext={handleNext}
          onPrevious={isFirstStep ? undefined : handlePrevious}
          isLastStep={isLastStep}
          isFirstStep={isFirstStep}
        />
      </TourSpotlight>
    </>
  );
}
