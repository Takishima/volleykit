import { lazy, Suspense, Fragment } from 'react'

import { LoadingState, ErrorState, EmptyState } from '@/shared/components/LoadingSpinner'
import { PullToRefresh } from '@/shared/components/PullToRefresh'
import { SwipeableCard } from '@/shared/components/SwipeableCard'
import { Tabs, TabPanel } from '@/shared/components/Tabs'
import { WeekSeparator } from '@/shared/components/WeekSeparator'
import { useTranslation } from '@/shared/hooks/useTranslation'

import { ActiveFilterIcons } from './components/ActiveFilterIcons'
import { ExchangeCard } from './components/ExchangeCard'
import { ExchangeFilterMenu } from './components/ExchangeFilterMenu'
import { useExchangePageLogic } from './hooks/useExchangePageLogic'

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
  const { t } = useTranslation()
  const {
    statusFilter,
    handleTabChange,
    groupedData,
    travelTimeMap,
    homeLocation,
    showDummyData,
    isLoading,
    error,
    isCalendarMode,
    getSwipeConfig,
    handleRefresh,
    handleTakeOverConfirm,
    handleRemoveConfirm,
    refetch,
    takeOverModal,
    removeFromExchangeModal,
    hideOwnExchanges,
    handleHideOwnToggle,
    isLevelFilterAvailable,
    isDistanceFilterAvailable,
    isTravelTimeFilterAvailable,
    isGameGapFilterAvailable,
    userRefereeLevel,
    distanceFilter,
    travelTimeFilter,
    gameGapFilter,
    levelFilterEnabled,
  } = useExchangePageLogic()

  const tabs = [
    { id: 'open' as const, label: t('exchange.open') },
    { id: 'mine' as const, label: t('exchange.myApplications') },
  ]

  // Filter menu button with active filter icons summary - only show on "Open" tab
  const filterContent =
    statusFilter === 'open' ? (
      <div className="flex items-center gap-2">
        <ExchangeFilterMenu
          hideOwnExchanges={hideOwnExchanges}
          onHideOwnToggle={handleHideOwnToggle}
          isLevelFilterAvailable={isLevelFilterAvailable}
          isDistanceFilterAvailable={isDistanceFilterAvailable}
          isTravelTimeFilterAvailable={isTravelTimeFilterAvailable}
          isGameGapFilterAvailable={isGameGapFilterAvailable}
          userRefereeLevel={userRefereeLevel}
          dataTour="exchange-settings"
        />
        <ActiveFilterIcons
          hideOwnActive={hideOwnExchanges}
          distanceActive={isDistanceFilterAvailable && distanceFilter.enabled}
          travelTimeActive={isTravelTimeFilterAvailable && travelTimeFilter.enabled}
          gameGapActive={isGameGapFilterAvailable && gameGapFilter.enabled}
          levelActive={isLevelFilterAvailable && levelFilterEnabled}
        />
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
