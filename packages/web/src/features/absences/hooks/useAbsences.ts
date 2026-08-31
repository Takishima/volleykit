import { useMemo } from 'react'

import { useQuery } from '@tanstack/react-query'
import { countRowsConsumed } from '@volleykit/shared/api'

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

// Stable empty array for React Query selectors to prevent unnecessary re-renders.
const EMPTY_ABSENCES: RefereeAbsence[] = []

export interface AbsencesResult {
  absences: RefereeAbsence[]
  /** The server's total, untouched by client-side validation drops. */
  totalItemsCount: number
  /**
   * True when the server holds more rows than this page consumed - real
   * page-limit truncation, not items dropped by validation
   * (countRowsConsumed counts dropped rows too).
   */
  hasMore: boolean
}

// Module-scoped pure transform: stable by construction, no memo needed.
const selectAbsences = (data: RefereeAbsenceSearchResponse): AbsencesResult => {
  const absences = data.items ?? EMPTY_ABSENCES
  const totalItemsCount = data.totalItemsCount ?? absences.length
  return {
    absences,
    totalItemsCount,
    hasMore: totalItemsCount > countRowsConsumed(data),
  }
}

/**
 * Hook to fetch referee absences for the active association.
 *
 * Absences are stored per association: the list holds the referee's own
 * entries plus association-imposed read-only blockings. Calendar mode has no
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

  // Only offset/limit: the live endpoint returns 500 for propertyFilters and
  // propertyOrderings (smoke test, 2026-08-31), and VolleyManager's own page
  // sends no searchConfiguration at all. Both captured responses arrived
  // newest-first, so the server's default ordering already keeps upcoming
  // entries inside the page when the limit truncates; the page shows a note
  // when it does.
  const config = useMemo<SearchConfiguration>(
    () => ({
      offset: 0,
      limit: DEFAULT_PAGE_SIZE,
    }),
    []
  )

  return useQuery({
    ...absenceListOptions(apiClient, config, associationKey),
    select: selectAbsences,
    enabled: dataSource !== 'calendar',
    placeholderData: (prev) => prev,
  })
}
