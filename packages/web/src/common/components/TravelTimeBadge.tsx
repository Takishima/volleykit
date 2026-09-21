import { memo } from 'react'

import { Badge } from '@/common/components/Badge'
import { Bike, TrainFront } from '@/common/components/icons'
import { useTranslation } from '@/common/hooks/useTranslation'
import { formatTravelTime } from '@/common/hooks/useTravelTime'
import type { TravelMode } from '@/common/services/transport'

interface TravelTimeBadgeProps {
  /** Travel time in minutes */
  durationMinutes: number | undefined
  /**
   * Travel mode the displayed result was calculated with.
   * Comes from the TravelTimeResult, so fallback results (e-bike setting on,
   * but no adaptable rail portion) correctly show as public transport.
   */
  travelMode?: TravelMode
  /** Whether the travel time is currently loading */
  isLoading?: boolean
  /** Whether there was an error fetching travel time */
  isError?: boolean
  /** Additional CSS classes */
  className?: string
}

function TravelTimeBadgeComponent({
  durationMinutes,
  travelMode,
  isLoading = false,
  isError = false,
  className = '',
}: TravelTimeBadgeProps) {
  const { t } = useTranslation()
  const showBikeIcon = travelMode === 'ebikeTrain'

  if (isLoading) {
    return (
      <Badge variant="neutral" className={`animate-pulse ${className}`}>
        <span className="flex items-center gap-1">
          <TrainFront className="w-3 h-3" aria-hidden="true" />
          <span>...</span>
        </span>
      </Badge>
    )
  }

  if (isError || durationMinutes === undefined) {
    return null
  }

  return (
    <Badge variant="neutral" className={className} title={t('exchange.travelTime')}>
      <span className="flex items-center gap-1">
        {showBikeIcon && <Bike className="w-3 h-3" aria-hidden="true" />}
        <TrainFront className="w-3 h-3" aria-hidden="true" />
        <span>{formatTravelTime(durationMinutes)}</span>
      </span>
    </Badge>
  )
}

export const TravelTimeBadge = memo(TravelTimeBadgeComponent)
