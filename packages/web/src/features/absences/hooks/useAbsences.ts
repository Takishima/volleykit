import { useQuery } from '@tanstack/react-query'

import { getApiClient } from '@/api/client'
import { absenceListOptions } from '@/api/queryOptions'
import { useAuthStore } from '@/common/stores/auth'
import { useDemoStore } from '@/common/stores/demo'

/**
 * Hook to fetch referee absences for the active association.
 *
 * Absences are stored per association: the list holds the referee's own
 * entries plus association-imposed read-only blockings. The fetch pages
 * through the endpoint (which caps the requested limit at its server
 * default) and returns `{ absences, totalItemsCount, hasMore }`. Calendar
 * mode has no session, so the query is disabled there.
 */
export function useAbsences() {
  const dataSource = useAuthStore((state) => state.dataSource)
  const isDemoMode = dataSource === 'demo'
  const activeOccupationId = useAuthStore((state) => state.activeOccupationId)
  const demoAssociationCode = useDemoStore((state) => state.activeAssociationCode)
  const apiClient = getApiClient(dataSource)

  // Use appropriate key for cache invalidation when switching associations
  const associationKey = isDemoMode ? demoAssociationCode : activeOccupationId

  return useQuery({
    ...absenceListOptions(apiClient, associationKey),
    enabled: dataSource !== 'calendar',
    placeholderData: (prev) => prev,
  })
}
