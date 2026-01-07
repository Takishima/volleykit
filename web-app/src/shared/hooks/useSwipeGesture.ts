import { useState, useRef, useCallback, useLayoutEffect } from "react";

/**
 * Minimum movement in pixels before determining swipe direction.
 * Prevents micro-movements from being interpreted as swipes.
 */
const DIRECTION_THRESHOLD_PX = 10;

/**
 * Default swipe threshold as ratio of container width (30%).
 * User must drag 30% of container width to trigger action.
 */
const DEFAULT_SWIPE_THRESHOLD_RATIO = 0.3;

/** Direction determined by initial gesture movement */
export type SwipeDirection = "horizontal" | "vertical" | null;

interface UseSwipeGestureOptions {
  /** Whether swipe gestures are enabled (default: true) */
  enabled?: boolean;
  /** Callback to get starting translateX position when drag begins (useful for resuming from drawer open state) */
  getInitialTranslateX?: () => number;
  /** Maximum swipe distance as multiplier of threshold (default: 1.5) */
  maxSwipeMultiplier?: number;
  /** Called to determine if swipe in this direction should be allowed */
  canSwipe?: (diffX: number, direction: "left" | "right") => boolean;
  /** Called during drag move with current diff from start position */
  onDragMove?: (diffX: number, direction: "left" | "right") => void;
  /** Called when drag ends, returns true if the hook should NOT reset position */
  onDragEnd?: (
    translateX: number,
    containerWidth: number,
  ) => boolean | Promise<boolean>;
  /** Called when drag starts */
  onDragStart?: () => void;
  /** Base threshold for triggering swipe actions (calculated from container width if not provided) */
  threshold?: number;
}

interface UseSwipeGestureReturn {
  /** Ref to attach to the swipeable container element */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Current horizontal translation in pixels */
  translateX: number;
  /** Whether user is currently dragging */
  isDragging: boolean;
  /** Container width in pixels (null if not measured yet) */
  containerWidth: number | null;
  /** Set translateX directly (for external control) */
  setTranslateX: React.Dispatch<React.SetStateAction<number>>;
  /** Reset position to zero */
  resetPosition: () => void;
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
 * Hook for handling swipe/drag gestures on touch and mouse devices.
 *
 * Extracts common gesture logic used by SwipeableCard and WizardStepContainer:
 * - Direction detection (horizontal vs vertical) with 10px threshold
 * - Touch and mouse event handling with unified drag callbacks
 * - Container width tracking via ResizeObserver
 * - Configurable swipe constraints and thresholds
 *
 * @example
 * ```tsx
 * function MySwipeableComponent() {
 *   const { containerRef, translateX, isDragging, handlers } = useSwipeGesture({
 *     canSwipe: (diffX, direction) => direction === 'left',
 *     onDragEnd: (translateX, containerWidth) => {
 *       if (Math.abs(translateX) > containerWidth * 0.3) {
 *         // Trigger action
 *         return true; // Hook won't reset position
 *       }
 *       return false; // Hook will reset to 0
 *     },
 *   });
 *
 *   return (
 *     <div ref={containerRef} {...handlers}>
 *       <div style={{ transform: `translateX(${translateX}px)` }}>
 *         Content
 *       </div>
 *     </div>
 *   );
 * }
 * ```
 */
export function useSwipeGesture(
  options: UseSwipeGestureOptions = {},
): UseSwipeGestureReturn {
  const {
    enabled = true,
    getInitialTranslateX,
    maxSwipeMultiplier = 1.5,
    canSwipe,
    onDragMove,
    onDragEnd,
    onDragStart,
    threshold: thresholdOption,
  } = options;

  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [containerWidth, setContainerWidth] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const directionRef = useRef<SwipeDirection>(null);
  const touchActiveRef = useRef(false);
  const mouseActiveRef = useRef(false);
  const currentTranslateRef = useRef(0);

  // Track container width for threshold calculation
  // Using useLayoutEffect to ensure width is set before user interaction
  useLayoutEffect(() => {
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

  const threshold = thresholdOption ?? (containerWidth ? containerWidth * DEFAULT_SWIPE_THRESHOLD_RATIO : 100);

  const resetPosition = useCallback(() => {
    setTranslateX(0);
    currentTranslateRef.current = 0;
  }, []);

  const handleDragStart = useCallback(
    (clientX: number, clientY: number) => {
      if (!enabled) return;

      startXRef.current = clientX;
      startYRef.current = clientY;
      directionRef.current = null;
      currentTranslateRef.current = getInitialTranslateX?.() ?? 0;
      setIsDragging(true);
      onDragStart?.();
    },
    [enabled, getInitialTranslateX, onDragStart],
  );

  // Track current translation during drag via ref (for use in handleDragEnd)
  const currentDragTranslateRef = useRef(0);

  const handleDragMove = useCallback(
    (clientX: number, clientY: number, preventDefault: () => void) => {
      if (!enabled) return;

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
        const newTranslate = currentTranslateRef.current + diffX;
        const swipeDirection = newTranslate > 0 ? "right" : "left";

        // Check if swipe in this direction is allowed
        if (canSwipe && !canSwipe(newTranslate, swipeDirection)) {
          return;
        }

        preventDefault();

        // Apply resistance at edges
        const maxSwipe = threshold * maxSwipeMultiplier;
        const clampedTranslate = Math.max(
          -maxSwipe,
          Math.min(maxSwipe, newTranslate),
        );

        // Track via ref for handleDragEnd (avoids state batching issues)
        currentDragTranslateRef.current = clampedTranslate;
        setTranslateX(clampedTranslate);
        onDragMove?.(newTranslate, swipeDirection);
      }
    },
    [enabled, canSwipe, threshold, maxSwipeMultiplier, onDragMove],
  );

  const handleDragEnd = useCallback(async () => {
    if (directionRef.current !== "horizontal") {
      directionRef.current = null;
      setIsDragging(false);
      return;
    }

    // Use ref value to avoid React state batching issues
    const finalTranslateX = currentDragTranslateRef.current;

    // Get container width, fallback to ref measurement if state not set yet
    const width = containerWidth ?? containerRef.current?.offsetWidth ?? 0;

    // Call onDragEnd to let consumer handle the swipe completion
    if (onDragEnd && width > 0) {
      const shouldKeepPosition = await onDragEnd(finalTranslateX, width);
      if (!shouldKeepPosition) {
        resetPosition();
      }
    } else {
      resetPosition();
    }

    directionRef.current = null;
    setIsDragging(false);
  }, [containerWidth, onDragEnd, resetPosition]);

  // Touch event handlers
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      touchActiveRef.current = true;
      handleDragStart(touch.clientX, touch.clientY);
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
      handleDragStart(e.clientX, e.clientY);
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
    translateX,
    isDragging,
    containerWidth,
    setTranslateX,
    resetPosition,
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
