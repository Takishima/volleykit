import { useState, useRef, useCallback } from "react";

/**
 * Minimum movement in pixels before determining swipe direction.
 * Prevents micro-movements from being interpreted as swipes.
 */
const DIRECTION_THRESHOLD_PX = 10;

/**
 * Minimum vertical swipe distance as ratio of container height to trigger dismiss.
 * 25% threshold balances ease of intentional swipes vs preventing accidental dismissals.
 */
const DISMISS_THRESHOLD_RATIO = 0.25;

/**
 * Maximum translateY as multiplier of threshold (adds resistance at edges).
 */
const MAX_SWIPE_MULTIPLIER = 1.5;

/** Direction determined by initial gesture movement */
type SwipeDirection = "horizontal" | "vertical" | null;

/**
 * Checks if an element or any of its parents (up to container) is a scrollable element
 * that can scroll in the given vertical direction.
 */
function canElementScroll(
  element: EventTarget | null,
  container: HTMLElement | null,
  direction: "up" | "down",
): boolean {
  if (!element || !(element instanceof HTMLElement) || !container) {
    return false;
  }

  let current: HTMLElement | null = element;

  while (current && current !== container) {
    const { overflowY } = getComputedStyle(current);
    const isScrollable = overflowY === "auto" || overflowY === "scroll";

    if (isScrollable) {
      const { scrollTop, scrollHeight, clientHeight } = current;
      const canScrollDown = scrollTop + clientHeight < scrollHeight - 1;
      const canScrollUp = scrollTop > 1;

      if (direction === "down" && canScrollDown) return true;
      if (direction === "up" && canScrollUp) return true;
    }

    current = current.parentElement;
  }

  return false;
}

interface UseVerticalSwipeDismissOptions {
  /** Whether swipe gestures are enabled (default: true) */
  enabled?: boolean;
  /** Called when dismiss gesture is triggered */
  onDismiss?: () => void;
}

interface UseVerticalSwipeDismissReturn {
  /** Ref to attach to the swipeable container element */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Current vertical translation in pixels */
  translateY: number;
  /** Whether user is currently dragging vertically */
  isDragging: boolean;
  /** Touch and mouse event handlers to spread on the container */
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
    onMouseDown: (e: React.MouseEvent) => void;
    onMouseMove: (e: React.MouseEvent) => void;
    onMouseUp: () => void;
    onMouseLeave: () => void;
  };
}

/**
 * Hook for handling vertical swipe-to-dismiss gestures.
 *
 * Allows users to swipe up or down on content to dismiss a modal or wizard.
 * Works alongside horizontal swipe gestures (each gesture is either horizontal OR vertical).
 *
 * @example
 * ```tsx
 * function MyDismissableContent({ onClose }) {
 *   const { containerRef, translateY, isDragging, handlers } = useVerticalSwipeDismiss({
 *     onDismiss: onClose,
 *   });
 *
 *   return (
 *     <div ref={containerRef} {...handlers}>
 *       <div style={{
 *         transform: `translateY(${translateY}px)`,
 *         opacity: 1 - Math.abs(translateY) / 300,
 *       }}>
 *         Content that can be swiped away
 *       </div>
 *     </div>
 *   );
 * }
 * ```
 */
