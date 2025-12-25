import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import {
  getApiClient,
  type SearchConfiguration,
  type GameExchange,
} from "@/api/client";
import { useAuthStore } from "@/stores/auth";
import { useDemoStore } from "@/stores/demo";
import { queryKeys } from "@/api/queryKeys";
import { DEFAULT_PAGE_SIZE } from "./usePaginatedQuery";

// Stable empty array for React Query selectors to prevent unnecessary re-renders.
const EMPTY_EXCHANGES: GameExchange[] = [];

// Exchange status filter type
export type ExchangeStatus = "open" | "applied" | "closed" | "all";

/**
 * Hook to fetch game exchange requests with optional status filtering.
 *
 * @param status - Filter by exchange status, or 'all' for no filtering
 */
export function useGameExchanges(status: ExchangeStatus = "all") {
  const isDemoMode = useAuthStore((state) => state.isDemoMode);
  const demoAssociationCode = useDemoStore(
    (state) => state.activeAssociationCode,
  );
  const apiClient = getApiClient(isDemoMode);

  const config: SearchConfiguration = {
    offset: 0,
    limit: DEFAULT_PAGE_SIZE,
    propertyFilters:
      status !== "all"
        ? [{ propertyName: "status", enumValues: [status] }]
        : [],
    propertyOrderings: [
      {
        propertyName: "refereeGame.game.startingDateTime",
        descending: false,
        isSetByUser: true,
      },
    ],
  };

  return useQuery({
    queryKey: queryKeys.exchanges.list(
      config,
      isDemoMode ? demoAssociationCode : null,
    ),
    queryFn: () => apiClient.searchExchanges(config),
    select: (data) => data.items ?? EMPTY_EXCHANGES,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Mutation hook to apply for an exchange.
 */
export function useApplyForExchange(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  const isDemoMode = useAuthStore((state) => state.isDemoMode);
  const apiClient = getApiClient(isDemoMode);

  return useMutation({
    mutationFn: (exchangeId: string) => apiClient.applyForExchange(exchangeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.exchanges.lists() });
    },
  });
}

/**
 * Mutation hook to withdraw from an exchange.
 */
export function useWithdrawFromExchange(): UseMutationResult<
  void,
  Error,
  string
> {
  const queryClient = useQueryClient();
  const isDemoMode = useAuthStore((state) => state.isDemoMode);
  const apiClient = getApiClient(isDemoMode);

  return useMutation({
    mutationFn: (exchangeId: string) =>
      apiClient.withdrawFromExchange(exchangeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.exchanges.lists() });
    },
  });
}
