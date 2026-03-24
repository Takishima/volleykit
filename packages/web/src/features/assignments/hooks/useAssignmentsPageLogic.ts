import { useState, useCallback, useMemo } from 'react'

import { useShallow } from 'zustand/react/shallow'

import type { Assignment } from '@/api/client'
import { useTour } from '@/common/hooks/useTour'
import { useAuthStore } from '@/common/stores/auth'
import { groupByWeek } from '@/common/utils/date-helpers'
import { TOUR_DUMMY_ASSIGNMENT } from '@/features/assignments/assignments'
import { isAssignmentCompensationEditable } from '@/features/compensations/utils/compensation-helpers'
import {
  useMyOnCallAssignments,
  type OnCallAssignment,
} from '@/features/referee-backup/hooks/useMyOnCallAssignments'
import type { SwipeConfig } from '@/types/swipe'

import { useAssignmentActions } from './useAssignmentActions'
import { useUpcomingAssignments, useValidationClosedAssignments } from './useAssignments'
import { useCalendarAssignments, type CalendarAssignment } from './useCalendarAssignments'
import { useCalendarAssociationFilter } from './useCalendarAssociationFilter'
import { useDailyGameBadge } from './useDailyGameBadge'
import { createAssignmentActions } from '../utils/assignment-actions'
import { isGameReportEligible, isValidationEligible } from '../utils/assignment-helpers'

/**
 * Discriminated union for items that can be displayed in the assignments list.
 * Allows mixing regular assignments with on-call assignments inline.
 */
export type DisplayItem =
  | { type: 'assignment'; item: Assignment }
  | { type: 'onCall'; item: OnCallAssignment }

/** Extract date from a display item for sorting/grouping */
function getDisplayItemDate(item: DisplayItem): string | undefined {
  if (item.type === 'onCall') {
    return item.item.date
  }
  return item.item.refereeGame?.game?.startingDateTime
}

type TabType = 'upcoming' | 'validationClosed'

type TranslationFn = typeof import('@/i18n').t

/**
 * Get empty state content for assignments page.
 * Extracted to reduce cognitive complexity of main component.
 */
export function getEmptyStateContent(
  isCalendarMode: boolean,
  activeTab: TabType,
  hasCalendarData: boolean,
  t: TranslationFn
): { title: string; description: string } {
  if (isCalendarMode && activeTab === 'upcoming') {
    return hasCalendarData
      ? {
          title: t('assignments.calendarNoUpcomingTitle'),
          description: t('assignments.calendarNoUpcomingDescription'),
        }
      : {
          title: t('assignments.calendarEmptyTitle'),
          description: t('assignments.calendarEmptyDescription'),
        }
  }
  if (activeTab === 'upcoming') {
    return {
      title: t('assignments.noUpcomingTitle'),
      description: t('assignments.noUpcomingDescription'),
    }
  }
  return {
    title: t('assignments.noClosedTitle'),
    description: t('assignments.noClosedDescription'),
  }
}

// ---------------------------------------------------------------------------
// Private sub-hooks — extracted to keep useAssignmentsPageLogic under ~30 lines
// ---------------------------------------------------------------------------

/** Splits calendar assignments into upcoming/past buckets filtered by association. */
function useCalendarDisplayItems(
  isCalendarMode: boolean,
  calendarData: CalendarAssignment[] | undefined,
  filterByAssociation: (items: CalendarAssignment[]) => CalendarAssignment[]
) {
  const calendarUpcoming = useMemo(() => {
    if (!isCalendarMode || !calendarData) return []
    const now = new Date()
    return filterByAssociation(calendarData.filter((a) => new Date(a.startTime) >= now))
  }, [isCalendarMode, calendarData, filterByAssociation])

  const calendarPast = useMemo(() => {
    if (!isCalendarMode || !calendarData) return []
    const now = new Date()
    return filterByAssociation(calendarData.filter((a) => new Date(a.startTime) < now))
  }, [isCalendarMode, calendarData, filterByAssociation])

  return { calendarUpcoming, calendarPast }
}

interface DerivedLoadingErrorOptions {
  isAssociationSwitching: boolean
  isCalendarMode: boolean
  activeTab: TabType
  calendar: { loading: boolean; error: Error | null; refetch: () => void }
  upcoming: { loading: boolean; error: Error | null; refetch: () => void }
  validationClosed: { loading: boolean; error: Error | null; refetch: () => void }
}

