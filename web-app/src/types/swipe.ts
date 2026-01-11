import type { ReactNode } from 'react'

export interface SwipeAction {
  id: string
  label: string
  /** Short label for iOS-style display (one word under icon). Defaults to first word of label. */
  shortLabel?: string
  color: string
  onAction: () => void
  icon?: ReactNode
}

export interface SwipeConfig {
  left?: SwipeAction | SwipeAction[]
  right?: SwipeAction | SwipeAction[]
}

/**
 * Swipe thresholds as ratios of container width.
 * These values ensure consistent swipe behavior across different screen sizes.
 *
 * iOS-style swipe behavior:
 * - Swipe a little: actions progressively reveal
 * - Swipe past DRAWER_OPEN_RATIO: drawer snaps open fully
 * - Swipe past FULL_SWIPE_RATIO: default action triggers immediately
 *
 * - DRAWER_OPEN_RATIO (30%): Swipe distance to open the action drawer fully.
 *   Lower threshold makes it easier to reveal actions.
 *
 * - FULL_SWIPE_RATIO (70%): Swipe distance to trigger the default (rightmost) action.
 *   Users must swipe across most of the screen width, preventing accidental triggers.
 *
 * - MINIMUM_SWIPE_RATIO (3%): Minimum movement to show visual feedback.
 *   This small threshold helps distinguish intentional horizontal swipes from vertical scrolls.
 */
export const DRAWER_OPEN_RATIO = 0.3
export const FULL_SWIPE_RATIO = 0.7
export const MINIMUM_SWIPE_RATIO = 0.03

/**
 * Standard icon size for swipe action buttons.
 * Used consistently across all swipe action configurations.
 */
export const SWIPE_ACTION_ICON_SIZE = 20

/**
 * Layout constants for swipe action drawer buttons.
 * Used by SwipeableCard and TourAutoSwipe for consistent drawer sizing.
 */
export const ACTION_BUTTON_WIDTH = 72
export const ACTION_BUTTON_GAP = 8
export const DRAWER_PADDING = 16

/**
 * Custom event interface for tour auto-swipe coordination.
 * Dispatched by TourAutoSwipe, listened to by SwipeableCard.
 */
export interface TourSwipeStartEvent extends CustomEvent {
  detail: { translateX: number }
}
