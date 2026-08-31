import { useQuery } from '@tanstack/react-query'
import { countRowsConsumed } from '@volleykit/shared/api'

import { getApiClient, type RefereeAbsence, type RefereeAbsenceSearchResponse } from '@/api/client'
import { absenceListOptions } from '@/api/queryOptions'
import { useAuthStore } from '@/common/stores/auth'
import { useDemoStore } from '@/common/stores/demo'

// Stable empty array for React Query selectors to prevent unnecessary re-renders.
const EMPTY_ABSENCES: RefereeAbsence[] = []

export interface AbsencesResult {
  absences: RefereeAbsence[]
  /** The server's total, untouched by client-side validation drops. */
  totalItemsCount: number
  /**
   * True when the server returned fewer rows than its own total. The
   * bodyless request returns every row (smoke-tested), so this is a guard
   * against the server reintroducing pagination, not an expected state.
   * countRowsConsumed keeps validation drops from counting as truncation.
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
 * entries plus association-imposed read-only blockings. A single bodyless
 * request returns the complete list (see the capture doc for why no
 * searchConfiguration is sent). Calendar mode has no session, so the query
 * is disabled there.
 */
export function useAbsences() {
  const dataSource = useAuthStore((state) => state.dataSource)
  const isDemoMode = dataSource === 'demo'
  const activeOccupationId = useAuthStore((state) => state.activeOccupationId)
  const demoAssociationCode = useDemoStore((state) => state.activeAssociationCode)
  const apiClient = getApiClient(dataSource)

  // Use appropriate key for cache invalidation when switching associations
  const associationKey = isDemoMode ? demoAssociationCode : activeOccupationId

  // No placeholderData: an association switch is a context change, so the
  // page shows a spinner instead of the previous association's rows under
  // the new association's header.
  return useQuery({
    ...absenceListOptions(apiClient, associationKey),
    select: selectAbsences,
    enabled: dataSource !== 'calendar',
  })
}
