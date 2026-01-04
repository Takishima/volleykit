import { useMemo } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import { startOfDay, endOfDay, format } from "date-fns";
import {
  getApiClient,
  type SearchConfiguration,
  type GameExchange,
} from "@/api/client";
import { useAuthStore } from "@/stores/auth";
import { useDemoStore, DEMO_USER_PERSON_IDENTITY } from "@/stores/demo";
import { queryKeys } from "@/api/queryKeys";
import { DEFAULT_PAGE_SIZE } from "./usePaginatedQuery";
import { getSeasonDateRange } from "@/utils/date-helpers";

// Format date as YYYY-MM-DD for stable comparison (no time component)
const formatDateKey = (date: Date): string => format(date, "yyyy-MM-dd");

// Stable empty array for React Query selectors to prevent unnecessary re-renders.
const EMPTY_EXCHANGES: GameExchange[] = [];

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
  const dataSource = useAuthStore((state) => state.dataSource);
  const isDemoMode = dataSource === "demo";
  const activeOccupationId = useAuthStore((state) => state.activeOccupationId);
  const userId = useAuthStore((state) => state.user?.id);
  const demoAssociationCode = useDemoStore(
    (state) => state.activeAssociationCode,
  );
  const apiClient = getApiClient(dataSource);

  // Use appropriate key for cache invalidation when switching associations
  const associationKey = isDemoMode ? demoAssociationCode : activeOccupationId;

  // Compute date keys (YYYY-MM-DD) for stable memoization.
  // Using just the date portion ensures the key is stable within the same day.
  const todayKey = formatDateKey(new Date());
  const seasonEndKey = formatDateKey(getSeasonDateRange().to);

  // Memoize date range to ensure stable query key across tab switches.
  // Only recalculates when the day changes (for overnight refresh).
  const dateRange = useMemo(
    () => ({
      from: startOfDay(new Date()).toISOString(),
      to: endOfDay(getSeasonDateRange().to).toISOString(),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Use date keys for stability, not Date objects
    [todayKey, seasonEndKey],
  );

  // Build property filters: always fetch open exchanges, filter client-side for "mine".
  // This allows both tabs to share the same cached query.
  const propertyFilters = useMemo<SearchConfiguration["propertyFilters"]>(
    () => [
      {
        propertyName: "refereeGame.game.startingDateTime",
        dateRange,
      },
      {
        propertyName: "status",
        enumValues: ["open"],
      },
    ],
    [dateRange],
  );

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

  // Filter by submittedByPerson for "mine" status. Both tabs share the same
  // cached query (open exchanges), with "mine" filtering to show only the
  // user's own submissions.
  const selectExchanges = useMemo(() => {
    return (data: { items?: GameExchange[] }) => {
      const items = data.items ?? EMPTY_EXCHANGES;

      if (status === "mine") {
        const userIdentity = isDemoMode ? DEMO_USER_PERSON_IDENTITY : userId;
        if (!userIdentity) return EMPTY_EXCHANGES;

        return items.filter(
          (exchange) => exchange.submittedByPerson?.__identity === userIdentity
        );
      }

      return items;
    };
  }, [status, isDemoMode, userId]);

  return useQuery({
    queryKey: queryKeys.exchanges.list(config, associationKey),
    queryFn: () => apiClient.searchExchanges(config),
    select: selectExchanges,
    staleTime: 2 * 60 * 1000,
    // Keep previous data while selector recalculates during tab switches.
    // This prevents loading flash since both tabs share the same cached query.
    placeholderData: (prev) => prev,
  });
}

/**
 * Mutation hook to apply for an exchange.
 */
export function useApplyForExchange(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  const dataSource = useAuthStore((state) => state.dataSource);
  const apiClient = getApiClient(dataSource);

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
  const dataSource = useAuthStore((state) => state.dataSource);
  const apiClient = getApiClient(dataSource);

  return useMutation({
    mutationFn: (exchangeId: string) =>
      apiClient.withdrawFromExchange(exchangeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.exchanges.lists() });
    },
  });
}
