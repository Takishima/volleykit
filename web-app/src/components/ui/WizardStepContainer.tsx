import {
  type ReactNode,
  useState,
  useRef,
  useCallback,
  useEffect,
} from "react";

/** Minimum horizontal swipe distance as ratio of container width to trigger navigation */
const SWIPE_THRESHOLD_RATIO = 0.3;
/** Minimum movement in pixels to distinguish swipe from tap */
const DIRECTION_THRESHOLD_PX = 10;
/** Animation duration for step transitions in ms */
const TRANSITION_DURATION_MS = 300;

interface WizardStepContainerProps {
  /** Current step index */
  currentStep: number;
  /** Total number of steps */
  totalSteps: number;
  /** Callback when user swipes to go to next step */
  onSwipeNext?: () => void;
  /** Callback when user swipes to go to previous step */
  onSwipePrevious?: () => void;
  /** Whether swipe navigation is enabled */
  swipeEnabled?: boolean;
  /** Children are rendered for the current step */
  children: ReactNode;
}

/**
 * Container component that wraps wizard step content with swipe gesture support.
 *
 * - Swipe left: Go to next step
 * - Swipe right: Go to previous step
 * - Includes smooth slide animations between steps
 */
export function WizardStepContainer({
  currentStep,
  totalSteps,
  onSwipeNext,
  onSwipePrevious,
  swipeEnabled = true,
  children,
}: WizardStepContainerProps) {
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [containerWidth, setContainerWidth] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const directionRef = useRef<"horizontal" | "vertical" | null>(null);
  const touchActiveRef = useRef(false);
  const mouseActiveRef = useRef(false);

  // Track container width for threshold calculation
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    updateWidth();

    const resizeObserver = new ResizeObserver(updateWidth);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const threshold = containerWidth
    ? containerWidth * SWIPE_THRESHOLD_RATIO
    : 100;

  const canSwipeNext = currentStep < totalSteps - 1;
  const canSwipePrevious = currentStep > 0;

  const handleDragStart = useCallback((clientX: number, clientY: number) => {
    startXRef.current = clientX;
    startYRef.current = clientY;
    directionRef.current = null;
    setIsDragging(true);
  }, []);

  const handleDragMove = useCallback(
    (clientX: number, clientY: number, preventDefault: () => void) => {
      if (!swipeEnabled) return;

      const diffX = clientX - startXRef.current;
      const diffY = clientY - startYRef.current;

      // Determine swipe direction on first significant movement
      if (directionRef.current === null) {
        if (
          Math.abs(diffX) > DIRECTION_THRESHOLD_PX ||
          Math.abs(diffY) > DIRECTION_THRESHOLD_PX
        ) {
          directionRef.current =
            Math.abs(diffX) > Math.abs(diffY) ? "horizontal" : "vertical";
        }
      }

      // Only handle horizontal swipes
      if (directionRef.current === "horizontal") {
        // Check if swipe direction is valid
        const isSwipingLeft = diffX < 0;
        const isSwipingRight = diffX > 0;

        // Allow swipe only if navigation in that direction is possible
        if (
          (isSwipingLeft && !canSwipeNext) ||
          (isSwipingRight && !canSwipePrevious)
        ) {
          return;
        }

        preventDefault();

        // Apply resistance at edges
        const maxSwipe = threshold * 1.5;
        const clampedTranslate = Math.max(-maxSwipe, Math.min(maxSwipe, diffX));
        setTranslateX(clampedTranslate);
      }
    },
    [swipeEnabled, canSwipeNext, canSwipePrevious, threshold],
  );

  const handleDragEnd = useCallback(() => {
    if (directionRef.current === "horizontal") {
      const swipeDistance = Math.abs(translateX);

      if (swipeDistance > threshold) {
        if (translateX < 0 && canSwipeNext) {
          onSwipeNext?.();
        } else if (translateX > 0 && canSwipePrevious) {
          onSwipePrevious?.();
        }
      }

      // Reset position
      setTranslateX(0);
    }

    directionRef.current = null;
    setIsDragging(false);
  }, [
    translateX,
    threshold,
    canSwipeNext,
    canSwipePrevious,
    onSwipeNext,
    onSwipePrevious,
  ]);

  // Touch event handlers
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!swipeEnabled) return;
      const touch = e.touches[0];
      if (!touch) return;
      touchActiveRef.current = true;
      handleDragStart(touch.clientX, touch.clientY);
    },
    [swipeEnabled, handleDragStart],
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
    touchActiveRef.current = false;
    setIsDragging(false);
    handleDragEnd();
  }, [handleDragEnd]);

  // Mouse event handlers (for desktop)
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!swipeEnabled) return;
      mouseActiveRef.current = true;
      handleDragStart(e.clientX, e.clientY);
    },
    [swipeEnabled, handleDragStart],
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
    setIsDragging(false);
    handleDragEnd();
  }, [handleDragEnd]);

  return (
    // Swipe gestures for wizard navigation - keyboard navigation handled by parent buttons
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      ref={containerRef}
      className="relative overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isDragging
            ? "none"
            : `transform ${TRANSITION_DURATION_MS}ms cubic-bezier(0.25, 0.1, 0.25, 1)`,
          cursor: swipeEnabled ? (isDragging ? "grabbing" : "grab") : "default",
        }}
      >
        {children}
      </div>
    </div>
  );
}
