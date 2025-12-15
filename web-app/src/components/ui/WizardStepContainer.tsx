import {
  type ReactNode,
  useState,
  useRef,
  useCallback,
  useEffect,
  useLayoutEffect,
} from "react";

/** Minimum horizontal swipe distance as ratio of container width to trigger navigation */
const SWIPE_THRESHOLD_RATIO = 0.3;
/** Minimum movement in pixels to distinguish swipe from tap */
const DIRECTION_THRESHOLD_PX = 10;
/** Animation duration for step transitions in ms */
const TRANSITION_DURATION_MS = 300;

/** Animation phases for step transitions */
type AnimationPhase = "idle" | "exiting" | "entering";

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
  const [animationPhase, setAnimationPhase] = useState<AnimationPhase>("idle");

  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const directionRef = useRef<"horizontal" | "vertical" | null>(null);
  const touchActiveRef = useRef(false);
  const mouseActiveRef = useRef(false);
  const prevStepRef = useRef(currentStep);
  const animationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

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

  // Cleanup animation timeout on unmount
  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
        animationTimeoutRef.current = null;
      }
    };
  }, []);

  // Handle entrance animation when step changes (from button navigation)
  // Using useLayoutEffect for synchronous visual updates before paint
  useLayoutEffect(() => {
    if (currentStep !== prevStepRef.current && containerWidth) {
      // Determine direction: step increased = going forward = enter from right
      const goingForward = currentStep > prevStepRef.current;
      prevStepRef.current = currentStep;

      // Only animate if we're not already animating (swipe handles its own animation)
      if (animationPhase === "idle") {
        // Start from off-screen position (synchronous, before paint)
        // Disable lint warning - this is a legitimate animation pattern where we need
        // to set initial position synchronously before the browser paints
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTranslateX(goingForward ? containerWidth : -containerWidth);
        setAnimationPhase("entering");

        // Double rAF ensures initial position renders before transition starts.
        // First rAF: browser schedules paint, second rAF: transition begins after paint.
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setTranslateX(0);
          });
        });

        // Complete animation
        animationTimeoutRef.current = setTimeout(() => {
          setAnimationPhase("idle");
          animationTimeoutRef.current = null;
        }, TRANSITION_DURATION_MS);
      }
    }
  }, [currentStep, containerWidth, animationPhase]);

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

  // Start entrance animation after content switch
  const startEntranceAnimation = useCallback(
    (goingNext: boolean, width: number) => {
      // Position new content off-screen on arrival side
      setTranslateX(goingNext ? width : -width);
      setAnimationPhase("entering");

      // Double rAF ensures initial position renders before transition starts.
      // First rAF: browser schedules paint, second rAF: transition begins after paint.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTranslateX(0);
        });
      });

      // Complete entrance animation
      animationTimeoutRef.current = setTimeout(() => {
        setAnimationPhase("idle");
        animationTimeoutRef.current = null;
      }, TRANSITION_DURATION_MS);
    },
    [],
  );

  // Execute navigation after exit animation completes
  const executeNavigationAndEnter = useCallback(
    (goingNext: boolean, width: number) => {
      // Update step tracking before callback
      prevStepRef.current += goingNext ? 1 : -1;

      // Trigger navigation (changes children)
      if (goingNext) {
        onSwipeNext?.();
      } else {
        onSwipePrevious?.();
      }

      startEntranceAnimation(goingNext, width);
    },
    [onSwipeNext, onSwipePrevious, startEntranceAnimation],
  );

  // Handle swipe completion with threshold check
  const handleDragEnd = useCallback(() => {
    if (directionRef.current !== "horizontal") {
      directionRef.current = null;
      setIsDragging(false);
      return;
    }

    const swipeDistance = Math.abs(translateX);
    const goingNext = translateX < 0;
    const canNavigate =
      (goingNext && canSwipeNext) || (!goingNext && canSwipePrevious);

    if (swipeDistance > threshold && containerWidth && canNavigate) {
      // Start exit animation
      setAnimationPhase("exiting");
      setTranslateX(goingNext ? -containerWidth : containerWidth);

      // After exit animation, navigate and enter
      animationTimeoutRef.current = setTimeout(() => {
        executeNavigationAndEnter(goingNext, containerWidth);
      }, TRANSITION_DURATION_MS);
    } else {
      // Snap back to center
      setTranslateX(0);
    }

    directionRef.current = null;
    setIsDragging(false);
  }, [
    translateX,
    threshold,
    containerWidth,
    canSwipeNext,
    canSwipePrevious,
    executeNavigationAndEnter,
  ]);

  // Helper for gesture end that handles ref cleanup and calls shared logic
  const handleGestureEnd = useCallback(
    (activeRef: React.MutableRefObject<boolean>) => {
      if (!activeRef.current) return;
      activeRef.current = false;
      setIsDragging(false);
      handleDragEnd();
    },
    [handleDragEnd],
  );

  // Touch event handlers - refs accessed in event handlers (allowed by lint rules)
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
    handleGestureEnd(touchActiveRef);
  }, [handleGestureEnd]);

  // Mouse event handlers - refs accessed in event handlers (allowed by lint rules)
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
    handleGestureEnd(mouseActiveRef);
  }, [handleGestureEnd]);

  // Determine if transition should be animated
  // Animate when: not dragging (either animating or snapping back)
  const shouldAnimate = !isDragging;

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
          transition: shouldAnimate
            ? `transform ${TRANSITION_DURATION_MS}ms cubic-bezier(0.25, 0.1, 0.25, 1)`
            : "none",
          cursor: swipeEnabled ? (isDragging ? "grabbing" : "grab") : "default",
        }}
      >
        {children}
      </div>
    </div>
  );
}
