import { useState, useCallback, useMemo, lazy, Suspense, Fragment } from 'react'

import { useShallow } from 'zustand/react/shallow'

import type { GameExchange } from '@/api/client'
import { useCalendarConflicts } from '@/features/assignments/hooks/useCalendarConflicts'
import { hasMinimumGapFromAssignments } from '@/features/assignments/utils/conflict-detection'
import { ExchangeCard } from '@/features/exchanges/components/ExchangeCard'
import { ExchangeSettingsSheet } from '@/features/exchanges/components/ExchangeSettingsSheet'
import { TOUR_DUMMY_EXCHANGE } from '@/features/exchanges/exchange'
import { useGameExchanges, type ExchangeStatus } from '@/features/validation/hooks/useConvocations'
import { DistanceFilterToggle } from '@/shared/components/DistanceFilterToggle'
import { FilterChip } from '@/shared/components/FilterChip'
import { LevelFilterToggle } from '@/shared/components/LevelFilterToggle'
import { LoadingState, ErrorState, EmptyState } from '@/shared/components/LoadingSpinner'
import { PullToRefresh } from '@/shared/components/PullToRefresh'
import { SwipeableCard } from '@/shared/components/SwipeableCard'
import { Tabs, TabPanel } from '@/shared/components/Tabs'
import { TravelTimeFilterToggle } from '@/shared/components/TravelTimeFilterToggle'
import { WeekSeparator } from '@/shared/components/WeekSeparator'
import { useTour } from '@/shared/hooks/useTour'
import { useTranslation } from '@/shared/hooks/useTranslation'
import { useTravelTimeFilter } from '@/shared/hooks/useTravelTimeFilter'
import { useAuthStore } from '@/shared/stores/auth'
import { useDemoStore, DEMO_USER_PERSON_IDENTITY } from '@/shared/stores/demo'
import { useSettingsStore } from '@/shared/stores/settings'
import { groupByWeek } from '@/shared/utils/date-helpers'
import { calculateCarDistanceKm } from '@/shared/utils/distance'
import { MINUTES_PER_HOUR } from '@/shared/utils/format-travel-time'
import { extractCoordinates } from '@/shared/utils/geo-location'
import type { SwipeConfig } from '@/types/swipe'

import { useExchangeActions } from './hooks/useExchangeActions'
import { createExchangeActions } from './utils/exchange-actions'

const TakeOverExchangeModal = lazy(() =>
  import('@/features/exchanges/components/TakeOverExchangeModal').then((m) => ({
    default: m.TakeOverExchangeModal,
  }))
)

const RemoveFromExchangeModal = lazy(() =>
  import('@/features/exchanges/components/RemoveFromExchangeModal').then((m) => ({
    default: m.RemoveFromExchangeModal,
  }))
)

