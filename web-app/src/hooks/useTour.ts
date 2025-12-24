import { useEffect, useRef } from "react";
import { useTourStore, type TourId } from "@/stores/tour";

const TOUR_START_DELAY_MS = 500;

interface UseTourOptions {
  // Delay before starting the tour (allows page to settle)
  startDelay?: number;
  // Whether to auto-start the tour on first visit
  autoStart?: boolean;
}

interface UseTourReturn {
  // Whether this specific tour is currently active
  isActive: boolean;
  // Whether tour mode is active (for showing dummy data)
  isTourMode: boolean;
  // Start this tour manually
  startTour: () => void;
  // End the current tour
  endTour: () => void;
  // Current step index (0-based)
  currentStep: number;
  // Advance to next step
  nextStep: () => void;
  // Whether this tour should be shown (not completed/dismissed)
  shouldShow: boolean;
}

export function useTour(
  tourId: TourId,
  options: UseTourOptions = {},
): UseTourReturn {
  const { startDelay = TOUR_START_DELAY_MS, autoStart = true } = options;

  const {
    activeTour,
    currentStep,
    startTour: storeStartTour,
    nextStep: storeNextStep,
    completeTour,
    shouldShowTour,
    isTourActive,
  } = useTourStore();

  const hasAutoStarted = useRef(false);
  const prevShouldShow = useRef(shouldShowTour(tourId));

  const isActive = isTourActive(tourId);
  const isTourMode = activeTour === tourId;
  const shouldShow = shouldShowTour(tourId);

  // Reset hasAutoStarted when tours are reset (shouldShow changes from false to true)
  useEffect(() => {
    if (shouldShow && !prevShouldShow.current) {
      hasAutoStarted.current = false;
    }
    prevShouldShow.current = shouldShow;
  }, [shouldShow]);

  // Auto-start tour on first visit (if enabled and should show)
  useEffect(() => {
    if (!autoStart || !shouldShow || hasAutoStarted.current) return;
    if (activeTour !== null) return; // Another tour is active

    hasAutoStarted.current = true;

    const timer = setTimeout(() => {
      storeStartTour(tourId);
    }, startDelay);

    return () => clearTimeout(timer);
  }, [autoStart, shouldShow, activeTour, tourId, startDelay, storeStartTour]);

  const startTour = () => {
    storeStartTour(tourId);
  };

  const endTour = () => {
    completeTour();
  };

  const nextStep = () => {
    storeNextStep();
  };

  return {
    isActive,
    isTourMode,
    startTour,
    endTour,
    currentStep,
    nextStep,
    shouldShow,
  };
}
