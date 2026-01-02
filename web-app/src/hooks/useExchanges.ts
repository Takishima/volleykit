import { useMemo } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import { startOfDay, endOfDay } from "date-fns";
import {
  getApiClient,
  type SearchConfiguration,
  type GameExchange,
} from "@/api/client";
import { useAuthStore } from "@/stores/auth";
import { useDemoStore } from "@/stores/demo";
import { queryKeys } from "@/api/queryKeys";
import { DEFAULT_PAGE_SIZE } from "./usePaginatedQuery";
import { getSeasonDateRange } from "@/utils/date-helpers";

// Stable empty array for React Query selectors to prevent unnecessary re-renders.
const EMPTY_EXCHANGES: GameExchange[] = [];

// Exchange status filter type
export type ExchangeStatus = "open" | "applied" | "closed" | "all";

/**
 * Hook to fetch game exchange requests with optional status filtering.
 *
 * The API requires a date filter to return results. We use the current
 * volleyball season dates (September to May) to filter exchanges.
 *
 * @param status - Filter by exchange status, or 'all' for no filtering
 */
export function useGameExchanges(status: ExchangeStatus = "all") {
  const isDemoMode = useAuthStore((state) => state.isDemoMode);
  const activeOccupationId = useAuthStore((state) => state.activeOccupationId);
  const demoAssociationCode = useDemoStore(
    (state) => state.activeAssociationCode,
  );
  const apiClient = getApiClient(isDemoMode);

  // Use appropriate key for cache invalidation when switching associations
  const associationKey = isDemoMode ? demoAssociationCode : activeOccupationId;

  // Only fetch future exchanges - past games are irrelevant for both
  // "open" (can't take over past games) and "applied" (user only cares about upcoming).
  const { fromDate, toDate } = useMemo(() => {
    const { to } = getSeasonDateRange();
    return {
      fromDate: startOfDay(new Date()).toISOString(),
      toDate: endOfDay(to).toISOString(),
    };
  }, []);

  // Build property filters: always include date range, optionally include status
  const propertyFilters = useMemo(() => {
    const filters: SearchConfiguration["propertyFilters"] = [
      {
        propertyName: "refereeGame.game.startingDateTime",
        dateRange: { from: fromDate, to: toDate },
      },
    ];

    if (status !== "all") {
      filters.push({
        propertyName: "status",
        enumValues: [status],
      });
    }

    return filters;
  }, [fromDate, toDate, status]);

  const config = useMemo<SearchConfiguration>(
    () => ({
      offset: 0,
      limit: DEFAULT_PAGE_SIZE,
      propertyFilters,
      propertyOrderings: [
        {
          propertyName: "refereeGame.game.startingDateTime",
          descending: false,
          isSetByUser: true,
        },
      ],
    }),
    [propertyFilters],
  );

  return useQuery({
    queryKey: queryKeys.exchanges.list(config, associationKey),
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
