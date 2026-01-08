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
// Action button layout constants (must match SwipeableCard.tsx)
const ACTION_BUTTON_WIDTH = 72;
const ACTION_BUTTON_GAP = 8;
const DRAWER_PADDING = 16;
// Default number of actions to assume if we can't detect them
const DEFAULT_ACTION_COUNT = 3;

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
    // Note: bg-white is always present in the class list; dark:bg-gray-800 is a separate Tailwind class
    // Try multiple strategies:
    // 1. Look for it as a descendant of the target
    // 2. Check if target itself is the swipeable content
    // 3. Look upward - target might be inside the swipeable content (e.g., data-tour on inner Card)
    const swipeableSelector = ".z-10.bg-white";
    let swipeableContent = container.querySelector(swipeableSelector) as HTMLElement | null;

    if (!swipeableContent) {
      // Check if target matches the selector
      if (container.matches(swipeableSelector)) {
        swipeableContent = container as HTMLElement;
      } else {
        // Look upward - target might be inside the swipeable content
        swipeableContent = container.closest(swipeableSelector) as HTMLElement | null;
      }
    }
    if (!swipeableContent) return;

    hasAnimatedRef.current = true;

    // Calculate drawer width based on number of actions
    // Using default count since we can't detect the actual swipe config
    const actionCount = DEFAULT_ACTION_COUNT;
    const drawerWidth = actionCount * ACTION_BUTTON_WIDTH +
      (actionCount - 1) * ACTION_BUTTON_GAP +
      DRAWER_PADDING;
    const targetTranslate = direction === "left" ? -drawerWidth : drawerWidth;

    // Dispatch event to notify SwipeableCard to update its state
    // This allows the action buttons to render properly
    container.dispatchEvent(
      new CustomEvent("tour-swipe-start", {
        bubbles: true,
        detail: { translateX: targetTranslate },
      }),
    );

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
