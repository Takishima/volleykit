import { useState, useCallback, useMemo, useOptimistic } from 'react'

import { useShallow } from 'zustand/react/shallow'

import type { GameExchange } from '@/api/client'
import { useActiveAssociationCode } from '@/common/hooks/useActiveAssociation'
import { useTour } from '@/common/hooks/useTour'
import { useAuthStore } from '@/common/stores/auth'
import { useDemoStore, DEMO_USER_PERSON_IDENTITY } from '@/common/stores/demo'
import { useSettingsStore } from '@/common/stores/settings'
import { groupByWeek } from '@/common/utils/date-helpers'
import type { SwipeConfig } from '@/types/swipe'

import { TOUR_DUMMY_EXCHANGE } from '../exchange'
import { useExchangeActions } from './useExchangeActions'
import { useExchangeFilters, type ExchangeWithDistance } from './useExchangeFilters'
import { useGameExchanges, type ExchangeStatus } from './useExchanges'
import { usePerAssociationFlag } from './usePerAssociationFlag'
import { createExchangeActions, resolveSwipeConfig } from '../utils/exchange-actions'

export function useExchangePageLogic() {
  const [statusFilter, setStatusFilter] = useState<ExchangeStatus>('open')
  const associationCode = useActiveAssociationCode()

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
  const { userRefereeLevel } = useDemoStore(
    useShallow((state) => ({
      userRefereeLevel: state.userRefereeLevel,
    }))
  )

  const {
    hideOwnExchangesByAssociation,
    hideNotTakeableExchangesByAssociation,
    setHideOwnExchangesForAssociation,
    setHideNotTakeableExchangesForAssociation,
  } = useSettingsStore(
    useShallow((state) => ({
      hideOwnExchangesByAssociation: state.hideOwnExchangesByAssociation,
      hideNotTakeableExchangesByAssociation: state.hideNotTakeableExchangesByAssociation,
      setHideOwnExchangesForAssociation: state.setHideOwnExchangesForAssociation,
      setHideNotTakeableExchangesForAssociation: state.setHideNotTakeableExchangesForAssociation,
    }))
  )

  // Both default to true: own entries and entries the association withholds
  // stay out of the way until the referee asks for them
  const [hideOwnExchanges, handleHideOwnToggle] = usePerAssociationFlag(
    hideOwnExchangesByAssociation,
    setHideOwnExchangesForAssociation,
    associationCode,
    true
  )
  const [hideNotTakeableExchanges, handleHideNotTakeableToggle] = usePerAssociationFlag(
    hideNotTakeableExchangesByAssociation,
    setHideNotTakeableExchangesForAssociation,
    associationCode,
    true
  )

  const {
    data: queryData,
    isLoading: queryLoading,
    error,
    refetch,
  } = useGameExchanges(statusFilter)

  // Optimistic UI: instantly remove exchanges from the list when the user
  // confirms a take-over or removal, before the API responds. The optimistic
  // state reverts automatically when queryData updates with fresh server data.
  const [data, applyOptimisticRemoval] = useOptimistic(queryData, (current, removedId: string) =>
    current?.filter((e) => e.__identity !== removedId)
  )

  // Show loading when switching associations or when query is loading
  const isLoading = isAssociationSwitching || queryLoading

  // Dummy exchange data for tour mode
  const dummyExchanges = useMemo((): ExchangeWithDistance[] | null => {
    if (!showDummyData) return null
    const tourExchange = TOUR_DUMMY_EXCHANGE as unknown as GameExchange
    return [{ exchange: tourExchange, carDistanceKm: null, takeable: true }]
  }, [showDummyData])

  // Delegate all filtering to the extracted hook
  const {
    filteredData,
    notTakeableCount,
    travelTimeMap,
    homeLocation,
    isTravelTimeFilterAvailable,
    isGameGapFilterAvailable,
    distanceFilter,
    travelTimeFilter,
    gameGapFilter,
    levelFilterEnabled,
  } = useExchangeFilters({
    data,
    statusFilter,
    isDemoMode,
    currentUserIdentity,
    hideOwnExchanges,
    hideNotTakeableExchanges,
    showDummyData,
    dummyExchanges,
  })

  // Determine if filters are available
  const isLevelFilterAvailable = isDemoMode && userRefereeLevel !== null
  const isDistanceFilterAvailable = homeLocation !== null

  // Group exchanges by week for visual separation
  const groupedData = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return []
    return groupByWeek(filteredData, (item) => item.exchange.refereeGame?.game?.startingDateTime)
  }, [filteredData])

  // What the Open tab should say about a list that is shorter than the fetch.
  // Derived here rather than in the component: every input already lives in this
  // hook, and only the wording is the component's business.
  //
  // `filtered` is deliberately not read off the filter toggles. Those say a
  // filter is enabled, not that it removed anything - the level filter outside
  // demo mode, or the distance filter with no home location, are enabled and
  // inert, and `hideOwnExchanges` defaults to true for everyone. What the user
  // needs to know is whether something they can act on did the removing, so the
  // arithmetic asks exactly that: an entry that was neither withheld by the
  // server nor rendered was dropped by a filter the user owns.
  //
  // Measured against what the filters left, not against what reaches the screen:
  // `groupByWeek` drops entries too, silently, when a game carries no parseable
  // start time. Those survived every filter, so counting the rendered total
  // would blame a filter for the grouping's work - the empty state then falls
  // back to "nothing on offer", which is at least not a false accusation.
  const openTabNotice = useMemo((): { filtered: boolean; notTakeableCount: number } => {
    const fetchedCount = data?.length ?? 0
    if (fetchedCount === 0) return { filtered: false, notTakeableCount: 0 }

    const survivedFilters = filteredData?.length ?? 0

    return { filtered: fetchedCount - notTakeableCount - survivedFilters > 0, notTakeableCount }
  }, [data, notTakeableCount, filteredData])

  const { takeOverModal, removeFromExchangeModal, handleTakeOver, handleRemoveFromExchange } =
    useExchangeActions()

  // `takeable` is the per-entry verdict `useExchangeFilters` computed, handed
  // back by the page so the swipe action and the card badge share one source
  const getSwipeConfig = useCallback(
    (exchange: GameExchange, takeable: boolean): SwipeConfig => {
      const actions = createExchangeActions(exchange, {
        onTakeOver: takeOverModal.open,
        onRemoveFromExchange: removeFromExchangeModal.open,
      })
      return resolveSwipeConfig(exchange, actions, {
        isMineTab: statusFilter === 'mine',
        isOwn: isOwnExchange(exchange),
        takeable,
      })
    },
    [takeOverModal.open, removeFromExchangeModal.open, statusFilter, isOwnExchange]
  )

  const handleTabChange = useCallback((tabId: string) => {
    setStatusFilter(tabId as ExchangeStatus)
  }, [])

  const handleTakeOverConfirm = useCallback(async () => {
    if (takeOverModal.exchange) {
      applyOptimisticRemoval(takeOverModal.exchange.__identity)
      try {
        await handleTakeOver(takeOverModal.exchange)
      } catch {
        void refetch()
      }
    }
  }, [takeOverModal.exchange, handleTakeOver, applyOptimisticRemoval, refetch])

  const handleRemoveConfirm = useCallback(async () => {
    if (removeFromExchangeModal.exchange) {
      applyOptimisticRemoval(removeFromExchangeModal.exchange.__identity)
      try {
        await handleRemoveFromExchange(removeFromExchangeModal.exchange)
      } catch {
        void refetch()
      }
    }
  }, [removeFromExchangeModal.exchange, handleRemoveFromExchange, applyOptimisticRemoval, refetch])

  // Handler for pull-to-refresh - wraps refetch in async function
  const handleRefresh = useCallback(async () => {
    await refetch()
  }, [refetch])

  return {
    // Tab state
    statusFilter,
    handleTabChange,

    // Data
    groupedData,
    openTabNotice,
    travelTimeMap,
    homeLocation,
    showDummyData,

    // Loading/error
    isLoading,
    error,
    isCalendarMode,

    // Actions
    getSwipeConfig,
    handleRefresh,
    handleTakeOverConfirm,
    handleRemoveConfirm,
    refetch,

    // Modals
    takeOverModal,
    removeFromExchangeModal,

    // Filter state
    hideOwnExchanges,
    handleHideOwnToggle,
    hideNotTakeableExchanges,
    handleHideNotTakeableToggle,
    isLevelFilterAvailable,
    isDistanceFilterAvailable,
    isTravelTimeFilterAvailable,
    isGameGapFilterAvailable,
    userRefereeLevel,
    distanceFilter,
    travelTimeFilter,
    gameGapFilter,
    levelFilterEnabled,
  }
}
