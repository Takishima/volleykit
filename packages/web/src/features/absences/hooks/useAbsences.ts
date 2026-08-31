import { useMemo } from 'react'

import { useQuery } from '@tanstack/react-query'
import { countRowsConsumed } from '@volleykit/shared/api'
import { startOfDay, endOfDay, addYears, subYears, format } from 'date-fns'

import { getApiClient, type SearchConfiguration, type RefereeAbsence } from '@/api/client'
import { absenceListOptions } from '@/api/queryOptions'
import { DEFAULT_PAGE_SIZE } from '@/common/hooks/usePaginatedQuery'
import { useAuthStore } from '@/common/stores/auth'
import { useDemoStore } from '@/common/stores/demo'

/** How far back the fetched window reaches (feeds the Past tab). */
const HISTORY_YEARS = 1
/** How far ahead the fetched window reaches (covers the current + next season). */
const FUTURE_YEARS = 2

// Format date as YYYY-MM-DD for stable comparison (no time component)
const formatDateKey = (date: Date): string => format(date, 'yyyy-MM-dd')

// Stable empty array for React Query selectors to prevent unnecessary re-renders.
const EMPTY_ABSENCES: RefereeAbsence[] = []

export interface AbsencesResult {
  absences: RefereeAbsence[]
  /** The server's total across all pages, untouched by client-side drops. */
  totalItemsCount: number
  /**
   * True when the server holds more rows in the window than this page
   * consumed - i.e. real truncation, not items dropped by validation.
   */
  hasMoreHistory: boolean
}

/**
 * Hook to fetch referee absences for the active association.
 *
 * Absences are stored per association: the list holds the referee's own
 * entries plus association-imposed read-only blockings. The query fetches a
 * bounded fromDate window (the spec-documented filter, so it holds regardless
 * of server-side default ordering), newest-first. Calendar mode has no
 * session, so the query is disabled there.
 */
export function useAbsences() {
  const dataSource = useAuthStore((state) => state.dataSource)
  const isDemoMode = dataSource === 'demo'
  const activeOccupationId = useAuthStore((state) => state.activeOccupationId)
  const demoAssociationCode = useDemoStore((state) => state.activeAssociationCode)
  const apiClient = getApiClient(dataSource)

  // Use appropriate key for cache invalidation when switching associations
  const associationKey = isDemoMode ? demoAssociationCode : activeOccupationId

  // Day keys keep the query key stable across re-renders (no new Date() in
  // the deps array), same as useRefereeBackups.
  const fromKey = formatDateKey(subYears(new Date(), HISTORY_YEARS))
  const toKey = formatDateKey(addYears(new Date(), FUTURE_YEARS))

  const config = useMemo<SearchConfiguration>(
    () => ({
      offset: 0,
      limit: DEFAULT_PAGE_SIZE,
      propertyFilters: [
        {
          propertyName: 'fromDate',
          dateRange: {
            from: startOfDay(new Date(fromKey)).toISOString(),
            to: endOfDay(new Date(toKey)).toISOString(),
          },
        },
      ],
      // Newest-first so that even if the window somehow exceeds the page
      // limit, what falls off is the oldest history, not upcoming entries.
      propertyOrderings: [
        {
          propertyName: 'fromDate',
          descending: true,
          isSetByUser: true,
        },
      ],
    }),
    [fromKey, toKey]
  )

  // countRowsConsumed distinguishes truncation from validation drops: the
  // resilient list schema removes invalid items from `items` but leaves
  // `totalItemsCount` untouched, so `items.length` alone would report a
  // dropped item as truncation.
  const selectAbsences = useMemo(() => {
    return (data: {
      items?: RefereeAbsence[]
      totalItemsCount?: number
      droppedItems?: unknown[]
    }): AbsencesResult => {
      const absences = data.items ?? EMPTY_ABSENCES
      const totalItemsCount = data.totalItemsCount ?? absences.length
      return {
        absences,
        totalItemsCount,
        hasMoreHistory: totalItemsCount > countRowsConsumed(data),
      }
    }
  }, [])

  return useQuery({
    ...absenceListOptions(apiClient, config, associationKey),
    select: selectAbsences,
    enabled: dataSource !== 'calendar',
    placeholderData: (prev) => prev,
  })
}