export function ExchangePage() {
  const [statusFilter, setStatusFilter] = useState<ExchangeStatus>('open')
  const [hideOwnExchanges, setHideOwnExchanges] = useState(true)
  const { t } = useTranslation()

  // Initialize tour for this page (triggers auto-start on first visit)
  // Use showDummyData to show dummy data immediately, avoiding race condition with empty states
  const { showDummyData } = useTour('exchange')

  const { dataSource, isAssociationSwitching, isCalendarMode, userId } = useAuthStore(
    useShallow((state) => ({
      dataSource: state.dataSource,
      isAssociationSwitching: state.isAssociationSwitching,
      isCalendarMode: state.isCalendarMode(),
      userId: state.user?.id,
    }))
  )
  const isDemoMode = dataSource === 'demo'

  // Get current user's identity for checking exchange ownership
  const currentUserIdentity = isDemoMode ? DEMO_USER_PERSON_IDENTITY : userId

  // Helper to check if an exchange was submitted by the current user
  const isOwnExchange = useCallback(
    (exchange: GameExchange) => {
      if (!currentUserIdentity) return false
      return exchange.submittedByPerson?.__identity === currentUserIdentity
    },
    [currentUserIdentity]
  )
  const { userRefereeLevel, userRefereeLevelGradationValue } = useDemoStore(
    useShallow((state) => ({
      userRefereeLevel: state.userRefereeLevel,
      userRefereeLevelGradationValue: state.userRefereeLevelGradationValue,
    }))
  )
  const {
    homeLocation,
    distanceFilter,
    setDistanceFilterEnabled,
    travelTimeFilter,
    setTravelTimeFilterEnabled,
    levelFilterEnabled,
    setLevelFilterEnabled,
    gameGapFilter,
    setGameGapFilterEnabled,
  } = useSettingsStore(
    useShallow((state) => ({
      homeLocation: state.homeLocation,
      distanceFilter: state.distanceFilter,
      setDistanceFilterEnabled: state.setDistanceFilterEnabled,
      travelTimeFilter: state.travelTimeFilter,
      setTravelTimeFilterEnabled: state.setTravelTimeFilterEnabled,
      levelFilterEnabled: state.levelFilterEnabled,
      setLevelFilterEnabled: state.setLevelFilterEnabled,
      gameGapFilter: state.gameGapFilter,
      setGameGapFilterEnabled: state.setGameGapFilterEnabled,
    }))
  )

  const { data, isLoading: queryLoading, error, refetch } = useGameExchanges(statusFilter)
  // Show loading when switching associations or when query is loading
  const isLoading = isAssociationSwitching || queryLoading

  // Get calendar assignments for game gap filtering
  const { assignments: calendarAssignments, hasCalendarCode } = useCalendarConflicts()

  // Get travel time data for exchanges
  const { exchangesWithTravelTime, isAvailable: isTravelTimeAvailable } = useTravelTimeFilter(
    data ?? null
  )

  // Build travel time lookup map once for both filtering and rendering
  const travelTimeMap = useMemo(() => {
    if (!exchangesWithTravelTime)
      return new Map<string, { minutes: number | null; isLoading: boolean }>()
    return new Map(
      exchangesWithTravelTime.map((e) => [
        e.item.__identity,
        { minutes: e.travelTimeMinutes, isLoading: e.isLoading },
      ])
    )
  }, [exchangesWithTravelTime])

  // Calculate car distance for each exchange from user's home location
  const exchangesWithDistance = useMemo(() => {
    if (!data) return null
    if (!homeLocation) return data.map((e) => ({ exchange: e, carDistanceKm: null }))

    return data.map((exchange) => {
      const geoLocation =
        exchange.refereeGame?.game?.hall?.primaryPostalAddress?.geographicalLocation
      const hallCoords = extractCoordinates(geoLocation)

      if (!hallCoords) {
        return { exchange, carDistanceKm: null }
      }

      const homeCoords = { latitude: homeLocation.latitude, longitude: homeLocation.longitude }
      const carDistanceKm = calculateCarDistanceKm(homeCoords, hallCoords)

      return { exchange, carDistanceKm }
    })
  }, [data, homeLocation])

  // Filter exchanges by user's referee level and distance when filters are enabled
  const filteredData = useMemo(() => {
    // When tour is active (or about to auto-start), show ONLY the dummy exchange
    // to ensure tour works regardless of whether tabs have real data
    if (showDummyData) {
      // Safe cast: TourDummyExchange provides all fields used by ExchangeCard
      const tourExchange = TOUR_DUMMY_EXCHANGE as unknown as GameExchange
      return [{ exchange: tourExchange, carDistanceKm: null }]
    }

    if (!exchangesWithDistance) return null

    let result = exchangesWithDistance

    // Apply level filter (only on "open" tab in demo mode)
    if (
      levelFilterEnabled &&
      statusFilter === 'open' &&
      isDemoMode &&
      userRefereeLevelGradationValue !== null
    ) {
      result = result.filter(({ exchange }) => {
        const requiredGradationStr = exchange.requiredRefereeLevelGradationValue
        // If no gradation value, show the exchange (conservative approach)
        if (requiredGradationStr === undefined || requiredGradationStr === null) {
          return true
        }
        // Parse string to number for comparison (API returns string)
        const requiredGradation = Number(requiredGradationStr)
        if (isNaN(requiredGradation)) {
          return true
        }
        // User can officiate if their level meets or exceeds required level
        // Lower gradation = higher level, so user.gradation <= required.gradation
        return userRefereeLevelGradationValue <= requiredGradation
      })
    }

    // Apply distance filter (only on "open" tab when home location is set)
    // Uses car distance for more accurate filtering
    if (distanceFilter.enabled && statusFilter === 'open' && homeLocation) {
      result = result.filter(({ carDistanceKm }) => {
        // If no distance available, include the exchange (conservative)
        if (carDistanceKm === null) return true
        return carDistanceKm <= distanceFilter.maxDistanceKm
      })
    }

    // Apply travel time filter (only on "open" tab when transport is available)
    if (
      travelTimeFilter.enabled &&
      statusFilter === 'open' &&
      isTravelTimeAvailable &&
      travelTimeMap.size > 0
    ) {
      result = result.filter(({ exchange }) => {
        const travelTimeData = travelTimeMap.get(exchange.__identity)
        // If no travel time available, include the exchange (conservative)
        if (travelTimeData?.minutes === null || travelTimeData?.minutes === undefined) return true
        return travelTimeData.minutes <= travelTimeFilter.maxTravelTimeMinutes
      })
    }

    // Apply game gap filter (only on "open" tab when calendar data is available)
    if (
      gameGapFilter.enabled &&
      statusFilter === 'open' &&
      hasCalendarCode &&
      calendarAssignments.length > 0
    ) {
      result = result.filter(({ exchange }) => {
        const gameStartTime = exchange.refereeGame?.game?.startingDateTime
        return hasMinimumGapFromAssignments(
          gameStartTime,
          calendarAssignments,
          gameGapFilter.minGapMinutes
        )
      })
    }

    // Hide user's own exchanges in "open" tab when filter is enabled
    if (hideOwnExchanges && statusFilter === 'open' && currentUserIdentity) {
      result = result.filter(
        ({ exchange }) => exchange.submittedByPerson?.__identity !== currentUserIdentity
      )
    }

    return result
  }, [
    showDummyData,
    exchangesWithDistance,
    levelFilterEnabled,
    statusFilter,
    isDemoMode,
    userRefereeLevelGradationValue,
    distanceFilter.enabled,
    distanceFilter.maxDistanceKm,
    homeLocation,
    travelTimeFilter.enabled,
    travelTimeFilter.maxTravelTimeMinutes,
    isTravelTimeAvailable,
    travelTimeMap,
    hideOwnExchanges,
    currentUserIdentity,
    gameGapFilter.enabled,
    gameGapFilter.minGapMinutes,
    hasCalendarCode,
    calendarAssignments,
  ])

  // Group exchanges by week for visual separation
  const groupedData = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return []
    return groupByWeek(filteredData, (item) => item.exchange.refereeGame?.game?.startingDateTime)
  }, [filteredData])

  const { takeOverModal, removeFromExchangeModal, handleTakeOver, handleRemoveFromExchange } =
    useExchangeActions()

  const getSwipeConfig = useCallback(
    (exchange: GameExchange): SwipeConfig => {
      const actions = createExchangeActions(exchange, {
        onTakeOver: takeOverModal.open,
        onRemoveFromExchange: removeFromExchangeModal.open,
      })

      // Action array ordering: first item = furthest from card = full swipe default

      // "mine" tab: user's own submitted exchanges - allow removing them
      if (statusFilter === 'mine') {
        // Swipe right reveals: card -> [Remove]
        return { right: [actions.removeFromExchange] }
      }

      // "open" tab: check if it's user's own exchange first
      if (isOwnExchange(exchange)) {
        // User's own exchange in open tab - show remove action
        // Swipe right reveals: card -> [Remove]
        return { right: [actions.removeFromExchange] }
      }

      // "open" tab: actions for other users' exchanges depend on status
      switch (exchange.status) {
        case 'open':
          // Open exchanges: swipe left to take over
          // Swipe left reveals: [Take Over] <- card
          return { left: [actions.takeOver] }
        case 'applied':
          // Applied exchanges: swipe right to remove
          // Swipe right reveals: card -> [Remove]
          return { right: [actions.removeFromExchange] }
        default:
          // No swipe actions for other statuses
          return {}
      }
    },
    [takeOverModal.open, removeFromExchangeModal.open, statusFilter, isOwnExchange]
  )

  const tabs = [
    { id: 'open' as const, label: t('exchange.open') },
    { id: 'mine' as const, label: t('exchange.myApplications') },
  ]

  const handleTabChange = useCallback((tabId: string) => {
    setStatusFilter(tabId as ExchangeStatus)
  }, [])

  const handleTakeOverConfirm = useCallback(() => {
    if (takeOverModal.exchange) {
      handleTakeOver(takeOverModal.exchange)
    }
  }, [takeOverModal.exchange, handleTakeOver])

  const handleRemoveConfirm = useCallback(() => {
    if (removeFromExchangeModal.exchange) {
      handleRemoveFromExchange(removeFromExchangeModal.exchange)
    }
  }, [removeFromExchangeModal.exchange, handleRemoveFromExchange])

  // Determine if filters are available
  const isLevelFilterAvailable = isDemoMode && userRefereeLevel !== null
  const isDistanceFilterAvailable = homeLocation !== null
  // isTravelTimeAvailable from hook already includes association-specific transport check and homeLocation
  const isTravelTimeFilterAvailable = isTravelTimeAvailable
  // Game gap filter is available when calendar data exists (demo mode or calendar code)
  const isGameGapFilterAvailable = hasCalendarCode && calendarAssignments.length > 0

  const hasAnyFilter =
    isLevelFilterAvailable ||
    isDistanceFilterAvailable ||
    isTravelTimeFilterAvailable ||
    isGameGapFilterAvailable

  // Handler for pull-to-refresh - wraps refetch in async function
  const handleRefresh = useCallback(async () => {
    await refetch()
  }, [refetch])

  // Horizontal scrollable filter chips with settings gear - only show on "Open" tab when any filter is available
  // Always show filter bar on "open" tab (at minimum we have "hide own" filter)
  const filterContent =
    statusFilter === 'open' ? (
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
        {hasAnyFilter && <ExchangeSettingsSheet dataTour="exchange-settings" />}
        <FilterChip
          active={hideOwnExchanges}
          onToggle={() => setHideOwnExchanges((prev) => !prev)}
          label={t('exchange.hideOwn')}
        />
        {isTravelTimeFilterAvailable && (
          <TravelTimeFilterToggle
            checked={travelTimeFilter.enabled}
            onChange={setTravelTimeFilterEnabled}
            maxTravelTimeMinutes={travelTimeFilter.maxTravelTimeMinutes}
            dataTour="exchange-travel-time-filter"
          />
        )}
        {isDistanceFilterAvailable && (
          <DistanceFilterToggle
            checked={distanceFilter.enabled}
            onChange={setDistanceFilterEnabled}
            maxDistanceKm={distanceFilter.maxDistanceKm}
            dataTour="exchange-distance-filter"
          />
        )}
        {isLevelFilterAvailable && (
          <LevelFilterToggle
            checked={levelFilterEnabled}
            onChange={setLevelFilterEnabled}
            userLevel={userRefereeLevel}
            dataTour="exchange-filter"
          />
        )}
        {isGameGapFilterAvailable && (
          <FilterChip
            active={gameGapFilter.enabled}
            onToggle={() => setGameGapFilterEnabled(!gameGapFilter.enabled)}
            label={t('exchange.filterByGameGap')}
            activeValue={`≥${gameGapFilter.minGapMinutes / MINUTES_PER_HOUR}h`}
          />
        )}
      </div>
    ) : undefined

  const renderContent = () => {
    // Skip loading state when showing dummy tour data (we already have data to show)
    if (isLoading && !showDummyData) {
      return <LoadingState message={t('exchange.loading')} />
    }

    if (error) {
      return (
        <ErrorState
          message={error instanceof Error ? error.message : t('exchange.errorLoading')}
          onRetry={() => refetch()}
        />
      )
    }

    if (groupedData.length === 0) {
      const hasActiveFilters =
        hideOwnExchanges ||
        levelFilterEnabled ||
        distanceFilter.enabled ||
        travelTimeFilter.enabled ||
        gameGapFilter.enabled
      return (
        <EmptyState
          icon="exchange"
          title={
            statusFilter === 'open'
              ? t('exchange.noOpenExchangesTitle')
              : t('exchange.noApplicationsTitle')
          }
          description={
            statusFilter === 'open'
              ? hasActiveFilters
                ? t('exchange.noExchangesWithFilters')
                : t('exchange.noOpenExchangesDescription')
              : t('exchange.noApplicationsDescription')
          }
        />
      )
    }

    return (
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {groupedData.map((group, groupIndex) => {
          // Track global item index for tour data attribute
          const itemsBeforeThisGroup = groupedData
            .slice(0, groupIndex)
            .reduce((sum, g) => sum + g.items.length, 0)

          return (
            <Fragment key={group.week.key}>
              {/* Only show separator if there's more than one week */}
              {groupedData.length > 1 && <WeekSeparator week={group.week} />}
              {group.items.map(({ exchange, carDistanceKm }, itemIndex) => {
                const travelTimeData = travelTimeMap.get(exchange.__identity)
                return (
                  <SwipeableCard key={exchange.__identity} swipeConfig={getSwipeConfig(exchange)}>
                    {({ isDrawerOpen }) => (
                      <ExchangeCard
                        exchange={exchange}
                        disableExpansion={isDrawerOpen}
                        dataTour={
                          itemsBeforeThisGroup + itemIndex === 0 ? 'exchange-card' : undefined
                        }
                        carDistanceKm={homeLocation ? carDistanceKm : null}
                        travelTimeMinutes={travelTimeData?.minutes}
                        travelTimeLoading={travelTimeData?.isLoading}
                      />
                    )}
                  </SwipeableCard>
                )
              })}
            </Fragment>
          )
        })}
      </div>
    )
  }

  // In calendar mode, show empty state since exchange features are not available
  if (isCalendarMode) {
    return (
      <div className="space-y-3">
        <EmptyState
          icon="exchange"
          title={t('exchange.unavailableInCalendarModeTitle')}
          description={t('exchange.unavailableInCalendarModeDescription')}
        />
      </div>
    )
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-3">
        {/* Filter tabs with optional filters */}
        <Tabs
          tabs={tabs}
          activeTab={statusFilter}
          onTabChange={handleTabChange}
          ariaLabel={t('exchange.title')}
          endContent={filterContent}
        />

        {/* Content - single TabPanel since all tabs show same component with different data */}
        <TabPanel tabId={statusFilter} activeTab={statusFilter}>
          {renderContent()}
        </TabPanel>

        {/* Modals - exchange is guaranteed non-null by conditional render */}
        {takeOverModal.exchange && (
          <Suspense fallback={null}>
            <TakeOverExchangeModal
              exchange={takeOverModal.exchange}
              isOpen={takeOverModal.isOpen}
              onClose={takeOverModal.close}
              onConfirm={handleTakeOverConfirm}
            />
          </Suspense>
        )}

        {removeFromExchangeModal.exchange && (
          <Suspense fallback={null}>
            <RemoveFromExchangeModal
              exchange={removeFromExchangeModal.exchange}
              isOpen={removeFromExchangeModal.isOpen}
              onClose={removeFromExchangeModal.close}
              onConfirm={handleRemoveConfirm}
            />
          </Suspense>
        )}
      </div>
    </PullToRefresh>
  )
}
