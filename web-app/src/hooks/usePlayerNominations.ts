import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import {
  getApiClient,
  type PossibleNomination,
  type PossibleNominationsResponse,
} from "@/api/client";
import { useAuthStore } from "@/stores/auth";
import { queryKeys } from "@/api/queryKeys";

interface UsePossiblePlayerNominationsOptions {
  nominationListId: string;
  enabled?: boolean;
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
}: UsePossiblePlayerNominationsOptions): UseQueryResult<
  PossibleNomination[],
  Error
> {
  const isDemoMode = useAuthStore((state) => state.isDemoMode);
  const apiClient = getApiClient(isDemoMode);

  return useQuery({
    queryKey: queryKeys.nominations.possible(nominationListId),
    queryFn: async () => {
      const response: PossibleNominationsResponse =
        await apiClient.getPossiblePlayerNominations(nominationListId);
      return response.items ?? [];
    },
    enabled: enabled && !!nominationListId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
