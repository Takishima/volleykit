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
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  const [blockClicks, setBlockClicks] = useState(false);

  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const currentTranslateRef = useRef(0); // Track actual translation during drag
  const directionRef = useRef<"horizontal" | "vertical" | null>(null);
  const touchActiveRef = useRef(false);
  const mouseActiveRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasDraggedRef = useRef(false);
  const clickBlockTimeoutRef = useRef<number | null>(null);

  const thresholds = useMemo(() => {
    if (containerWidth === null || containerWidth === 0) return null;
    return {
      drawerOpen: containerWidth * DRAWER_OPEN_RATIO,
      full: containerWidth * FULL_SWIPE_RATIO,
      minVisibility: containerWidth * MINIMUM_SWIPE_RATIO,
    };
  }, [containerWidth]);

  const getSwipeActions = useCallback(
    (direction: "left" | "right"): SwipeAction[] | null => {
      if (swipeConfig) {
        const actions = swipeConfig[direction];
        if (!actions) return null;
        return Array.isArray(actions) ? actions : [actions];
      }

      const legacyAction = direction === "left" ? onSwipeLeft : onSwipeRight;
      if (!legacyAction) return null;

      return [
        {
          id: `legacy-${direction}`,
          label: direction === "left" ? leftActionLabel : rightActionLabel,
          color: direction === "left" ? leftActionColor : rightActionColor,
          onAction: legacyAction,
        },
      ];
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

  const closeDrawer = useCallback(() => {
    setTranslateX(0);
    currentTranslateRef.current = 0;
    setIsDrawerOpen(false);
  }, []);

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

  useEffect(() => {
    if (!isDrawerOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        closeDrawer();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isDrawerOpen, closeDrawer]);

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
        closeDrawer();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [showActions, closeDrawer]);

  const handleDragStart = useCallback(
    (clientX: number, clientY: number) => {
      startXRef.current = clientX;
      startYRef.current = clientY;
      directionRef.current = null;
      hasDraggedRef.current = false;
      setIsDragging(true);

      // If drawer is open, start from current position
      if (isDrawerOpen) {
        currentTranslateRef.current = translateX;
      } else {
        currentTranslateRef.current = 0;
      }
    },
    [isDrawerOpen, translateX],
  );

  const handleDragMove = useCallback(
    (clientX: number, clientY: number, preventDefault: () => void) => {
      if (!thresholds) return;

      const diffX = clientX - startXRef.current;
      const diffY = clientY - startYRef.current;

      if (directionRef.current === null) {
        if (Math.abs(diffX) > 10 || Math.abs(diffY) > 10) {
          directionRef.current =
            Math.abs(diffX) > Math.abs(diffY) ? "horizontal" : "vertical";
        }
      }

      if (directionRef.current === "horizontal") {
        const newTranslate = currentTranslateRef.current + diffX;
        const swipeDirection = newTranslate > 0 ? "right" : "left";
        const actions = getSwipeActions(swipeDirection);

        if (!actions) {
          return;
        }

        preventDefault();
        hasDraggedRef.current = true;

        // Apply resistance when pulling beyond bounds
        const maxSwipe = thresholds.full * SWIPE_OVERSHOOT_MULTIPLIER;
        const clampedTranslate = Math.max(
          -maxSwipe,
          Math.min(maxSwipe, newTranslate),
        );

        setTranslateX(clampedTranslate);
      }
    },
    [getSwipeActions, thresholds],
  );

  const handleDragEnd = useCallback(() => {
    if (!thresholds) return;

    // Block clicks temporarily after a horizontal drag occurred
    // Guard: only set up timeout if drag actually happened (prevents race conditions)
    // Any existing timeout is cleared first to handle rapid drag operations
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

    if (directionRef.current === "horizontal") {
      const currentSwipeAmount = Math.abs(translateX);
      const swipeDirection = translateX > 0 ? "right" : "left";
      const actions = getSwipeActions(swipeDirection);

      // Full swipe - trigger the action furthest in swipe direction
      // Swipe left: first action (leftmost, furthest left)
      // Swipe right: first action (leftmost visually, but furthest right in swipe direction)
      if (actions && currentSwipeAmount > thresholds.full) {
        const defaultAction = actions[0];
        if (defaultAction) {
          defaultAction.onAction();
        }
        closeDrawer();
        directionRef.current = null;
        return;
      }

      // Partial swipe past threshold - open drawer fully
      if (
        actions &&
        currentSwipeAmount > thresholds.drawerOpen &&
        containerWidth
      ) {
        // Calculate drawer width based on number of actions (each ~80px + gaps)
        const drawerWidth = Math.min(
          actions.length * ACTION_BUTTON_WIDTH +
            (actions.length - 1) * ACTION_BUTTON_GAP +
            DRAWER_PADDING,
          containerWidth * MAX_DRAWER_WIDTH_RATIO,
        );

        const targetPosition =
          swipeDirection === "left" ? -drawerWidth : drawerWidth;
        setTranslateX(targetPosition);
        currentTranslateRef.current = targetPosition;
        setIsDrawerOpen(true);
        onDrawerOpen?.();
        directionRef.current = null;
        return;
      }

      // Below threshold - close
      closeDrawer();
    }

    directionRef.current = null;
  }, [
    translateX,
    getSwipeActions,
    closeDrawer,
    thresholds,
    containerWidth,
    onDrawerOpen,
  ]);

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
    touchActiveRef.current = false;
    setIsDragging(false);
    handleDragEnd();
  }, [handleDragEnd]);

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
    setIsDragging(false);
    handleDragEnd();
  }, [handleDragEnd]);

  // Capture phase click handler prevents card expansion when drawer is open
  // This is separate from post-drag blocking: drawer open = persistent block until closed,
  // post-drag = temporary 150ms block via blockClicks state + pointerEvents: none
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

  const handleLeftAction = useCallback(() => {
    setShowActions(false);
    closeDrawer();
    if (leftActions?.[0]) {
      leftActions[0].onAction();
    }
  }, [leftActions, closeDrawer]);

  const handleRightAction = useCallback(() => {
    setShowActions(false);
    closeDrawer();
    if (rightActions?.[0]) {
      rightActions[0].onAction();
    }
  }, [rightActions, closeDrawer]);

  // Determine which actions to show based on swipe direction
  const currentDirection = translateX > 0 ? "right" : "left";
  const currentActions =
    currentDirection === "right" ? rightActions : leftActions;
  const swipeAmount = Math.abs(translateX);
  const showProgressiveActions =
    thresholds && swipeAmount > thresholds.minVisibility && currentActions;

  // Calculate action widths for progressive reveal
  const getActionStyle = useCallback(
    (totalActions: number) => {
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
    },
    [thresholds, containerWidth, swipeAmount, isDrawerOpen],
  );

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
                    0.3,
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
        onTouchStart={hasAnyAction ? handleTouchStart : undefined}
        onTouchMove={hasAnyAction ? handleTouchMove : undefined}
        onTouchEnd={hasAnyAction ? handleTouchEnd : undefined}
        onMouseDown={hasAnyAction ? handleMouseDown : undefined}
        onMouseMove={hasAnyAction ? handleMouseMove : undefined}
        onMouseUp={hasAnyAction ? handleMouseUp : undefined}
        onMouseLeave={hasAnyAction ? handleMouseUp : undefined}
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
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
        <div
          onClick={() => setShowActions(false)}
          className="absolute inset-0 z-20 bg-black/50 rounded-xl flex items-center justify-center gap-2 p-4"
        >
          <div
            role="dialog"
            aria-label="Card actions"
            aria-modal="true"
            className="flex items-center justify-center gap-2"
          >
            {rightActions?.[0] && (
              <button
                ref={(el) => el?.focus()}
                onClick={(e) => {
                  e.stopPropagation();
                  handleRightAction();
                }}
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
                onClick={(e) => {
                  e.stopPropagation();
                  handleLeftAction();
                }}
                className={`${leftActions[0].color} text-white px-4 py-2 rounded-lg font-medium text-sm hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-white ml-2`}
              >
                {leftActions[0].label}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
