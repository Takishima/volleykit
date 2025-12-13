import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from "@tanstack/react-query";
import {
  api,
  type SearchConfiguration,
  type CompensationRecord,
  type Assignment,
  type GameExchange,
} from "@/api/client";
import { addDays, startOfDay, endOfDay, subDays } from "date-fns";
import { useAuthStore } from "@/stores/auth";
import { useDemoStore } from "@/stores/demo";

// Pagination constants
// Note: The API doesn't support cursor-based pagination, so we use a fixed limit.
// For users with >100 items, consider implementing "load more" or virtual scrolling.
const DEFAULT_PAGE_SIZE = 100;
const DEFAULT_DATE_RANGE_DAYS = 365;
const EPOCH_TIMESTAMP = 0;

// Helper type for items with game date
type WithGameDate = {
  refereeGame?: { game?: { startingDateTime?: string } };
};

// Helper to extract game timestamp for sorting
function getGameTimestamp(item: WithGameDate): number {
  return new Date(
    item.refereeGame?.game?.startingDateTime || EPOCH_TIMESTAMP,
  ).getTime();
}

// Helper to sort items by game date
function sortByGameDate<T extends WithGameDate>(
  items: T[],
  descending: boolean,
): T[] {
  return [...items].sort((a, b) => {
    const dateA = getGameTimestamp(a);
    const dateB = getGameTimestamp(b);
    return descending ? dateB - dateA : dateA - dateB;
  });
}

// Helper to filter items by date range
function filterByDateRange<T extends WithGameDate>(
  items: T[],
  fromDate: Date,
  toDate: Date,
): T[] {
  return items.filter((item) => {
    const gameDate = item.refereeGame?.game?.startingDateTime;
    if (!gameDate) return false;
    const date = new Date(gameDate);
    return date >= fromDate && date <= toDate;
  });
}

// Helper to create mock query results for demo mode
// Type assertion is necessary because we're creating a partial mock of UseQueryResult
// that satisfies the interface without all internal TanStack Query state
function createDemoQueryResult<T>(
  baseQuery: UseQueryResult<T, Error>,
  data: T,
  options: { isError?: boolean; error?: Error } = {},
): UseQueryResult<T, Error> {
  const isError = options.isError ?? false;
  return {
    ...baseQuery,
    data,
    isLoading: false,
    isFetching: false,
    isSuccess: !isError,
    isError,
    error: options.error ?? null,
    status: isError ? "error" : "success",
    fetchStatus: "idle",
  } as UseQueryResult<T, Error>;
}

// Query keys
export const queryKeys = {
  assignments: (config?: SearchConfiguration) =>
    ["assignments", config] as const,
  assignmentDetails: (id: string) => ["assignment", id] as const,
  compensations: (config?: SearchConfiguration) =>
    ["compensations", config] as const,
  exchanges: (config?: SearchConfiguration) => ["exchanges", config] as const,
};

// Date period presets
export type DatePeriod =
  | "upcoming"
  | "past"
  | "thisWeek"
  | "nextMonth"
  | "custom";

export function getDateRangeForPeriod(
  period: DatePeriod,
  customRange?: { from: Date; to: Date },
): { from: string; to: string } {
  const now = new Date();

  switch (period) {
    case "upcoming":
      return {
        from: startOfDay(now).toISOString(),
        to: endOfDay(addDays(now, DEFAULT_DATE_RANGE_DAYS)).toISOString(),
      };
    case "past":
      return {
        from: startOfDay(subDays(now, DEFAULT_DATE_RANGE_DAYS)).toISOString(),
        to: endOfDay(subDays(now, 1)).toISOString(),
      };
    case "thisWeek":
      return {
        from: startOfDay(now).toISOString(),
        to: endOfDay(addDays(now, 7)).toISOString(),
      };
    case "nextMonth":
      return {
        from: startOfDay(now).toISOString(),
        to: endOfDay(addDays(now, 30)).toISOString(),
      };
    case "custom":
      if (customRange) {
        return {
          from: startOfDay(customRange.from).toISOString(),
          to: endOfDay(customRange.to).toISOString(),
        };
      }
      return getDateRangeForPeriod("upcoming");
  }
}

// Assignments hooks
export function useAssignments(
  period: DatePeriod = "upcoming",
  customRange?: { from: Date; to: Date },
): UseQueryResult<Assignment[], Error> {
  const isDemoMode = useAuthStore((state) => state.isDemoMode);
  const demoAssignments = useDemoStore((state) => state.assignments);
  const dateRange = getDateRangeForPeriod(period, customRange);

  const config: SearchConfiguration = {
    offset: 0,
    limit: DEFAULT_PAGE_SIZE,
    propertyFilters: [
      {
        propertyName: "refereeGame.game.startingDateTime",
        dateRange,
      },
    ],
    propertyOrderings: [
      {
        propertyName: "refereeGame.game.startingDateTime",
        descending: period === "past",
        isSetByUser: true,
      },
    ],
  };

  const query = useQuery({
    queryKey: queryKeys.assignments(config),
    queryFn: () => api.searchAssignments(config),
    select: (data) => data.items || [],
    staleTime: 5 * 60 * 1000,
    enabled: !isDemoMode,
  });

  if (isDemoMode) {
    const fromDate = new Date(dateRange.from);
    const toDate = new Date(dateRange.to);
    const filtered = filterByDateRange(demoAssignments, fromDate, toDate);
    const sorted = sortByGameDate(filtered, period === "past");
    return createDemoQueryResult(query, sorted);
  }

  return query;
}

