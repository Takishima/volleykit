import { useMemo } from 'react'

import { useQuery } from '@tanstack/react-query'
import { countRowsConsumed } from '@volleykit/shared/api'
import { startOfDay, endOfDay, addYears, subYears } from 'date-fns'

import {
  getApiClient,
  type SearchConfiguration,
  type RefereeAbsence,
  type RefereeAbsenceSearchResponse,
} from '@/api/client'
import { absenceListOptions } from '@/api/queryOptions'
import { DEFAULT_PAGE_SIZE } from '@/common/hooks/usePaginatedQuery'
import { useAuthStore } from '@/common/stores/auth'
import { useDemoStore } from '@/common/stores/demo'

/**
 * How far back the fetched window reaches (feeds the Past tab). Anything
 * older is deliberately not fetched; the page discloses this bound.
 */
const HISTORY_YEARS = 1
/**
 * How far ahead the fetched window reaches. VolleyManager only lets absences
 * be created up to the end of the running season (see the
 * getForbiddenBlockageDateRanges capture), so two years is a strict superset
 * of what can exist.
 */
const FUTURE_YEARS = 2

// Stable empty array for React Query selectors to prevent unnecessary re-renders.
const EMPTY_ABSENCES: RefereeAbsence[] = []

export interface AbsencesResult {
  absences: RefereeAbsence[]
  /** The server's total within the fetched window, untouched by client-side drops. */
  totalItemsCount: number
  /**
   * True when the window holds more rows than this page consumed - i.e. real
   * page-limit truncation, not items dropped by validation.
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

  // startOfDay/endOfDay make these strings day-stable, so they work directly
  // as memo deps - no format/parse roundtrip (whose date-only new Date()
  // parse would be UTC midnight, the wrong local day west of UTC).
  const fromIso = startOfDay(subYears(new Date(), HISTORY_YEARS)).toISOString()
  const toIso = endOfDay(addYears(new Date(), FUTURE_YEARS)).toISOString()

  const config = useMemo<SearchConfiguration>(
    () => ({
      offset: 0,
      limit: DEFAULT_PAGE_SIZE,
      propertyFilters: [
        {
          propertyName: 'fromDate',
          dateRange: { from: fromIso, to: toIso },
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
    [fromIso, toIso]
  )

  // countRowsConsumed distinguishes truncation from validation drops: the
  // resilient list schema removes invalid items from `items` but leaves
  // `totalItemsCount` untouched, so `items.length` alone would report a
  // dropped item as truncation. It reads `droppedItems` through `unknown`,
  // since the generated response type deliberately does not carry the field.
  const selectAbsences = useMemo(() => {
    return (data: RefereeAbsenceSearchResponse): AbsencesResult => {
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
