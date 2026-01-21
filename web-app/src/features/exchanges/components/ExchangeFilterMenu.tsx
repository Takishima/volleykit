import { useState, useCallback, memo, useMemo } from 'react'

import { useShallow } from 'zustand/react/shallow'

import { useActiveAssociationCode } from '@/features/auth/hooks/useActiveAssociation'
import {
  SlidersHorizontal,
  X,
  MapPin,
  TrainFront,
  User,
  CalendarX2,
} from '@/shared/components/icons'
import { ResponsiveSheet } from '@/shared/components/ResponsiveSheet'
import { useTranslation } from '@/shared/hooks/useTranslation'
import { useSettingsStore } from '@/shared/stores/settings'
import { formatTravelTime, MINUTES_PER_HOUR } from '@/shared/utils/format-travel-time'

/** Distance presets for the slider (in kilometers) */
// eslint-disable-next-line @typescript-eslint/no-magic-numbers -- intentional UI presets
const DISTANCE_PRESETS = [10, 25, 50, 75, 100] as const
const DISTANCE_MIN = 10
const DISTANCE_MAX = 100

/** Travel time presets for the slider (in minutes) */
// eslint-disable-next-line @typescript-eslint/no-magic-numbers -- intentional UI presets
const TRAVEL_TIME_PRESETS = [30, 45, 60, 90, 120] as const
const TRAVEL_TIME_MIN = 30
const TRAVEL_TIME_MAX = 120

/** Game gap presets for the slider (in minutes) */
// eslint-disable-next-line @typescript-eslint/no-magic-numbers -- intentional UI presets
const GAME_GAP_PRESETS = [60, 90, 120, 150, 180] as const
const GAME_GAP_MIN = 60
const GAME_GAP_MAX = 180

interface FilterToggleRowProps {
  icon: React.ReactNode
  label: string
  enabled: boolean
  onToggle: () => void
  value?: string
  children?: React.ReactNode
}

function FilterToggleRow({
  icon,
  label,
  enabled,
  onToggle,
  value,
  children,
}: FilterToggleRowProps) {
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-3 rounded-lg bg-surface-subtle dark:bg-surface-subtle-dark hover:bg-surface-muted dark:hover:bg-surface-muted-dark transition-colors"
      >
        <span
          className={`w-5 h-5 flex-shrink-0 ${enabled ? 'text-primary-600 dark:text-primary-400' : 'text-text-muted dark:text-text-muted-dark'}`}
        >
          {icon}
        </span>
        <span
          className={`flex-1 text-left text-sm font-medium ${enabled ? 'text-text-primary dark:text-text-primary-dark' : 'text-text-muted dark:text-text-muted-dark'}`}
        >
          {label}
        </span>
        {value && enabled && (
          <span className="text-sm font-semibold text-primary-600 dark:text-primary-400">
            {value}
          </span>
        )}
        <div
          className={`w-10 h-6 rounded-full transition-colors relative ${enabled ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'}`}
        >
          <div
            className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-1'}`}
          />
        </div>
      </button>
      {enabled && children && <div className="px-3 pb-2">{children}</div>}
    </div>
  )
}

