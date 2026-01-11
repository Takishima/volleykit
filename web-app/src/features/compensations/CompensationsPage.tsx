import { useState, useCallback, useMemo, lazy, Suspense, Fragment } from 'react'

import { parseISO, compareAsc, compareDesc } from 'date-fns'
import { useShallow } from 'zustand/react/shallow'

import type { CompensationRecord } from '@/api/client'
import { TOUR_DUMMY_COMPENSATION } from '@/features/compensations/compensations'
import { CompensationCard } from '@/features/compensations/components/CompensationCard'
import { useCompensations } from '@/features/validation/hooks/useConvocations'
import { LoadingState, ErrorState, EmptyState } from '@/shared/components/LoadingSpinner'
import { SwipeableCard } from '@/shared/components/SwipeableCard'
import { Tabs, TabPanel } from '@/shared/components/Tabs'
import { WeekSeparator } from '@/shared/components/WeekSeparator'
import { useTour } from '@/shared/hooks/useTour'
import { useTranslation } from '@/shared/hooks/useTranslation'
import { useAuthStore } from '@/shared/stores/auth'
import { groupByWeek, getSeasonDateRange } from '@/shared/utils/date-helpers'
import type { SwipeConfig } from '@/types/swipe'

import { useCompensationActions } from './hooks/useCompensationActions'
import { createCompensationActions, isCompensationEditable } from './utils/compensation-actions'

const EditCompensationModal = lazy(() =>
  import('@/features/compensations/components/EditCompensationModal').then((m) => ({
    default: m.EditCompensationModal,
  }))
)

type FilterType = 'pendingPast' | 'pendingFuture' | 'closed'

// Convert tab filter to useCompensations parameter (paid status only)
function filterToPaidFilter(filter: FilterType): boolean | undefined {
  switch (filter) {
    case 'closed':
      return true
    case 'pendingPast':
    case 'pendingFuture':
      return false
  }
}

/**
 * Determines sort direction based on filter type.
 *
 * This creates a consistent UX where "now" is always at the top of the list:
 * - Past/closed tabs: descending (newest first, scroll down = further into past)
 * - Future tab: ascending (soonest first, scroll down = further into future)
 *
 * This matches the pattern used in useAssignments for upcoming/past periods.
 */
function shouldSortDescending(filter: FilterType): boolean {
  return filter !== 'pendingFuture'
}

export function CompensationsPage() {
  const [filter, setFilter] = useState<FilterType>('pendingPast')
  const { t } = useTranslation()
  const { editCompensationModal, handleGeneratePDF } = useCompensationActions()
  const { isAssociationSwitching, isCalendarMode } = useAuthStore(
    useShallow((state) => ({
      isAssociationSwitching: state.isAssociationSwitching,
      isCalendarMode: state.isCalendarMode(),
    }))
  )

  // Initialize tour for this page (triggers auto-start on first visit)
  // Use showDummyData to show dummy data immediately, avoiding race condition with empty states
  const { showDummyData } = useTour('compensations')

  // Single data fetch based on current filter (like ExchangePage pattern)
  const paidFilter = useMemo(() => filterToPaidFilter(filter), [filter])
  const { data: rawData, isLoading: queryLoading, error, refetch } = useCompensations(paidFilter)
  // Show loading when switching associations or when query is loading
  const isLoading = isAssociationSwitching || queryLoading

  // Calculate season date range for filtering
  const seasonRange = useMemo(() => getSeasonDateRange(), [])

  // Memoize current date to avoid recreating on every render.
  // Note: This value is fixed for the component's lifetime. If a user keeps the page open
  // past midnight, past/future classification won't update until they refresh or navigate away.
  const now = useMemo(() => new Date(), [])

  // When tour is active (or about to auto-start), show ONLY the dummy compensation
  // to ensure tour works regardless of whether tabs have real data
  const data = useMemo(() => {
    if (showDummyData) {
      // Safe cast: TourDummyCompensation provides all fields used by CompensationCard
      const tourCompensation = TOUR_DUMMY_COMPENSATION as unknown as CompensationRecord
      return [tourCompensation]
    }

    if (!rawData) return rawData

    // Apply filters - always filter to current season since the app is only useful for current season
    const filtered = rawData.filter((record) => {
      const dateString = record.refereeGame?.game?.startingDateTime
      if (!dateString) return true // Keep items without dates

      const gameDate = parseISO(dateString)

      // Always filter by current season (Sept 1 - May 31)
      if (gameDate < seasonRange.from || gameDate > seasonRange.to) {
        return false
      }

      // Filter by past/future based on selected tab
      if (filter === 'pendingPast' && gameDate > now) {
        return false // Only show past items for pendingPast tab
      }
      if (filter === 'pendingFuture' && gameDate <= now) {
        return false // Only show future items for pendingFuture tab
      }

      return true
    })

    // Sort based on tab type:
    // - Past/closed tabs: descending (newest first, "now" at top)
    // - Future tab: ascending (soonest first, "now" at top)
    const descending = shouldSortDescending(filter)
    const compareFn = descending ? compareDesc : compareAsc

    return [...filtered].sort((a, b) => {
      const dateA = a.refereeGame?.game?.startingDateTime
      const dateB = b.refereeGame?.game?.startingDateTime
      if (!dateA && !dateB) return 0
      if (!dateA) return 1 // Items without dates go to end
      if (!dateB) return -1
      return compareFn(parseISO(dateA), parseISO(dateB))
    })
  }, [showDummyData, rawData, filter, seasonRange, now])

  // Group compensations by week for visual separation
  const groupedData = useMemo(() => {
    if (!data || data.length === 0) return []
    return groupByWeek(data, (c) => c.refereeGame?.game?.startingDateTime)
  }, [data])

  const tabs = [
    { id: 'pendingPast' as const, label: t('compensations.pendingPast') },
    { id: 'pendingFuture' as const, label: t('compensations.pendingFuture') },
    { id: 'closed' as const, label: t('compensations.closed') },
  ]

  const handleTabChange = useCallback((tabId: string) => {
    setFilter(tabId as FilterType)
  }, [])

  const getSwipeConfig = useCallback(
    (compensation: CompensationRecord): SwipeConfig => {
      const actions = createCompensationActions(compensation, {
        onEditCompensation: editCompensationModal.open,
        onGeneratePDF: handleGeneratePDF,
      })

      const canEdit = isCompensationEditable(compensation)

      return {
        left: canEdit ? [actions.editCompensation, actions.generatePDF] : [actions.generatePDF],
      }
    },
    [editCompensationModal.open, handleGeneratePDF]
  )

  const getEmptyStateContent = () => {
    switch (filter) {
      case 'pendingPast':
        return {
          title: t('compensations.noPendingPastTitle'),
          description: t('compensations.noPendingPastDescription'),
        }
      case 'pendingFuture':
        return {
          title: t('compensations.noPendingFutureTitle'),
          description: t('compensations.noPendingFutureDescription'),
        }
      case 'closed':
        return {
          title: t('compensations.noClosedTitle'),
          description: t('compensations.noClosedDescription'),
        }
    }
  }

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
      const { title, description } = getEmptyStateContent()
      return <EmptyState icon="wallet" title={title} description={description} />
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
    </div>
  )
}
