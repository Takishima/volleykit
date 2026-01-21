import { memo } from 'react'

import { User, MapPin, TrainFront, CalendarX2 } from '@/shared/components/icons'

export interface ActiveFilterIconsProps {
  /** Whether the "hide own" filter is active */
  hideOwnActive: boolean
  /** Whether the distance filter is active */
  distanceActive: boolean
  /** Whether the travel time filter is active */
  travelTimeActive: boolean
  /** Whether the game gap filter is active */
  gameGapActive: boolean
  /** Whether the level filter is active (demo mode) */
  levelActive: boolean
}

function ActiveFilterIconsComponent({
  hideOwnActive,
  distanceActive,
  travelTimeActive,
  gameGapActive,
  levelActive,
}: ActiveFilterIconsProps) {
  const hasActiveFilters =
    hideOwnActive || distanceActive || travelTimeActive || gameGapActive || levelActive

  if (!hasActiveFilters) return null

  return (
    <div className="flex items-center gap-1">
      {hideOwnActive && (
        <span className="w-5 h-5 p-0.5 rounded-full bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-300">
          <User className="w-full h-full" />
        </span>
      )}
      {distanceActive && (
        <span className="w-5 h-5 p-0.5 rounded-full bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-300">
          <MapPin className="w-full h-full" />
        </span>
      )}
      {travelTimeActive && (
        <span className="w-5 h-5 p-0.5 rounded-full bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-300">
          <TrainFront className="w-full h-full" />
        </span>
      )}
      {gameGapActive && (
        <span className="w-5 h-5 p-0.5 rounded-full bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-300">
          <CalendarX2 className="w-full h-full" />
        </span>
      )}
      {levelActive && (
        <span className="w-5 h-5 p-0.5 rounded-full bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-300">
          <User className="w-full h-full" />
        </span>
      )}
    </div>
  )
}

export const ActiveFilterIcons = memo(ActiveFilterIconsComponent)
