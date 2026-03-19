import { useQuery, type UseQueryResult } from '@tanstack/react-query'

import { getApiClient, type PossibleNomination } from '@/api/client'
import { possibleNominationsOptions } from '@/api/queryOptions'
import { useAuthStore } from '@/shared/stores/auth'

interface UsePossiblePlayerNominationsOptions {
  nominationListId: string
  enabled?: boolean
}

/**
 * Hook to fetch possible player nominations for a nomination list.
 * Returns players that can be added to the roster during game validation.
 *
 * @param options.nominationListId - The UUID of the nomination list
 * @param options.enabled - Whether the query should run (default: true)
 */
export function usePossiblePlayerNominations({
  nominationListId,
  enabled = true,
}: UsePossiblePlayerNominationsOptions): UseQueryResult<PossibleNomination[], Error> {
  const dataSource = useAuthStore((state) => state.dataSource)
  const apiClient = getApiClient(dataSource)

  return useQuery({
    ...possibleNominationsOptions(apiClient, nominationListId),
    enabled: enabled && !!nominationListId,
  })
}
