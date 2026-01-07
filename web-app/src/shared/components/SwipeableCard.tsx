import {
  type ReactNode,
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import {
  type SwipeConfig,
  type SwipeAction,
  DRAWER_OPEN_RATIO,
  FULL_SWIPE_RATIO,
  MINIMUM_SWIPE_RATIO,
} from "../../types/swipe";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { useSwipeGesture } from "@/shared/hooks/useSwipeGesture";

// Layout constants for action buttons
const ACTION_BUTTON_WIDTH = 72;
const ACTION_BUTTON_GAP = 8;
const DRAWER_PADDING = 16;
const MAX_DRAWER_WIDTH_RATIO = 0.8;
const SWIPE_OVERSHOOT_MULTIPLIER = 1.2;
const OPACITY_FADE_MULTIPLIER = 1.5;
const MIN_CLICKABLE_WIDTH = 30;
// Scale animation constants
const SCALE_MIN = 0.8; // Minimum scale when action first appears
const SCALE_RANGE = 0.2; // Scale grows from 0.8 to 1.0
// Click blocking delay after drag ends (prevents unwanted expansion)
// 150ms provides margin for click event to fire after mouseup
const CLICK_BLOCK_DELAY_MS = 150;
// Maximum opacity for action hint overlay
const MAX_HINT_OPACITY = 0.3;

/** Calculate drawer width based on number of actions */
function calculateDrawerWidth(actionsCount: number, containerWidth: number): number {
  return Math.min(
    actionsCount * ACTION_BUTTON_WIDTH +
      (actionsCount - 1) * ACTION_BUTTON_GAP +
      DRAWER_PADDING,
    containerWidth * MAX_DRAWER_WIDTH_RATIO,
  );
}

/** Normalize swipe config actions to array format */
function normalizeActions(
  actions: SwipeAction | SwipeAction[] | undefined,
): SwipeAction[] | null {
  if (!actions) return null;
  return Array.isArray(actions) ? actions : [actions];
}

/** Build legacy action from props */
function buildLegacyAction(
  direction: "left" | "right",
  onAction: (() => void) | undefined,
  label: string,
  color: string,
): SwipeAction[] | null {
  if (!onAction) return null;
  return [{ id: `legacy-${direction}`, label, color, onAction }];
}

interface SwipeableCardRenderProps {
  isDrawerOpen: boolean;
}

interface SwipeableCardProps {
  children: ReactNode | ((props: SwipeableCardRenderProps) => ReactNode);
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftActionLabel?: string;
  rightActionLabel?: string;
  leftActionColor?: string;
  rightActionColor?: string;
  swipeConfig?: SwipeConfig;
  className?: string;
  /** Callback when drawer opens - can be used to close other open drawers */
  onDrawerOpen?: () => void;
}

export function SwipeableCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftActionLabel = "Action",
  rightActionLabel = "Action",
  leftActionColor = "bg-danger-500",
  rightActionColor = "bg-success-500",
  swipeConfig,
  className = "",
  onDrawerOpen,
}: SwipeableCardProps) {
  const { t } = useTranslation();
  const [showActions, setShowActions] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [blockClicks, setBlockClicks] = useState(false);

  const hasDraggedRef = useRef(false);
  const clickBlockTimeoutRef = useRef<number | null>(null);
  const currentTranslateRef = useRef(0);

  const getSwipeActions = useCallback(
    (direction: "left" | "right"): SwipeAction[] | null => {
      if (swipeConfig) {
        return normalizeActions(swipeConfig[direction]);
      }
      const isLeft = direction === "left";
      return buildLegacyAction(
        direction,
        isLeft ? onSwipeLeft : onSwipeRight,
        isLeft ? leftActionLabel : rightActionLabel,
        isLeft ? leftActionColor : rightActionColor,
      );
    },
    [
      swipeConfig,
      onSwipeLeft,
      onSwipeRight,
      leftActionLabel,
      rightActionLabel,
      leftActionColor,
      rightActionColor,
    ],
  );

  const leftActions = getSwipeActions("left");
  const rightActions = getSwipeActions("right");
  const hasAnyAction = leftActions !== null || rightActions !== null;

  // Use the swipe gesture hook
  // Max swipe should allow full swipe (70%) with overshoot (1.2x)
  // Since threshold defaults to 30% of container, multiplier = 0.7 * 1.2 / 0.3 = 2.8
  const maxSwipeRatio = FULL_SWIPE_RATIO * SWIPE_OVERSHOOT_MULTIPLIER / DRAWER_OPEN_RATIO;
  const {
    containerRef,
    translateX,
    isDragging,
    containerWidth,
    setTranslateX,
    resetPosition,
    handlers,
  } = useSwipeGesture({
    enabled: hasAnyAction,
    getInitialTranslateX: () => (isDrawerOpen ? currentTranslateRef.current : 0),
    maxSwipeMultiplier: maxSwipeRatio,
    canSwipe: (_diffX, direction) => {
      const actions = getSwipeActions(direction);
      return actions !== null;
    },
    onDragStart: () => {
      if (isDrawerOpen) {
        currentTranslateRef.current = translateX;
      } else {
        currentTranslateRef.current = 0;
      }
    },
    onDragMove: () => {
      hasDraggedRef.current = true;
    },
    onDragEnd: (currentTranslateX, width) => {
      // Block clicks temporarily after a horizontal drag occurred
      if (hasDraggedRef.current) {
        setBlockClicks(true);
        if (clickBlockTimeoutRef.current !== null) {
          clearTimeout(clickBlockTimeoutRef.current);
        }
        clickBlockTimeoutRef.current = window.setTimeout(() => {
          setBlockClicks(false);
          hasDraggedRef.current = false;
          clickBlockTimeoutRef.current = null;
        }, CLICK_BLOCK_DELAY_MS);
      }

      const swipeAmount = Math.abs(currentTranslateX);
      const swipeDirection = currentTranslateX > 0 ? "right" : "left";
      const actions = getSwipeActions(swipeDirection);
      const drawerThreshold = width * DRAWER_OPEN_RATIO;
      const fullThreshold = width * FULL_SWIPE_RATIO;

      // Helper to reset drawer state
      const closeAndReset = () => {
        currentTranslateRef.current = 0;
        setIsDrawerOpen(false);
        return false; // Hook resets position
      };

      // No actions or below threshold - close drawer
      if (!actions || swipeAmount <= drawerThreshold) {
        return closeAndReset();
      }

      // Full swipe - trigger the primary action
      if (swipeAmount > fullThreshold) {
        actions[0]?.onAction();
        return closeAndReset();
      }

      // Partial swipe past threshold - open drawer fully
      const drawerWidth = calculateDrawerWidth(actions.length, width);
      const targetPosition = swipeDirection === "left" ? -drawerWidth : drawerWidth;
      setTranslateX(targetPosition);
      currentTranslateRef.current = targetPosition;
      setIsDrawerOpen(true);
      onDrawerOpen?.();
      return true; // Hook keeps position
    },
  });

  const thresholds = useMemo(() => {
    if (containerWidth === null || containerWidth === 0) return null;
    return {
      drawerOpen: containerWidth * DRAWER_OPEN_RATIO,
      full: containerWidth * FULL_SWIPE_RATIO,
      minVisibility: containerWidth * MINIMUM_SWIPE_RATIO,
    };
  }, [containerWidth]);

  // Not memoized with useCallback: React Compiler cannot preserve memoization when
  // closeDrawer depends on resetPosition (from hook), which creates a circular dependency.
  // The effects using closeDrawer inline the logic directly to avoid this issue.
  const closeDrawer = () => {
    resetPosition();
    currentTranslateRef.current = 0;
    setIsDrawerOpen(false);
  };

  useEffect(() => {
    if (!isDrawerOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        resetPosition();
        currentTranslateRef.current = 0;
        setIsDrawerOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isDrawerOpen, containerRef, resetPosition]);

  useEffect(() => {
    return () => {
      if (clickBlockTimeoutRef.current !== null) {
        clearTimeout(clickBlockTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!showActions) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowActions(false);
        resetPosition();
        currentTranslateRef.current = 0;
        setIsDrawerOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [showActions, resetPosition]);

  // Capture phase click handler prevents card expansion when drawer is open
  const handleClickCapture = useCallback(
    (e: React.MouseEvent) => {
      if (isDrawerOpen) {
        e.stopPropagation();
        e.preventDefault();
      }
    },
    [isDrawerOpen],
  );

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setShowActions((prev) => !prev);
    }
  }, []);

  // Not memoized: depends on non-memoized closeDrawer (see comment above).
  // Only used for keyboard-accessible modal buttons, so re-creation on render is acceptable.
  const handleLeftAction = () => {
    setShowActions(false);
    closeDrawer();
    if (leftActions?.[0]) {
      leftActions[0].onAction();
    }
  };

  // Not memoized: depends on non-memoized closeDrawer (see comment above).
  // Only used for keyboard-accessible modal buttons, so re-creation on render is acceptable.
  const handleRightAction = () => {
    setShowActions(false);
    closeDrawer();
    if (rightActions?.[0]) {
      rightActions[0].onAction();
    }
  };

  // Determine which actions to show based on swipe direction
  const currentDirection = translateX > 0 ? "right" : "left";
  const currentActions =
    currentDirection === "right" ? rightActions : leftActions;
  const swipeAmount = Math.abs(translateX);
  const showProgressiveActions =
    thresholds && swipeAmount > thresholds.minVisibility && currentActions;

  // Not memoized: intentionally recalculates each render using current swipeAmount,
  // thresholds, containerWidth, and isDrawerOpen. All values change during drag animations.
  const getActionStyle = (totalActions: number) => {
    if (!thresholds || !containerWidth) return {};

    // Progressive reveal: actions expand from edge
    const progress = Math.min(swipeAmount / thresholds.drawerOpen, 1);

    // Each action gets a portion of the revealed space
    const revealedWidth = swipeAmount;
    const actionShare = revealedWidth / totalActions;

    // Width grows from 0 to ACTION_BUTTON_WIDTH as swipe progresses
    const width = Math.min(
      actionShare - ACTION_BUTTON_GAP,
      ACTION_BUTTON_WIDTH,
    );

    // Opacity fades in as action becomes visible
    const opacity = Math.min(
      (width / ACTION_BUTTON_WIDTH) * OPACITY_FADE_MULTIPLIER,
      1,
    );

    return {
      width: isDrawerOpen ? ACTION_BUTTON_WIDTH : Math.max(0, width),
      opacity: isDrawerOpen ? 1 : opacity,
      transform: `scale(${isDrawerOpen ? 1 : SCALE_MIN + progress * SCALE_RANGE})`,
    };
  };

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-xl ${className}`}
      onKeyDown={hasAnyAction ? handleKeyDown : undefined}
      tabIndex={hasAnyAction ? 0 : undefined}
      role={hasAnyAction ? "group" : undefined}
      aria-label={
        hasAnyAction
          ? "Swipeable card with actions. Press Enter to show actions."
          : undefined
      }
    >
      {/* iOS-style progressive action reveal */}
      {showProgressiveActions && thresholds && (
        <div
          className={`absolute inset-y-0 ${currentDirection === "right" ? "left-0" : "right-0"} flex items-stretch ${currentDirection === "right" ? "flex-row" : "flex-row-reverse"}`}
          style={{
            width: Math.abs(translateX),
          }}
        >
          {currentActions.map((action, index) => {
            const style = getActionStyle(currentActions.length);
            const isFirstButton = index === 0;

            return (
              <button
                key={action.id}
                onClick={(e) => {
                  e.stopPropagation();
                  action.onAction();
                  closeDrawer();
                }}
                className={`${action.color} text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-white focus:ring-inset flex flex-col items-center justify-center gap-1 transition-transform overflow-hidden shrink-0 ${!isFirstButton ? "border-l border-white/25" : ""}`}
                style={{
                  width: style.width,
                  opacity: style.opacity,
                  pointerEvents:
                    typeof style.width === "number" &&
                    style.width > MIN_CLICKABLE_WIDTH
                      ? "auto"
                      : "none",
                }}
                aria-label={action.label}
              >
                {action.icon}
                <span className="text-xs font-medium">
                  {action.shortLabel || action.label.split(" ")[0]}
                </span>
              </button>
            );
          })}

          {/* Full swipe indicator - shows when approaching full swipe threshold */}
          {!isDrawerOpen &&
            swipeAmount > thresholds.drawerOpen &&
            currentActions.length > 0 &&
            currentActions[0] && (
              <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                style={{
                  opacity: Math.min(
                    (swipeAmount - thresholds.drawerOpen) /
                      (thresholds.full - thresholds.drawerOpen),
                    MAX_HINT_OPACITY,
                  ),
                }}
              >
                <div
                  className={`${currentActions[0].color} absolute inset-0`}
                />
              </div>
            )}
        </div>
      )}

      <div
        onTouchStart={hasAnyAction ? handlers.onTouchStart : undefined}
        onTouchMove={hasAnyAction ? handlers.onTouchMove : undefined}
        onTouchEnd={hasAnyAction ? handlers.onTouchEnd : undefined}
        onMouseDown={hasAnyAction ? handlers.onMouseDown : undefined}
        onMouseMove={hasAnyAction ? handlers.onMouseMove : undefined}
        onMouseUp={hasAnyAction ? handlers.onMouseUp : undefined}
        onMouseLeave={hasAnyAction ? handlers.onMouseLeave : undefined}
        onClickCapture={hasAnyAction ? handleClickCapture : undefined}
        role={hasAnyAction ? "button" : undefined}
        tabIndex={hasAnyAction ? -1 : undefined}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isDragging
            ? "none"
            : "transform 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)",
          cursor: isDragging ? "grabbing" : hasAnyAction ? "grab" : "default",
          pointerEvents: blockClicks ? "none" : "auto",
        }}
        className="relative z-10 bg-white dark:bg-gray-800 rounded-xl"
      >
        {typeof children === "function" ? children({ isDrawerOpen }) : children}
      </div>

      {showActions && hasAnyAction && (
        // Modal overlay with action buttons - backdrop dismisses on click
        <>
          {/* Backdrop - click to dismiss, aria-hidden since it's purely visual/interactive */}
          <div
            onClick={() => setShowActions(false)}
            aria-hidden="true"
            className="absolute inset-0 z-20 bg-black/50 rounded-xl"
          />
          {/* Dialog content - positioned above backdrop */}
          <div
            role="dialog"
            aria-label={t("common.cardActions")}
            aria-modal="true"
            className="absolute inset-0 z-20 flex items-center justify-center gap-2 p-4 pointer-events-none"
          >
            <div className="flex items-center justify-center gap-2 pointer-events-auto">
              {rightActions?.[0] && (
                <button
                  ref={(el) => el?.focus()}
                  onClick={handleRightAction}
                  className={`${rightActions[0].color} text-white px-4 py-2 rounded-lg font-medium text-sm hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-white`}
                >
                  {rightActions[0].label}
                </button>
              )}
              {leftActions?.[0] && (
                <button
                  ref={(el) => {
                    if (!rightActions?.[0]) el?.focus();
                  }}
                  onClick={handleLeftAction}
                  className={`${leftActions[0].color} text-white px-4 py-2 rounded-lg font-medium text-sm hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-white ml-2`}
                >
                  {leftActions[0].label}
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
