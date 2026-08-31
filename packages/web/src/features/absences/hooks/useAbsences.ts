import { useMemo } from 'react'

import { useQuery } from '@tanstack/react-query'
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
 * older is deliberately not fetched; the page discloses this bound via
 * `absences.olderHistoryNote`, whose four locale strings hardcode "one
 * year" - keep them in sync when changing this.
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

  // Select items from the response, providing a stable empty array fallback.
  // No truncation bookkeeping: the bounded window plus newest-first ordering
  // make a >100-row page an edge case, and the page discloses the window
  // itself whenever history renders.
  const selectAbsences = useMemo(() => {
    return (data: RefereeAbsenceSearchResponse): RefereeAbsence[] => {
      return data.items ?? EMPTY_ABSENCES
    }
  }, [])

  return useQuery({
    ...absenceListOptions(apiClient, config, associationKey),
    select: selectAbsences,
    enabled: dataSource !== 'calendar',
    placeholderData: (prev) => prev,
  })
}
