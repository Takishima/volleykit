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

// Volleyball season months (0-indexed): September = 8, May = 4
const SEASON_START_MONTH = 8; // September
const SEASON_END_MONTH = 4; // May

/**
 * Calculate the current volleyball season date range.
 * A season runs from beginning of September to end of May of the following year.
 *
 * @returns Object with season start and end dates
 */
function getSeasonDateRange(): { from: Date; to: Date } {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  let seasonStartYear: number;
  let seasonEndYear: number;

  if (currentMonth >= SEASON_START_MONTH) {
    // September-December: season is current year to next year
    seasonStartYear = currentYear;
    seasonEndYear = currentYear + 1;
  } else {
    // January-August: season is previous year to current year
    seasonStartYear = currentYear - 1;
    seasonEndYear = currentYear;
  }

  // Season starts September 1st
  const seasonStart = new Date(seasonStartYear, SEASON_START_MONTH, 1);
  // Season ends May 31st
  const seasonEnd = new Date(seasonEndYear, SEASON_END_MONTH + 1, 0); // Day 0 of June = May 31st

  return { from: seasonStart, to: seasonEnd };
}

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

  // Memoize season date range. The season only changes once per year,
  // so this is stable for the entire session.
  const { fromDate, toDate } = useMemo(() => {
    const { from, to } = getSeasonDateRange();
    return {
      fromDate: startOfDay(from).toISOString(),
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
