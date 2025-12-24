import {
  type ReactNode,
  useState,
  useRef,
  useCallback,
  useEffect,
  useLayoutEffect,
} from "react";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";

/**
 * Minimum horizontal swipe distance as ratio of container width to trigger navigation.
 * 30% threshold balances ease of intentional swipes vs preventing accidental navigation.
 */
const SWIPE_THRESHOLD_RATIO = 0.3;
/**
 * Animation duration for step transitions.
 * 300ms provides smooth visual feedback without feeling sluggish.
 */
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
  const [animationPhase, setAnimationPhase] = useState<AnimationPhase>("idle");
  const [isJumping, setIsJumping] = useState(false);

  const prevStepRef = useRef(currentStep);
  const animationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const canSwipeNext = currentStep < totalSteps - 1;
  const canSwipePrevious = currentStep > 0;

  // Start entrance animation after content switch (swipe gestures)
  const startEntranceAnimation = useCallback(
    (goingNext: boolean, width: number, setTranslateXFn: (x: number) => void) => {
      // Disable transition to instantly position new content
      setIsJumping(true);
      // Position new content on the OPPOSITE side from where current content exited
      setTranslateXFn(goingNext ? width : -width);

      // First rAF: browser paints the new position without transition
      // Second rAF: enable transition and animate to center
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsJumping(false);
          setAnimationPhase("entering");
          setTranslateXFn(0);
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

  // Use the swipe gesture hook
  // Threshold defaults to 30% of container width (same as SWIPE_THRESHOLD_RATIO)
  const {
    containerRef,
    translateX,
    isDragging,
    containerWidth,
    setTranslateX,
    handlers,
  } = useSwipeGesture({
    enabled: swipeEnabled,
    maxSwipeMultiplier: 1.5,
    canSwipe: (_diffX, direction) => {
      // Allow swipe only if navigation in that direction is possible
      if (direction === "left" && !canSwipeNext) return false;
      if (direction === "right" && !canSwipePrevious) return false;
      return true;
    },
    onDragEnd: (currentTranslateX, width) => {
      const swipeDistance = Math.abs(currentTranslateX);
      const goingNext = currentTranslateX < 0;
      const canNavigate =
        (goingNext && canSwipeNext) || (!goingNext && canSwipePrevious);

      const threshold = width * SWIPE_THRESHOLD_RATIO;

      if (swipeDistance > threshold && canNavigate) {
        // Start exit animation
        setAnimationPhase("exiting");
        setTranslateX(goingNext ? -width : width);

        // After exit animation, navigate and enter
        animationTimeoutRef.current = setTimeout(() => {
          if (!containerRef.current) return;

          // Update step tracking before callback
          prevStepRef.current += goingNext ? 1 : -1;

          // Trigger navigation (changes children)
          if (goingNext) {
            onSwipeNext?.();
          } else {
            onSwipePrevious?.();
          }

          startEntranceAnimation(goingNext, width, setTranslateX);
        }, TRANSITION_DURATION_MS);

        return true; // Hook keeps position (we're handling animation)
      }

      // Snap back to center (below threshold)
      return false; // Hook resets position
    },
  });

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
        // Going forward: new panel enters from the right (carousel style)
        // Going backward: new panel enters from the left
        //
        // ESLint disable rationale: These setState calls are intentionally synchronous within
        // useLayoutEffect to set the initial off-screen position BEFORE browser paint.
        // This prevents a flash of content at position 0 before animating.
        setTranslateX(goingForward ? containerWidth : -containerWidth);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setAnimationPhase("entering");

        // Double rAF ensures initial position renders before transition starts.
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setTranslateX(0);
          });
        });

        // Complete animation
        const timeoutId = setTimeout(() => {
          setAnimationPhase("idle");
          animationTimeoutRef.current = null;
        }, TRANSITION_DURATION_MS);
        animationTimeoutRef.current = timeoutId;

        // Cleanup: cancel timeout if effect re-runs or component unmounts during animation
        return () => {
          clearTimeout(timeoutId);
        };
      }
    }
  }, [currentStep, containerWidth, animationPhase, setTranslateX]);

  // Determine if transition should be animated
  // Animate when: not dragging AND not in an instant jump
  // isJumping is true only during the instant position jump before entrance animation
  const shouldAnimate = !isDragging && !isJumping;

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden"
      {...handlers}
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
