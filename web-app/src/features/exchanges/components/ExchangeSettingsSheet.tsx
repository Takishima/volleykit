import { useState, useCallback, memo, useMemo } from 'react'

import { useShallow } from 'zustand/react/shallow'

import { useActiveAssociationCode } from '@/features/auth/hooks/useActiveAssociation'
import { Settings, X, MapPin, TrainFront, Clock } from '@/shared/components/icons'
import { ResponsiveSheet } from '@/shared/components/ResponsiveSheet'
import { useTranslation } from '@/shared/hooks/useTranslation'
import { useTravelTimeAvailable } from '@/shared/hooks/useTravelTime'
import { useSettingsStore } from '@/shared/stores/settings'
import { formatTravelTime, MINUTES_PER_HOUR } from '@/shared/utils/format-travel-time'

/** Distance presets for the slider (in kilometers) */
// eslint-disable-next-line @typescript-eslint/no-magic-numbers -- intentional UI presets
const DISTANCE_PRESETS = [10, 25, 50, 75, 100]

/** Travel time presets for the slider (in minutes) */
// eslint-disable-next-line @typescript-eslint/no-magic-numbers -- intentional UI presets
const TRAVEL_TIME_PRESETS = [30, 45, 60, 90, 120]

/** Game gap presets for the slider (in minutes) */
// eslint-disable-next-line @typescript-eslint/no-magic-numbers -- intentional UI presets
const GAME_GAP_PRESETS = [60, 90, 120, 150, 180]

interface ExchangeSettingsSheetProps {
  dataTour?: string
}

