import { useQuery, useSuspenseQuery, type UseQueryResult } from '@tanstack/react-query'

import { getApiClient, type AssociationSettings, type Season } from '@/api/client'
import { associationSettingsOptions, activeSeasonOptions } from '@/api/queryOptions'
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
    ...associationSettingsOptions(apiClient, activeOccupationId),
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
    ...activeSeasonOptions(apiClient, activeOccupationId),
    enabled: !isDemoMode,
  })
}

/**
 * Suspense-ready variant of useAssociationSettings.
 * `data` is guaranteed to be `AssociationSettings` (never undefined).
 *
 * Only use inside a `<Suspense>` + `<ErrorBoundary>` boundary.
 * Must NOT be called in demo mode (no `enabled` option with useSuspenseQuery).
 */
export function useSuspenseAssociationSettings() {
  const activeOccupationId = useAuthStore((state) => state.activeOccupationId)
  const dataSource = useAuthStore((state) => state.dataSource)

  if (dataSource === 'demo') {
    throw new Error('useSuspenseAssociationSettings cannot be used in demo mode')
  }

  const apiClient = getApiClient(dataSource)

  return useSuspenseQuery(associationSettingsOptions(apiClient, activeOccupationId))
}

/**
 * Suspense-ready variant of useActiveSeason.
 * `data` is guaranteed to be `Season` (never undefined).
 *
 * Only use inside a `<Suspense>` + `<ErrorBoundary>` boundary.
 * Must NOT be called in demo mode (no `enabled` option with useSuspenseQuery).
 */
export function useSuspenseActiveSeason() {
  const activeOccupationId = useAuthStore((state) => state.activeOccupationId)
  const dataSource = useAuthStore((state) => state.dataSource)

  if (dataSource === 'demo') {
    throw new Error('useSuspenseActiveSeason cannot be used in demo mode')
  }

  const apiClient = getApiClient(dataSource)

  return useSuspenseQuery(activeSeasonOptions(apiClient, activeOccupationId))
}
