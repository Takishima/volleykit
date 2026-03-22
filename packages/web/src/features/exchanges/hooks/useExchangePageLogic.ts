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
import { createExchangeActions } from '../utils/exchange-actions'

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

  const { hideOwnExchangesByAssociation } = useSettingsStore(
    useShallow((state) => ({
      hideOwnExchangesByAssociation: state.hideOwnExchangesByAssociation,
    }))
  )

  // Get hide own exchanges setting per-association
  const setHideOwnExchangesForAssociation = useSettingsStore(
    (state) => state.setHideOwnExchangesForAssociation
  )

  // Derive hideOwnExchanges from the map - defaults to true if not set
  const hideOwnExchanges = useMemo(() => {
    if (associationCode && hideOwnExchangesByAssociation[associationCode] !== undefined) {
      return hideOwnExchangesByAssociation[associationCode]
    }
    return true // Default to hiding own exchanges
  }, [associationCode, hideOwnExchangesByAssociation])

  const handleHideOwnToggle = useCallback(() => {
    if (associationCode) {
      setHideOwnExchangesForAssociation(associationCode, !hideOwnExchanges)
    }
  }, [associationCode, hideOwnExchanges, setHideOwnExchangesForAssociation])

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
    return [{ exchange: tourExchange, carDistanceKm: null }]
  }, [showDummyData])

  // Delegate all filtering to the extracted hook
  const {
    filteredData,
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

      // "open" tab: only open exchanges (not applied/closed) are actionable
      if (exchange.status === 'open') {
        // Swipe left reveals: [Take Over] <- card
        return { left: [actions.takeOver] }
      }

      // No swipe actions for applied/closed statuses
      return {}
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
        refetch()
      }
    }
  }, [takeOverModal.exchange, handleTakeOver, applyOptimisticRemoval, refetch])

  const handleRemoveConfirm = useCallback(async () => {
    if (removeFromExchangeModal.exchange) {
      applyOptimisticRemoval(removeFromExchangeModal.exchange.__identity)
      try {
        await handleRemoveFromExchange(removeFromExchangeModal.exchange)
      } catch {
        refetch()
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