interface SliderControlProps {
  id: string
  value: number
  min: number
  max: number
  step: number
  presets: number[]
  formatPreset: (value: number) => string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

function SliderControl({
  id,
  value,
  min,
  max,
  step,
  presets,
  formatPreset,
  onChange,
}: SliderControlProps) {
  return (
    <div className="space-y-2">
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        className="w-full h-2 bg-surface-muted dark:bg-surface-muted-dark rounded-lg appearance-none cursor-pointer accent-primary-600"
      />
      <div className="flex justify-between text-xs text-text-muted dark:text-text-muted-dark">
        {presets.map((preset) => (
          <span key={preset}>{formatPreset(preset)}</span>
        ))}
      </div>
    </div>
  )
}

export interface ExchangeFilterMenuProps {
  /** Whether the "hide own" filter is enabled */
  hideOwnExchanges: boolean
  /** Callback when "hide own" is toggled */
  onHideOwnToggle: () => void
  /** Whether the level filter is available (demo mode only) */
  isLevelFilterAvailable: boolean
  /** Whether the distance filter is available (requires home location) */
  isDistanceFilterAvailable: boolean
  /** Whether the travel time filter is available */
  isTravelTimeFilterAvailable: boolean
  /** Whether the game gap filter is available (requires calendar data) */
  isGameGapFilterAvailable: boolean
  /** User's referee level for display (demo mode) */
  userRefereeLevel?: string | null
  /** Optional data-tour attribute */
  dataTour?: string
}

function ExchangeFilterMenuComponent({
  hideOwnExchanges,
  onHideOwnToggle,
  isLevelFilterAvailable,
  isDistanceFilterAvailable,
  isTravelTimeFilterAvailable,
  isGameGapFilterAvailable,
  userRefereeLevel,
  dataTour,
}: ExchangeFilterMenuProps) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const associationCode = useActiveAssociationCode()

