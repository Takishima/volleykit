import { useQuery, type UseQueryResult } from '@tanstack/react-query'

import { getApiClient, type AssociationSettings, type Season } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import { SETTINGS_STALE_TIME_MS, SEASON_STALE_TIME_MS } from '@/shared/hooks/usePaginatedQuery'
import { useAuthStore } from '@/shared/stores/auth'

/**
 * Hook to fetch association settings.
 * Settings include deadline hours for validation and other configuration.
 *
 * Note: Disabled in demo mode as demo data doesn't need these settings.
 * Includes activeOccupationId in the query key to refetch when switching associations.
 */
export function useAssociationSettings(): UseQueryResult<AssociationSettings, Error> {
  const dataSource = useAuthStore((state) => state.dataSource)
  const isDemoMode = dataSource === 'demo'
  const activeOccupationId = useAuthStore((state) => state.activeOccupationId)
  const apiClient = getApiClient(dataSource)

  return useQuery({
    queryKey: queryKeys.settings.association(activeOccupationId),
    queryFn: () => apiClient.getAssociationSettings(),
    staleTime: SETTINGS_STALE_TIME_MS,
    enabled: !isDemoMode,
  })
}

/**
 * Hook to fetch the currently active season.
 * Used to determine date ranges for assignment queries.
 *
 * Note: Disabled in demo mode as demo data uses fixed date ranges.
 * Includes activeOccupationId in the query key to refetch when switching associations.
 */
export function useActiveSeason(): UseQueryResult<Season, Error> {
  const dataSource = useAuthStore((state) => state.dataSource)
  const isDemoMode = dataSource === 'demo'
  const activeOccupationId = useAuthStore((state) => state.activeOccupationId)
  const apiClient = getApiClient(dataSource)

  return useQuery({
    queryKey: queryKeys.seasons.active(activeOccupationId),
    queryFn: () => apiClient.getActiveSeason(),
    staleTime: SEASON_STALE_TIME_MS,
    enabled: !isDemoMode,
  })
}
