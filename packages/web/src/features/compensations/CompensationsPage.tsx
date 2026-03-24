import { lazy, Suspense, Fragment, useMemo } from 'react'

import { LoadingState, ErrorState, EmptyState } from '@/common/components/LoadingSpinner'
import { PullToRefresh } from '@/common/components/PullToRefresh'
import { SwipeableCard } from '@/common/components/SwipeableCard'
import { Tabs, TabPanel } from '@/common/components/Tabs'
import { WeekSeparator } from '@/common/components/WeekSeparator'
import { useTranslation } from '@/common/hooks/useTranslation'
import { CompensationCard } from '@/features/compensations/components/CompensationCard'

import { useCompensationsPageLogic } from './hooks/useCompensationsPageLogic'

const EditCompensationModal = lazy(() =>
  import('@/features/compensations/components/EditCompensationModal').then((m) => ({
    default: m.EditCompensationModal,
  }))
)

const TwintPaymentModal = lazy(() =>
  import('@/features/compensations/components/TwintPaymentModal').then((m) => ({
    default: m.TwintPaymentModal,
  }))
)

export function CompensationsPage() {
  const { t } = useTranslation()
  const {
    filter,
    handleTabChange,
    groupedData,
    showDummyData,
    isLoading,
    error,
    isCalendarMode,
    getSwipeConfig,
    handleRefresh,
    refetch,
    getEmptyStateContent,
    editCompensationModal,
    twintModal,
    twintProfile,
    showTwintAction,
  } = useCompensationsPageLogic()

  // Pre-compute cumulative item counts per group to avoid O(n²) calculation in render
  const groupStartIndices = useMemo(
    () =>
      groupedData.reduce<{ sums: number[]; total: number }>(
        ({ sums, total }, g) => ({ sums: [...sums, total], total: total + g.items.length }),
        { sums: [], total: 0 }
      ).sums,
    [groupedData]
  )

  const tabs = [
    { id: 'pendingPast' as const, label: t('compensations.pendingPast') },
    { id: 'pendingFuture' as const, label: t('compensations.pendingFuture') },
    { id: 'closed' as const, label: t('compensations.closed') },
  ]

  const renderContent = () => {
    // Skip loading state when showing dummy tour data (we already have data to show)
    if (isLoading && !showDummyData) {
      return <LoadingState message={t('compensations.loading')} />
    }

    if (error) {
      return (
        <ErrorState
          message={error instanceof Error ? error.message : t('compensations.errorLoading')}
          onRetry={() => refetch()}
        />
      )
    }

    if (groupedData.length === 0) {
      const { title, description } = getEmptyStateContent(t)
      return <EmptyState icon="wallet" title={title} description={description} />
    }

    return (
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {groupedData.map((group, groupIndex) => {
          // Look up pre-computed start index to avoid O(n²) slice+reduce per group
          const itemsBeforeThisGroup = groupStartIndices[groupIndex] ?? 0

          return (
            <Fragment key={group.week.key}>
              {/* Only show separator if there's more than one week */}
              {groupedData.length > 1 && <WeekSeparator week={group.week} />}
              {group.items.map((compensation, itemIndex) => (
                <SwipeableCard
                  key={compensation.__identity}
                  swipeConfig={getSwipeConfig(compensation)}
                >
                  {({ isDrawerOpen }) => (
                    <CompensationCard
                      compensation={compensation}
                      disableExpansion={isDrawerOpen}
                      dataTour={
                        itemsBeforeThisGroup + itemIndex === 0 ? 'compensation-card' : undefined
                      }
                    />
                  )}
                </SwipeableCard>
              ))}
            </Fragment>
          )
        })}
      </div>
    )
  }

  // In calendar mode, show empty state since compensation data is not available
  if (isCalendarMode) {
    return (
      <div className="space-y-3">
        <EmptyState
          icon="wallet"
          title={t('compensations.unavailableInCalendarModeTitle')}
          description={t('compensations.unavailableInCalendarModeDescription')}
        />
      </div>
    )
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-3">
        {/* Filter tabs with keyboard navigation */}
        <Tabs
          tabs={tabs}
          activeTab={filter}
          onTabChange={handleTabChange}
          ariaLabel={t('compensations.title')}
        />

        {/* Content - single TabPanel since all tabs show same component with different data */}
        <TabPanel tabId={filter} activeTab={filter}>
          {renderContent()}
        </TabPanel>

        {/* Edit Compensation Modal - compensation is guaranteed non-null by conditional render */}
        {editCompensationModal.compensation && (
          <Suspense fallback={null}>
            <EditCompensationModal
              isOpen={editCompensationModal.isOpen}
              onClose={editCompensationModal.close}
              compensation={editCompensationModal.compensation}
            />
          </Suspense>
        )}

        {/* Twint Payment Modal — only render chunk when feature is enabled */}
        {showTwintAction && (
          <Suspense fallback={null}>
            <TwintPaymentModal
              isOpen={twintModal.isOpen}
              onClose={twintModal.close}
              firstName={twintProfile.firstName}
              lastName={twintProfile.lastName}
              mobilePhone={twintProfile.mobilePhone}
              amount={twintModal.amount}
            />
          </Suspense>
        )}
      </div>
    </PullToRefresh>
  )
}