export function useVerticalSwipeDismiss(
  options: UseVerticalSwipeDismissOptions = {},
): UseVerticalSwipeDismissReturn {
  const { enabled = true, onDismiss } = options;

  const [translateY, setTranslateY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const directionRef = useRef<SwipeDirection>(null);
  const touchActiveRef = useRef(false);
  const mouseActiveRef = useRef(false);
  const currentTranslateRef = useRef(0);
  // Track the element where the gesture started (for scroll detection)
  const touchTargetRef = useRef<EventTarget | null>(null);
  // Track if we've decided to let the browser handle scrolling
  const isScrollingRef = useRef(false);

  const resetPosition = useCallback(() => {
    setTranslateY(0);
    currentTranslateRef.current = 0;
  }, []);

  const handleDragStart = useCallback(
    (clientX: number, clientY: number, target: EventTarget | null) => {
      if (!enabled) return;

      startXRef.current = clientX;
      startYRef.current = clientY;
      directionRef.current = null;
      currentTranslateRef.current = 0;
      touchTargetRef.current = target;
      isScrollingRef.current = false;
      setIsDragging(true);
    },
    [enabled],
  );

  const handleDragMove = useCallback(
    (clientX: number, clientY: number, preventDefault: () => void) => {
      if (!enabled || isScrollingRef.current) return;

      const diffX = clientX - startXRef.current;
      const diffY = clientY - startYRef.current;

      // Determine swipe direction on first significant movement
      if (directionRef.current === null) {
        if (
          Math.abs(diffX) > DIRECTION_THRESHOLD_PX ||
          Math.abs(diffY) > DIRECTION_THRESHOLD_PX
        ) {
          directionRef.current =
            Math.abs(diffY) > Math.abs(diffX) ? "vertical" : "horizontal";

          // If vertical, check if we should let the browser handle scrolling
          if (directionRef.current === "vertical") {
            const scrollDirection = diffY > 0 ? "up" : "down";
            // If the element can scroll in this direction, let browser handle it
            if (
              canElementScroll(
                touchTargetRef.current,
                containerRef.current,
                scrollDirection,
              )
            ) {
              isScrollingRef.current = true;
              setIsDragging(false);
              return;
            }
          }
        }
      }

      // Only handle vertical swipes (when not scrolling)
      if (directionRef.current === "vertical" && !isScrollingRef.current) {
        preventDefault();

        // Get container height for threshold calculation
        const containerHeight = containerRef.current?.offsetHeight ?? 300;
        const threshold = containerHeight * DISMISS_THRESHOLD_RATIO;
        const maxSwipe = threshold * MAX_SWIPE_MULTIPLIER;

        // Apply resistance at edges
        const clampedTranslate = Math.max(-maxSwipe, Math.min(maxSwipe, diffY));

        currentTranslateRef.current = clampedTranslate;
        setTranslateY(clampedTranslate);
      }
    },
    [enabled],
  );

  const handleDragEnd = useCallback(() => {
    // Reset scrolling flag
    isScrollingRef.current = false;
    touchTargetRef.current = null;

    if (directionRef.current !== "vertical") {
      directionRef.current = null;
      setIsDragging(false);
      return;
    }

    const finalTranslateY = currentTranslateRef.current;
    const containerHeight = containerRef.current?.offsetHeight ?? 300;
    const threshold = containerHeight * DISMISS_THRESHOLD_RATIO;

    // Check if swipe exceeded threshold (in either direction)
    if (Math.abs(finalTranslateY) > threshold && onDismiss) {
      onDismiss();
    }

    // Always reset position (dismiss handler closes the modal)
    resetPosition();
    directionRef.current = null;
    setIsDragging(false);
  }, [onDismiss, resetPosition]);

  // Touch event handlers
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      touchActiveRef.current = true;
      handleDragStart(touch.clientX, touch.clientY, e.target);
    },
    [handleDragStart],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!touchActiveRef.current) return;
      const touch = e.touches[0];
      if (!touch) return;
      handleDragMove(touch.clientX, touch.clientY, () => e.preventDefault());
    },
    [handleDragMove],
  );

  const handleTouchEnd = useCallback(() => {
    if (!touchActiveRef.current) return;
    touchActiveRef.current = false;
    handleDragEnd();
  }, [handleDragEnd]);

  // Mouse event handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      mouseActiveRef.current = true;
      handleDragStart(e.clientX, e.clientY, e.target);
    },
    [handleDragStart],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!mouseActiveRef.current) return;
      handleDragMove(e.clientX, e.clientY, () => e.preventDefault());
    },
    [handleDragMove],
  );

  const handleMouseUp = useCallback(() => {
    if (!mouseActiveRef.current) return;
    mouseActiveRef.current = false;
    handleDragEnd();
  }, [handleDragEnd]);

  return {
    containerRef,
    translateY,
    isDragging,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
      onMouseLeave: handleMouseUp,
    },
  };
}
