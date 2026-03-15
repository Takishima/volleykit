import { useState, useCallback, useMemo, useOptimistic } from 'react'

import { useShallow } from 'zustand/react/shallow'

import type { GameExchange } from '@/api/client'
import { useCalendarConflicts } from '@/features/assignments/hooks/useCalendarConflicts'
import {
  hasMinimumGapFromAssignments,
  DEFAULT_SAME_LOCATION_DISTANCE_KM,
} from '@/features/assignments/utils/conflict-detection'
import { useActiveAssociationCode } from '@/features/auth/hooks/useActiveAssociation'
import { features } from '@/shared/config/features'
import { useTour } from '@/shared/hooks/useTour'
import { useTravelTimeFilter } from '@/shared/hooks/useTravelTimeFilter'
import { useAuthStore } from '@/shared/stores/auth'
import { useDemoStore, DEMO_USER_PERSON_IDENTITY } from '@/shared/stores/demo'
import { useSettingsStore } from '@/shared/stores/settings'
import { groupByWeek } from '@/shared/utils/date-helpers'
import { calculateCarDistanceKm } from '@/shared/utils/distance'
import { extractCoordinates } from '@/shared/utils/geo-location'
import type { SwipeConfig } from '@/types/swipe'

import { TOUR_DUMMY_EXCHANGE } from '../exchange'
import { useExchangeActions } from './useExchangeActions'
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
  const { userRefereeLevel, userRefereeLevelGradationValue } = useDemoStore(
    useShallow((state) => ({
      userRefereeLevel: state.userRefereeLevel,
      userRefereeLevelGradationValue: state.userRefereeLevelGradationValue,
    }))
  )
  const {
    homeLocation,
    distanceFilter,
    travelTimeFilter,
    levelFilterEnabled,
    gameGapFilter,
    hideOwnExchangesByAssociation,
  } = useSettingsStore(
    useShallow((state) => ({
      homeLocation: state.homeLocation,
      distanceFilter: state.distanceFilter,
      travelTimeFilter: state.travelTimeFilter,
      levelFilterEnabled: state.levelFilterEnabled,
      gameGapFilter: state.gameGapFilter,
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
    // Uses smart conflict detection: games at nearby venues (<=5km) don't trigger conflicts
    if (
      gameGapFilter.enabled &&
      statusFilter === 'open' &&
      hasCalendarCode &&
      calendarAssignments.length > 0
    ) {
      result = result.filter(({ exchange }) => {
        const gameStartTime = exchange.refereeGame?.game?.startingDateTime
        const geoLocation =
          exchange.refereeGame?.game?.hall?.primaryPostalAddress?.geographicalLocation
        const venueCoordinates = extractCoordinates(geoLocation)

        return hasMinimumGapFromAssignments(gameStartTime, calendarAssignments, {
          minGapMinutes: gameGapFilter.minGapMinutes,
          venueCoordinates,
          sameLocationDistanceKm: DEFAULT_SAME_LOCATION_DISTANCE_KM,
        })
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

  // Determine if filters are available
  const isLevelFilterAvailable = isDemoMode && userRefereeLevel !== null
  const isDistanceFilterAvailable = homeLocation !== null
  // isTravelTimeAvailable from hook already includes association-specific transport check and homeLocation (features.transport)
  const isTravelTimeFilterAvailable = features.transport && isTravelTimeAvailable
  // Game gap filter is available when calendar data exists (demo mode or calendar code)
  const isGameGapFilterAvailable = hasCalendarCode && calendarAssignments.length > 0

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