export function useUpcomingAssignments(): UseQueryResult<Assignment[], Error> {
  return useAssignments("upcoming");
}

export function usePastAssignments(): UseQueryResult<Assignment[], Error> {
  return useAssignments("past");
}

export function useAssignmentDetails(
  assignmentId: string | null,
): UseQueryResult<Assignment, Error> {
  const isDemoMode = useAuthStore((state) => state.isDemoMode);
  const demoAssignments = useDemoStore((state) => state.assignments);

  const query = useQuery({
    queryKey: queryKeys.assignmentDetails(assignmentId || ""),
    queryFn: () =>
      api.getAssignmentDetails(assignmentId!, [
        "refereeGame.game.encounter.teamHome",
        "refereeGame.game.encounter.teamAway",
        "refereeGame.game.hall",
        "refereeGame.game.hall.postalAddress",
      ]),
    enabled: !!assignmentId && !isDemoMode,
    staleTime: 10 * 60 * 1000,
  });

  if (isDemoMode && assignmentId) {
    const demoAssignment = demoAssignments.find(
      (a) => a.__identity === assignmentId,
    );

    if (!demoAssignment) {
      return createDemoQueryResult(query, undefined as unknown as Assignment, {
        isError: true,
        error: new Error("Assignment not found"),
      });
    }

    return createDemoQueryResult(query, demoAssignment);
  }

  return query;
}

// Compensations hooks
export function useCompensations(
  paidFilter?: boolean,
): UseQueryResult<CompensationRecord[], Error> {
  const isDemoMode = useAuthStore((state) => state.isDemoMode);
  const demoCompensations = useDemoStore((state) => state.compensations);

  const config: SearchConfiguration = {
    offset: 0,
    limit: DEFAULT_PAGE_SIZE,
    propertyFilters:
      paidFilter !== undefined
        ? [
            {
              propertyName: "convocationCompensation.paymentDone",
              values: [String(paidFilter)],
            },
          ]
        : [],
    propertyOrderings: [
      {
        propertyName: "refereeGame.game.startingDateTime",
        descending: true,
        isSetByUser: true,
      },
    ],
  };

  const query = useQuery({
    queryKey: queryKeys.compensations(config),
    queryFn: () => api.searchCompensations(config),
    select: (data) => data.items || [],
    staleTime: 5 * 60 * 1000,
    enabled: !isDemoMode,
  });

  if (isDemoMode) {
    const filtered =
      paidFilter === undefined
        ? demoCompensations
        : demoCompensations.filter(
            (c) => c.convocationCompensation?.paymentDone === paidFilter,
          );
    const sorted = sortByGameDate(filtered, true);
    return createDemoQueryResult(query, sorted);
  }

  return query;
}

export function usePaidCompensations(): UseQueryResult<
  CompensationRecord[],
  Error
> {
  return useCompensations(true);
}

export function useUnpaidCompensations(): UseQueryResult<
  CompensationRecord[],
  Error
> {
  return useCompensations(false);
}

// Derived compensation totals
export function useCompensationTotals(): { paid: number; unpaid: number } {
  const { data: all = [] } = useCompensations();

  const totals = all.reduce(
    (acc: { paid: number; unpaid: number }, record: CompensationRecord) => {
      const comp = record.convocationCompensation;
      if (!comp) return acc;

      const total = (comp.gameCompensation || 0) + (comp.travelExpenses || 0);

      if (comp.paymentDone) {
        acc.paid += total;
      } else {
        acc.unpaid += total;
      }
      return acc;
    },
    { paid: 0, unpaid: 0 },
  );

  return totals;
}

// Game exchanges hooks
export type ExchangeStatus = "open" | "applied" | "closed" | "all";

export function useGameExchanges(
  status: ExchangeStatus = "all",
): UseQueryResult<GameExchange[], Error> {
  const isDemoMode = useAuthStore((state) => state.isDemoMode);
  const demoExchanges = useDemoStore((state) => state.exchanges);

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

  const query = useQuery({
    queryKey: queryKeys.exchanges(config),
    queryFn: () => api.searchExchanges(config),
    select: (data) => data.items || [],
    staleTime: 2 * 60 * 1000,
    enabled: !isDemoMode,
  });

  if (isDemoMode) {
    const filtered =
      status === "all"
        ? demoExchanges
        : demoExchanges.filter((e) => e.status === status);
    const sorted = sortByGameDate(filtered, false);
    return createDemoQueryResult(query, sorted);
  }

  return query;
}

export function useApplyForExchange(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  const isDemoMode = useAuthStore((state) => state.isDemoMode);

  return useMutation({
    mutationFn: (exchangeId: string) => {
      if (isDemoMode) {
        return Promise.resolve();
      }
      return api.applyForExchange(exchangeId);
    },
    onSuccess: () => {
      if (!isDemoMode) {
        queryClient.invalidateQueries({ queryKey: ["exchanges"] });
      }
    },
  });
}

export function useWithdrawFromExchange(): UseMutationResult<
  void,
  Error,
  string
> {
  const queryClient = useQueryClient();
  const isDemoMode = useAuthStore((state) => state.isDemoMode);

  return useMutation({
    mutationFn: (exchangeId: string) => {
      if (isDemoMode) {
        return Promise.resolve();
      }
      return api.withdrawFromExchange(exchangeId);
    },
    onSuccess: () => {
      if (!isDemoMode) {
        queryClient.invalidateQueries({ queryKey: ["exchanges"] });
      }
    },
  });
}
