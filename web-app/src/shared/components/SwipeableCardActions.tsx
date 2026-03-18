import type { SwipeAction } from '../../types/swipe'

const ACTION_BUTTON_GAP = 4
const ACTION_BUTTON_WIDTH = 72
const OPACITY_FADE_MULTIPLIER = 1.5
const MIN_CLICKABLE_WIDTH = 30
const SCALE_MIN = 0.8
const SCALE_RANGE = 0.2
const MAX_HINT_OPACITY = 0.3

interface ActionStyle {
  width: number
  opacity: number
  transform: string
}

function getActionStyle(
  totalActions: number,
  swipeAmount: number,
  drawerOpenThreshold: number,
  isDrawerOpen: boolean
): ActionStyle {
  const progress = Math.min(swipeAmount / drawerOpenThreshold, 1)
  const revealedWidth = swipeAmount
  const actionShare = revealedWidth / totalActions
  const width = Math.min(actionShare - ACTION_BUTTON_GAP, ACTION_BUTTON_WIDTH)
  const opacity = Math.min((width / ACTION_BUTTON_WIDTH) * OPACITY_FADE_MULTIPLIER, 1)

  return {
    width: isDrawerOpen ? ACTION_BUTTON_WIDTH : Math.max(0, width),
    opacity: isDrawerOpen ? 1 : opacity,
    transform: `scale(${isDrawerOpen ? 1 : SCALE_MIN + progress * SCALE_RANGE})`,
  }
}

interface SwipeableCardActionsProps {
  actions: SwipeAction[]
  direction: 'left' | 'right'
  translateX: number
  swipeAmount: number
  thresholds: { drawerOpen: number; full: number }
  isDrawerOpen: boolean
  onCloseDrawer: () => void
}

export function SwipeableCardActions({
  actions,
  direction,
  translateX,
  swipeAmount,
  thresholds,
  isDrawerOpen,
  onCloseDrawer,
}: SwipeableCardActionsProps) {
  const style = getActionStyle(actions.length, swipeAmount, thresholds.drawerOpen, isDrawerOpen)

  return (
    <div
      className={`absolute inset-y-0 ${direction === 'right' ? 'left-0' : 'right-0'} flex items-stretch ${direction === 'right' ? 'flex-row' : 'flex-row-reverse'}`}
      style={{
        width: Math.abs(translateX),
      }}
    >
      {actions.map((action, index) => {
        const isFirstButton = index === 0

        return (
          <button
            key={action.id}
            onClick={(e) => {
              e.stopPropagation()
              action.onAction()
              onCloseDrawer()
            }}
            className={`${action.color} text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-white focus:ring-inset flex flex-col items-center justify-center gap-1 transition-transform overflow-hidden shrink-0 ${!isFirstButton ? 'border-l border-white/25' : ''}`}
            style={{
              width: style.width,
              opacity: style.opacity,
              pointerEvents: style.width > MIN_CLICKABLE_WIDTH ? 'auto' : 'none',
            }}
            aria-label={action.label}
          >
            {action.icon}
            <span className="text-xs font-medium">
              {action.shortLabel || action.label.split(' ')[0]}
            </span>
          </button>
        )
      })}

      {/* Full swipe indicator - shows when approaching full swipe threshold */}
      {!isDrawerOpen && swipeAmount > thresholds.drawerOpen && actions.length > 0 && actions[0] && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{
            opacity: Math.min(
              (swipeAmount - thresholds.drawerOpen) / (thresholds.full - thresholds.drawerOpen),
              MAX_HINT_OPACITY
            ),
          }}
        >
          <div className={`${actions[0].color} absolute inset-0`} />
        </div>
      )}
    </div>
  )
}
