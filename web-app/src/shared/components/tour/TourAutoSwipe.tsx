import { useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "@/shared/hooks/useTranslation";

interface TourAutoSwipeProps {
  targetSelector: string;
  direction: "left" | "right";
  duration?: number;
  delay?: number;
  onComplete: () => void;
}

// Default timing values
const DEFAULT_DURATION_MS = 1500;
const DEFAULT_DELAY_MS = 800;
// Swipe distance as percentage of container width
const SWIPE_DISTANCE_RATIO = 0.35;

export function TourAutoSwipe({
  targetSelector,
  direction,
  duration = DEFAULT_DURATION_MS,
  delay = DEFAULT_DELAY_MS,
  onComplete,
}: TourAutoSwipeProps) {
  const { t } = useTranslation();
  const animationRef = useRef<number | null>(null);
  const hasAnimatedRef = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  const runAnimation = useCallback(() => {
    if (hasAnimatedRef.current) return;

    const container = document.querySelector(targetSelector);
    if (!container) return;

    // Find the swipeable content div (has z-10 and bg-white classes)
    const swipeableContent = container.querySelector(
      ".z-10.bg-white, .z-10.bg-gray-800",
    ) as HTMLElement | null;
    if (!swipeableContent) return;

    hasAnimatedRef.current = true;

    // Calculate swipe distance
    const containerWidth = container.getBoundingClientRect().width;
    const swipeDistance = containerWidth * SWIPE_DISTANCE_RATIO;
    const targetTranslate = direction === "left" ? -swipeDistance : swipeDistance;

    // Store original styles for cleanup
    const originalTransition = swipeableContent.style.transition;
    const originalTransform = swipeableContent.style.transform;
    const originalPointerEvents = swipeableContent.style.pointerEvents;

    // Block user interactions during animation
    swipeableContent.style.pointerEvents = "none";

    // Apply slow easing transition
    swipeableContent.style.transition = `transform ${duration}ms cubic-bezier(0.25, 0.1, 0.25, 1)`;

    // Start the swipe animation
    requestAnimationFrame(() => {
      swipeableContent.style.transform = `translateX(${targetTranslate}px)`;
    });

    // Set up cleanup function (resets styles if component unmounts during animation)
    cleanupRef.current = () => {
      swipeableContent.style.transition = originalTransition;
      swipeableContent.style.transform = originalTransform;
      swipeableContent.style.pointerEvents = originalPointerEvents;
    };

    // After animation completes, leave drawer open and dispatch completion event
    const completeTimer = setTimeout(() => {
      // Restore transition and pointer events, but keep the drawer open
      swipeableContent.style.transition = originalTransition;
      swipeableContent.style.pointerEvents = originalPointerEvents;
      cleanupRef.current = null;

      // Dispatch completion event on the container
      container.dispatchEvent(new CustomEvent("tour-swipe-complete"));
      onComplete();
    }, duration);

    return () => clearTimeout(completeTimer);
  }, [targetSelector, direction, duration, onComplete]);

  useEffect(() => {
    // Delay before starting animation
    const delayTimer = setTimeout(() => {
      animationRef.current = requestAnimationFrame(runAnimation);
    }, delay);

    return () => {
      clearTimeout(delayTimer);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      // Clean up any in-progress animation styles
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, [delay, runAnimation]);

  // Render a visually hidden aria-live region to announce the demo to screen readers
  return createPortal(
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {t("tour.accessibility.swipeDemoInProgress")}
    </div>,
    document.body,
  );
}
