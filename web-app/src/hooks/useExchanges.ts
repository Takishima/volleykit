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

// Demo user identity used for client-side filtering in demo mode
const DEMO_USER_IDENTITY = "demo-me";

// Exchange status filter type
// "mine" shows exchanges submitted by the current user (regardless of status)
export type ExchangeStatus = "open" | "applied" | "closed" | "all" | "mine";

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
  // No useMemo: the calculation is trivial, and we need fresh dates if the app
  // stays open overnight (the query key change will trigger a refetch).
  const { to: seasonEnd } = getSeasonDateRange();
  const fromDate = startOfDay(new Date()).toISOString();
  const toDate = endOfDay(seasonEnd).toISOString();

  // Build property filters: always include date range, optionally include status
  // For "mine", we don't filter by status - we'll filter client-side by submittedByPerson
  const propertyFilters = useMemo(() => {
    const filters: SearchConfiguration["propertyFilters"] = [
      {
        propertyName: "refereeGame.game.startingDateTime",
        dateRange: { from: fromDate, to: toDate },
      },
    ];

    // "mine" and "all" don't filter by status
    if (status !== "all" && status !== "mine") {
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

  // Create select function that filters by submittedByPerson for "mine" status
  // In demo mode, we filter client-side; in production, the API may handle this
  const selectExchanges = useMemo(() => {
    return (data: { items?: GameExchange[] }) => {
      const items = data.items ?? EMPTY_EXCHANGES;

      // For "mine" status in demo mode, filter to show only user's submitted exchanges
      if (status === "mine" && isDemoMode) {
        return items.filter(
          (exchange) => exchange.submittedByPerson?.__identity === DEMO_USER_IDENTITY
        );
      }

      return items;
    };
  }, [status, isDemoMode]);

  return useQuery({
    queryKey: queryKeys.exchanges.list(config, associationKey),
    queryFn: () => apiClient.searchExchanges(config),
    select: selectExchanges,
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