  const {
    distanceFilter,
    distanceFilterByAssociation,
    setDistanceFilterEnabled,
    setDistanceFilterForAssociation,
    travelTimeFilter,
    setTravelTimeFilterEnabled,
    setMaxTravelTimeForAssociation,
    levelFilterEnabled,
    setLevelFilterEnabled,
    gameGapFilter,
    setGameGapFilterEnabled,
    setMinGameGapMinutes,
  } = useSettingsStore(
    useShallow((state) => ({
      distanceFilter: state.distanceFilter,
      distanceFilterByAssociation: state.distanceFilterByAssociation,
      setDistanceFilterEnabled: state.setDistanceFilterEnabled,
      setDistanceFilterForAssociation: state.setDistanceFilterForAssociation,
      travelTimeFilter: state.travelTimeFilter,
      setTravelTimeFilterEnabled: state.setTravelTimeFilterEnabled,
      setMaxTravelTimeForAssociation: state.setMaxTravelTimeForAssociation,
      levelFilterEnabled: state.levelFilterEnabled,
      setLevelFilterEnabled: state.setLevelFilterEnabled,
      gameGapFilter: state.gameGapFilter,
      setGameGapFilterEnabled: state.setGameGapFilterEnabled,
      setMinGameGapMinutes: state.setMinGameGapMinutes,
    }))
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

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (hideOwnExchanges) count++
    if (isDistanceFilterAvailable && distanceFilter.enabled) count++
    if (isTravelTimeFilterAvailable && travelTimeFilter.enabled) count++
    if (isLevelFilterAvailable && levelFilterEnabled) count++
    if (isGameGapFilterAvailable && gameGapFilter.enabled) count++
    return count
  }, [
    hideOwnExchanges,
    isDistanceFilterAvailable,
    distanceFilter.enabled,
    isTravelTimeFilterAvailable,
    travelTimeFilter.enabled,
    isLevelFilterAvailable,
    levelFilterEnabled,
    isGameGapFilterAvailable,
    gameGapFilter.enabled,
  ])

  const formatDistance = (km: number): string => `${km} km`
  const timeUnits = {
    minutesUnit: t('common.minutesUnit'),
    hoursUnit: t('common.hoursUnit'),
  }
  const formatTime = (minutes: number): string =>
    minutes < MINUTES_PER_HOUR ? `${minutes}m` : `${minutes / MINUTES_PER_HOUR}h`

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        data-tour={dataTour}
        className="
          inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
          text-sm font-medium
          bg-surface-subtle dark:bg-surface-subtle-dark
          text-text-primary dark:text-text-primary-dark
          hover:bg-surface-muted dark:hover:bg-surface-muted-dark
          transition-colors cursor-pointer
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1
        "
      >
        <SlidersHorizontal className="w-4 h-4" />
        <span>{t('exchange.filters')}</span>
        {activeFilterCount > 0 && (
          <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold rounded-full bg-primary-600 text-white">
            {activeFilterCount}
          </span>
        )}
      </button>

      <ResponsiveSheet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        titleId="exchange-filter-menu-title"
      >
        <div className="flex items-center justify-between p-4 border-b border-border-default dark:border-border-default-dark">
          <h2
            id="exchange-filter-menu-title"
            className="text-lg font-semibold text-text-primary dark:text-text-primary-dark"
          >
            {t('exchange.filters')}
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

        <div className="p-4 space-y-3 overflow-y-auto">
          {/* Hide own exchanges toggle */}
          <FilterToggleRow
            icon={<User className="w-full h-full" />}
            label={t('exchange.hideOwn')}
            enabled={hideOwnExchanges}
            onToggle={onHideOwnToggle}
          />

          {/* Distance filter */}
          {isDistanceFilterAvailable && (
            <FilterToggleRow
              icon={<MapPin className="w-full h-full" />}
              label={t('exchange.filterByDistance')}
              enabled={distanceFilter.enabled}
              onToggle={() => setDistanceFilterEnabled(!distanceFilter.enabled)}
              value={`≤${currentDistanceFilter.maxDistanceKm} km`}
            >
              <SliderControl
                id="max-distance"
                value={currentDistanceFilter.maxDistanceKm}
                min={DISTANCE_MIN}
                max={DISTANCE_MAX}
                step={5}
                presets={[...DISTANCE_PRESETS]}
                formatPreset={formatDistance}
                onChange={handleDistanceChange}
              />
            </FilterToggleRow>
          )}

          {/* Travel time filter */}
          {isTravelTimeFilterAvailable && (
            <FilterToggleRow
              icon={<TrainFront className="w-full h-full" />}
              label={t('exchange.filterByTravelTime')}
              enabled={travelTimeFilter.enabled}
              onToggle={() => setTravelTimeFilterEnabled(!travelTimeFilter.enabled)}
              value={`≤${formatTravelTime(currentMaxTravelTime, timeUnits)}`}
            >
              <SliderControl
                id="max-travel-time"
                value={currentMaxTravelTime}
                min={TRAVEL_TIME_MIN}
                max={TRAVEL_TIME_MAX}
                step={15}
                presets={[...TRAVEL_TIME_PRESETS]}
                formatPreset={formatTime}
                onChange={handleTravelTimeChange}
              />
            </FilterToggleRow>
          )}

          {/* Game gap filter */}
          {isGameGapFilterAvailable && (
            <FilterToggleRow
              icon={<CalendarX2 className="w-full h-full" />}
              label={t('exchange.filterByGameGap')}
              enabled={gameGapFilter.enabled}
              onToggle={() => setGameGapFilterEnabled(!gameGapFilter.enabled)}
              value={`≥${formatTravelTime(gameGapFilter.minGapMinutes, timeUnits)}`}
            >
              <SliderControl
                id="min-game-gap"
                value={gameGapFilter.minGapMinutes}
                min={GAME_GAP_MIN}
                max={GAME_GAP_MAX}
                step={15}
                presets={[...GAME_GAP_PRESETS]}
                formatPreset={formatTime}
                onChange={handleGameGapChange}
              />
            </FilterToggleRow>
          )}

          {/* Level filter (demo mode only) */}
          {isLevelFilterAvailable && (
            <FilterToggleRow
              icon={<User className="w-full h-full" />}
              label={t('exchange.filterByLevel')}
              enabled={levelFilterEnabled}
              onToggle={() => setLevelFilterEnabled(!levelFilterEnabled)}
              value={userRefereeLevel ?? undefined}
            />
          )}

          {/* Description */}
          <p className="pt-2 text-xs text-text-muted dark:text-text-muted-dark">
            {t('exchange.settings.description')}
          </p>
        </div>
      </ResponsiveSheet>
    </>
  )
}

export const ExchangeFilterMenu = memo(ExchangeFilterMenuComponent)
