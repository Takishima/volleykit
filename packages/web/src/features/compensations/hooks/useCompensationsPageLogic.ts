import { useState, useCallback, useMemo } from 'react'

import { parseISO, compareAsc, compareDesc } from 'date-fns'
import { useShallow } from 'zustand/react/shallow'

import type { CompensationRecord } from '@/api/client'
import { useTour } from '@/common/hooks/useTour'
import { useAuthStore } from '@/common/stores/auth'
import { groupByWeek, getSeasonDateRange } from '@/common/utils/date-helpers'
import { TOUR_DUMMY_COMPENSATION } from '@/features/compensations/compensations'
import type { SwipeConfig } from '@/types/swipe'

import { useCompensationActions } from './useCompensationActions'
import { useCompensations } from './useCompensations'
import { createCompensationActions, isCompensationEditable } from '../utils/compensation-actions'

type FilterType = 'pendingPast' | 'pendingFuture' | 'closed'
type TranslationFn = typeof import('@/i18n').t

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

export function useCompensationsPageLogic() {
  const [filter, setFilter] = useState<FilterType>('pendingPast')
  const { editCompensationModal, handleGeneratePDF } = useCompensationActions()
  const { isAssociationSwitching, isCalendarMode } = useAuthStore(
    useShallow((state) => ({
      isAssociationSwitching: state.isAssociationSwitching,
      isCalendarMode: state.isCalendarMode(),
    }))
  )

  // Initialize tour for this page (triggers auto-start on first visit)
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
  const data = useMemo(() => {
    if (showDummyData) {
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

  // Handler for pull-to-refresh
  const handleRefresh = useCallback(async () => {
    await refetch()
  }, [refetch])

  const getEmptyStateContent = (t: TranslationFn) => {
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

  return {
    // Tab state
    filter,
    handleTabChange,

    // Data
    groupedData,
    showDummyData,

    // Loading/error
    isLoading,
    error,
    isCalendarMode,

    // Actions
    getSwipeConfig,
    handleRefresh,
    refetch,
    getEmptyStateContent,

    // Modals
    editCompensationModal,
  }
}

export type { FilterType }
