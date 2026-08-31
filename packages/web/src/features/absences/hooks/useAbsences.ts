import { useMemo } from 'react'

import { useQuery } from '@tanstack/react-query'

import { getApiClient, type SearchConfiguration, type RefereeAbsence } from '@/api/client'
import { absenceListOptions } from '@/api/queryOptions'
import { DEFAULT_PAGE_SIZE } from '@/common/hooks/usePaginatedQuery'
import { useAuthStore } from '@/common/stores/auth'
import { useDemoStore } from '@/common/stores/demo'

// Stable empty array for React Query selectors to prevent unnecessary re-renders.
const EMPTY_ABSENCES: RefereeAbsence[] = []

/**
 * Hook to fetch referee absences for the active association.
 *
 * Absences are stored per association: the list holds the referee's own
 * entries plus association-imposed read-only blockings. Calendar mode has no
 * session, so the query is disabled there.
 *
 * @returns Query result with referee absence entries
 */
export function useAbsences() {
  const dataSource = useAuthStore((state) => state.dataSource)
  const isDemoMode = dataSource === 'demo'
  const activeOccupationId = useAuthStore((state) => state.activeOccupationId)
  const demoAssociationCode = useDemoStore((state) => state.activeAssociationCode)
  const apiClient = getApiClient(dataSource)

  // Use appropriate key for cache invalidation when switching associations
  const associationKey = isDemoMode ? demoAssociationCode : activeOccupationId

  // Newest-first ordering keeps upcoming absences inside the page even when a
  // referee accumulates more than one page of history: absence entries are
  // never pruned server-side, so oldest-first would truncate the future away.
  const config = useMemo<SearchConfiguration>(
    () => ({
      offset: 0,
      limit: DEFAULT_PAGE_SIZE,
      propertyOrderings: [
        {
          propertyName: 'fromDate',
          descending: true,
          isSetByUser: true,
        },
      ],
    }),
    []
  )

  // Select items plus the server's total, so callers can tell a truncated
  // page from a complete one. Stable empty array keeps re-renders cheap.
  const selectAbsences = useMemo(() => {
    return (data: { items?: RefereeAbsence[]; totalItemsCount?: number }) => {
      const absences = data.items ?? EMPTY_ABSENCES
      return { absences, totalItemsCount: data.totalItemsCount ?? absences.length }
    }
  }, [])

  return useQuery({
    ...absenceListOptions(apiClient, config, associationKey),
    select: selectAbsences,
    enabled: dataSource !== 'calendar',
    placeholderData: (prev) => prev,
  })
}