function ExchangeSettingsSheetComponent({ dataTour }: ExchangeSettingsSheetProps) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const isTravelTimeAvailable = useTravelTimeAvailable()
  const associationCode = useActiveAssociationCode()

  const {
    homeLocation,
    distanceFilter,
    distanceFilterByAssociation,
    setDistanceFilterForAssociation,
    travelTimeFilter,
    setMaxTravelTimeForAssociation,
    gameGapFilter,
    setMinGameGapMinutes,
  } = useSettingsStore(
    useShallow((state) => ({
      homeLocation: state.homeLocation,
      distanceFilter: state.distanceFilter,
      distanceFilterByAssociation: state.distanceFilterByAssociation,
      setDistanceFilterForAssociation: state.setDistanceFilterForAssociation,
      travelTimeFilter: state.travelTimeFilter,
      setMaxTravelTimeForAssociation: state.setMaxTravelTimeForAssociation,
      gameGapFilter: state.gameGapFilter,
      setMinGameGapMinutes: state.setMinGameGapMinutes,
    }))
  )

  // Get function separately - functions don't need shallow comparison
  const isTransportEnabledForAssociation = useSettingsStore(
    (state) => state.isTransportEnabledForAssociation
  )

  // Get per-association distance filter
  const currentDistanceFilter = useMemo(() => {
    const filterMap = distanceFilterByAssociation ?? {}
    if (associationCode && filterMap[associationCode] !== undefined) {
      return filterMap[associationCode]
    }
    return distanceFilter
  }, [associationCode, distanceFilterByAssociation, distanceFilter])

  // Get per-association max travel time
  const currentMaxTravelTime = useMemo(() => {
    const timeMap = travelTimeFilter.maxTravelTimeByAssociation ?? {}
    if (associationCode && timeMap[associationCode] !== undefined) {
      return timeMap[associationCode]
    }
    return travelTimeFilter.maxTravelTimeMinutes
  }, [associationCode, travelTimeFilter])

  const handleDistanceChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!associationCode) return
      setDistanceFilterForAssociation(associationCode, {
        maxDistanceKm: Number(e.target.value),
      })
    },
    [associationCode, setDistanceFilterForAssociation]
  )

  const handleTravelTimeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!associationCode) return
      setMaxTravelTimeForAssociation(associationCode, Number(e.target.value))
    },
    [associationCode, setMaxTravelTimeForAssociation]
  )

  const handleGameGapChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setMinGameGapMinutes(Number(e.target.value))
    },
    [setMinGameGapMinutes]
  )

  // Determine which settings are available
  const hasHomeLocation = Boolean(homeLocation)
  const canShowDistanceSlider = hasHomeLocation
  // Use association-specific transport check for consistency with ExchangePage
  const isTransportEnabled = isTransportEnabledForAssociation(associationCode)
  const canShowTravelTimeSlider = hasHomeLocation && isTransportEnabled && isTravelTimeAvailable
  // Game gap slider is always available since it works with user's calendar assignments

  // Format distance for display
  const formatDistance = (km: number): string => {
    return `${km} ${t('common.distanceUnit')}`
  }

  const timeUnits = {
    minutesUnit: t('common.minutesUnit'),
    hoursUnit: t('common.hoursUnit'),
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        data-tour={dataTour}
        aria-label={t('exchange.settings.title')}
        className="
          inline-flex items-center justify-center p-1.5 rounded-full
          text-text-muted dark:text-text-muted-dark
          hover:bg-surface-subtle dark:hover:bg-surface-subtle-dark
          hover:text-text-primary dark:hover:text-text-primary-dark
          transition-colors cursor-pointer
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1
        "
      >
        <Settings className="w-5 h-5" />
      </button>

      <ResponsiveSheet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        titleId="exchange-settings-title"
      >
        <div className="flex items-center justify-between p-4 border-b border-border-default dark:border-border-default-dark">
          <h2
            id="exchange-settings-title"
            className="text-lg font-semibold text-text-primary dark:text-text-primary-dark"
          >
            {t('exchange.settings.title')}
          </h2>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-2 -m-2 text-text-muted dark:text-text-muted-dark hover:text-text-primary dark:hover:text-text-primary-dark transition-colors"
            aria-label={t('common.close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-6 overflow-y-auto">
          {/* Max Distance slider */}
          {canShowDistanceSlider && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-text-muted dark:text-text-muted-dark" />
                <label
                  htmlFor="max-distance"
                  className="text-sm font-medium text-text-primary dark:text-text-primary-dark"
                >
                  {t('exchange.settings.maxDistance')}
                </label>
                <span className="ml-auto text-sm font-semibold text-primary-600 dark:text-primary-400">
                  {formatDistance(currentDistanceFilter.maxDistanceKm)}
                </span>
              </div>

              <input
                id="max-distance"
                type="range"
                min={DISTANCE_PRESETS[0]}
                max={DISTANCE_PRESETS[DISTANCE_PRESETS.length - 1]}
                step={5}
                value={currentDistanceFilter.maxDistanceKm}
                onChange={handleDistanceChange}
                className="w-full h-2 bg-surface-muted dark:bg-surface-subtle-dark rounded-lg appearance-none cursor-pointer accent-primary-600"
              />

              {/* Preset labels */}
              <div className="flex justify-between text-xs text-text-muted dark:text-text-muted-dark">
                {DISTANCE_PRESETS.map((preset) => (
                  <span key={preset}>{preset} km</span>
                ))}
              </div>
            </div>
          )}

          {/* Max Travel Time slider */}
          {canShowTravelTimeSlider && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <TrainFront className="w-5 h-5 text-text-muted dark:text-text-muted-dark" />
                <label
                  htmlFor="max-travel-time"
                  className="text-sm font-medium text-text-primary dark:text-text-primary-dark"
                >
                  {t('exchange.settings.maxTravelTime')}
                </label>
                <span className="ml-auto text-sm font-semibold text-primary-600 dark:text-primary-400">
                  {formatTravelTime(currentMaxTravelTime, timeUnits)}
                </span>
              </div>

              <input
                id="max-travel-time"
                type="range"
                min={TRAVEL_TIME_PRESETS[0]}
                max={TRAVEL_TIME_PRESETS[TRAVEL_TIME_PRESETS.length - 1]}
                step={15}
                value={currentMaxTravelTime}
                onChange={handleTravelTimeChange}
                className="w-full h-2 bg-surface-muted dark:bg-surface-subtle-dark rounded-lg appearance-none cursor-pointer accent-primary-600"
              />

              {/* Preset labels */}
              <div className="flex justify-between text-xs text-text-muted dark:text-text-muted-dark">
                {TRAVEL_TIME_PRESETS.map((preset) => (
                  <span key={preset}>
                    {preset < MINUTES_PER_HOUR ? `${preset}m` : `${preset / MINUTES_PER_HOUR}h`}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Min Game Gap slider - always shown */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-text-muted dark:text-text-muted-dark" />
              <label
                htmlFor="min-game-gap"
                className="text-sm font-medium text-text-primary dark:text-text-primary-dark"
              >
                {t('exchange.settings.minGameGap')}
              </label>
              <span className="ml-auto text-sm font-semibold text-primary-600 dark:text-primary-400">
                {formatTravelTime(gameGapFilter.minGapMinutes, timeUnits)}
              </span>
            </div>

            <input
              id="min-game-gap"
              type="range"
              min={GAME_GAP_PRESETS[0]}
              max={GAME_GAP_PRESETS[GAME_GAP_PRESETS.length - 1]}
              step={15}
              value={gameGapFilter.minGapMinutes}
              onChange={handleGameGapChange}
              className="w-full h-2 bg-surface-muted dark:bg-surface-subtle-dark rounded-lg appearance-none cursor-pointer accent-primary-600"
            />

            {/* Preset labels */}
            <div className="flex justify-between text-xs text-text-muted dark:text-text-muted-dark">
              {GAME_GAP_PRESETS.map((preset) => (
                <span key={preset}>
                  {preset < MINUTES_PER_HOUR ? `${preset}m` : `${preset / MINUTES_PER_HOUR}h`}
                </span>
              ))}
            </div>
          </div>

          {/* Info text */}
          <p className="text-xs text-text-muted dark:text-text-muted-dark">
            {t('exchange.settings.description')}
          </p>
        </div>
      </ResponsiveSheet>
    </>
  )
}

export const ExchangeSettingsSheet = memo(ExchangeSettingsSheetComponent)