/** Derives isLoading, error, and a unified refetch from the three query results. */
function useDerivedLoadingError({
  isAssociationSwitching,
  isCalendarMode,
  activeTab,
  calendar: { loading: calendarLoading, error: calendarError, refetch: refetchCalendar },
  upcoming: { loading: upcomingLoading, error: upcomingError, refetch: refetchUpcoming },
  validationClosed: {
    loading: validationClosedLoading,
    error: validationClosedError,
    refetch: refetchValidationClosed,
  },
}: DerivedLoadingErrorOptions) {
  const isLoading = useMemo(() => {
    if (isAssociationSwitching) return true
    if (isCalendarMode) return calendarLoading
    return activeTab === 'upcoming' ? upcomingLoading : validationClosedLoading
  }, [
    isAssociationSwitching,
    isCalendarMode,
    calendarLoading,
    activeTab,
    upcomingLoading,
    validationClosedLoading,
  ])

  const error = useMemo(() => {
    if (isCalendarMode) return calendarError
    return activeTab === 'upcoming' ? upcomingError : validationClosedError
  }, [isCalendarMode, calendarError, activeTab, upcomingError, validationClosedError])

  const refetch = useCallback(() => {
    if (isCalendarMode) return refetchCalendar()
    return activeTab === 'upcoming' ? refetchUpcoming() : refetchValidationClosed()
  }, [isCalendarMode, activeTab, refetchCalendar, refetchUpcoming, refetchValidationClosed])

  return { isLoading, error, refetch }
}

/** Merges regular assignments with on-call duties and groups them by week. */
function useMergedDisplayItems(
  activeTab: TabType,
  isCalendarMode: boolean,
  showDummyData: boolean,
  data: Assignment[] | CalendarAssignment[] | undefined,
  onCallAssignments: OnCallAssignment[]
) {
  const mergedDisplayItems = useMemo((): DisplayItem[] => {
    if (activeTab !== 'upcoming' || isCalendarMode || showDummyData) return []
    const items: DisplayItem[] = []
    if (data) {
      for (const assignment of data as Assignment[]) {
        items.push({ type: 'assignment', item: assignment })
      }
    }
    for (const onCall of onCallAssignments) {
      items.push({ type: 'onCall', item: onCall })
    }
    return items.sort((a, b) => {
      const dateA = getDisplayItemDate(a)
      const dateB = getDisplayItemDate(b)
      if (!dateA || !dateB) return 0
      return new Date(dateA).getTime() - new Date(dateB).getTime()
    })
  }, [activeTab, isCalendarMode, showDummyData, data, onCallAssignments])

  const groupedData = useMemo(() => {
    if (activeTab === 'upcoming' && !isCalendarMode && !showDummyData) {
      if (mergedDisplayItems.length === 0) return []
      return groupByWeek(mergedDisplayItems, getDisplayItemDate)
    }
    if (!data || data.length === 0) return []
    const getDate =
      isCalendarMode && !showDummyData
        ? (a: { startTime?: string }) => a.startTime
        : (a: { refereeGame?: { game?: { startingDateTime?: string } } }) =>
            a.refereeGame?.game?.startingDateTime
    return groupByWeek(data, getDate as (item: unknown) => string | undefined)
  }, [activeTab, isCalendarMode, showDummyData, mergedDisplayItems, data])

  return { mergedDisplayItems, groupedData }
}

// ---------------------------------------------------------------------------

