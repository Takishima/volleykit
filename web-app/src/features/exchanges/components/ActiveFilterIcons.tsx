import { memo, useMemo } from 'react'

import { User, MapPin, TrainFront, CalendarX2, Award } from '@/shared/components/icons'
import { useTranslation } from '@/shared/hooks/useTranslation'

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
  const { t } = useTranslation()

  const hasActiveFilters =
    hideOwnActive || distanceActive || travelTimeActive || gameGapActive || levelActive

  // Build aria-label describing active filters for screen readers
  const ariaLabel = useMemo(() => {
    const activeNames: string[] = []
    if (hideOwnActive) activeNames.push(t('exchange.hideOwn'))
    if (distanceActive) activeNames.push(t('exchange.filterByDistance'))
    if (travelTimeActive) activeNames.push(t('exchange.filterByTravelTime'))
    if (gameGapActive) activeNames.push(t('exchange.filterByGameGap'))
    if (levelActive) activeNames.push(t('exchange.filterByLevel'))
    return activeNames.join(', ')
  }, [hideOwnActive, distanceActive, travelTimeActive, gameGapActive, levelActive, t])

  if (!hasActiveFilters) return null

  return (
    <div className="flex items-center gap-1" role="img" aria-label={ariaLabel}>
      {hideOwnActive && (
        <span
          className="w-5 h-5 p-0.5 rounded-full bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-300"
          aria-hidden="true"
        >
          <User className="w-full h-full" />
        </span>
      )}
      {distanceActive && (
        <span
          className="w-5 h-5 p-0.5 rounded-full bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-300"
          aria-hidden="true"
        >
          <MapPin className="w-full h-full" />
        </span>
      )}
      {travelTimeActive && (
        <span
          className="w-5 h-5 p-0.5 rounded-full bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-300"
          aria-hidden="true"
        >
          <TrainFront className="w-full h-full" />
        </span>
      )}
      {gameGapActive && (
        <span
          className="w-5 h-5 p-0.5 rounded-full bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-300"
          aria-hidden="true"
        >
          <CalendarX2 className="w-full h-full" />
        </span>
      )}
      {levelActive && (
        <span
          className="w-5 h-5 p-0.5 rounded-full bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-300"
          aria-hidden="true"
        >
          <Award className="w-full h-full" />
        </span>
      )}
    </div>
  )
}

export const ActiveFilterIcons = memo(ActiveFilterIconsComponent)