export function useAssignmentsPageLogic() {
  const [activeTab, setActiveTab] = useState<TabType>('upcoming')
  const { isAssociationSwitching, isCalendarMode } = useAuthStore(
    useShallow((state) => ({
      isAssociationSwitching: state.isAssociationSwitching,
      isCalendarMode: state.isCalendarMode(),
    }))
  )

  // Initialize tour for this page (triggers auto-start on first visit)
  const { showDummyData } = useTour('assignments')

  const {
    editCompensationModal,
    validateGameModal,
    pdfReportModal,
    handleGenerateReport,
    handleAddToExchange,
  } = useAssignmentActions()

  // Fetch regular assignments (only enabled when not in calendar mode)
  const {
    data: upcomingData,
    isLoading: upcomingLoading,
    error: upcomingError,
    refetch: refetchUpcoming,
  } = useUpcomingAssignments()

  const {
    data: validationClosedData,
    isLoading: validationClosedLoading,
    error: validationClosedError,
    refetch: refetchValidationClosed,
  } = useValidationClosedAssignments()

  // Fetch calendar assignments (only enabled in calendar mode)
  const {
    data: calendarData,
    isLoading: calendarLoading,
    error: calendarError,
    refetch: refetchCalendar,
  } = useCalendarAssignments()

  // Association filter for calendar mode (extracts unique associations from data)
  const { filterByAssociation } = useCalendarAssociationFilter(calendarData ?? [])

  // Fetch on-call (Pikett) assignments - only in full API mode
  const { data: onCallAssignments } = useMyOnCallAssignments()

  // Update PWA badge with today's game count (only for regular assignments, not calendar mode)
  useDailyGameBadge(isCalendarMode ? [] : (upcomingData ?? []))

  const { calendarUpcoming, calendarPast } = useCalendarDisplayItems(
    isCalendarMode,
    calendarData,
    filterByAssociation
  )

  const { isLoading, error, refetch } = useDerivedLoadingError({
    isAssociationSwitching,
    isCalendarMode,
    activeTab,
    calendar: { loading: calendarLoading, error: calendarError, refetch: refetchCalendar },
    upcoming: { loading: upcomingLoading, error: upcomingError, refetch: refetchUpcoming },
    validationClosed: {
      loading: validationClosedLoading,
      error: validationClosedError,
      refetch: refetchValidationClosed,
    },
  })

  // Select the appropriate data source based on mode and tab
  const rawData = useMemo(() => {
    if (isCalendarMode) {
      return activeTab === 'upcoming' ? calendarUpcoming : calendarPast
    }
    return activeTab === 'upcoming' ? upcomingData : validationClosedData
  }, [
    isCalendarMode,
    activeTab,
    calendarUpcoming,
    calendarPast,
    upcomingData,
    validationClosedData,
  ])

  // When tour is active, show ONLY the dummy assignment
  const data = useMemo(() => {
    if (showDummyData) return [TOUR_DUMMY_ASSIGNMENT as unknown as Assignment]
    return rawData
  }, [showDummyData, rawData])

  const { groupedData } = useMergedDisplayItems(
    activeTab,
    isCalendarMode,
    showDummyData,
    data,
    onCallAssignments
  )

  const getSwipeConfig = useCallback(
    (assignment: Assignment, t: TranslationFn): SwipeConfig => {
      const actions = createAssignmentActions(
        assignment,
        {
          onEditCompensation: editCompensationModal.open,
          onValidateGame: validateGameModal.open,
          onGenerateReport: handleGenerateReport,
          onAddToExchange: handleAddToExchange,
        },
        t
      )

      const canGenerateReport = isGameReportEligible(assignment)

      if (isCalendarMode) {
        return {
          left: canGenerateReport ? [actions.generateReport] : [],
          right: [],
        }
      }

      const isGameInFuture = assignment.refereeGame?.isGameInFuture === '1'
      const canValidateGame = isValidationEligible(assignment)
      const canEditCompensation = isAssignmentCompensationEditable(assignment)

      const leftActions = canValidateGame ? [actions.validateGame] : []
      if (canEditCompensation) {
        leftActions.push(actions.editCompensation)
      }
      if (canGenerateReport) {
        leftActions.push(actions.generateReport)
      }

      return {
        left: leftActions,
        right: isGameInFuture ? [actions.addToExchange] : [],
      }
    },
    [
      isCalendarMode,
      editCompensationModal,
      validateGameModal,
      handleGenerateReport,
      handleAddToExchange,
    ]
  )

  // Handler for pull-to-refresh
  const handleRefresh = useCallback(async () => {
    await refetch()
  }, [refetch])

  // Tab counts
  const upcomingCount = useMemo(() => {
    const regularCount = (isCalendarMode ? calendarUpcoming : upcomingData)?.length ?? 0
    const onCallCount = isCalendarMode ? 0 : onCallAssignments.length
    return regularCount + onCallCount
  }, [isCalendarMode, calendarUpcoming, upcomingData, onCallAssignments.length])

  const validationClosedCount = useMemo(() => {
    return ((isCalendarMode ? calendarPast : validationClosedData) ?? []).length
  }, [isCalendarMode, calendarPast, validationClosedData])

  return {
    // Tab state
    activeTab,
    setActiveTab,

    // Data
    groupedData,
    showDummyData,
    calendarData,

    // Loading/error
    isLoading,
    error,
    isCalendarMode,

    // Actions
    getSwipeConfig,
    handleRefresh,
    refetch,

    // Modals
    editCompensationModal,
    validateGameModal,
    pdfReportModal,

    // Tab counts
    upcomingCount,
    validationClosedCount,
  }
}

export type { TabType, CalendarAssignment }
