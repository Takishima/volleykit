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
  type AssociationSettings,
  type Season,
} from "@/api/client";
import { addDays, startOfDay, endOfDay, subDays, isWithinInterval } from "date-fns";
import {
  isValidationClosed,
  DEFAULT_VALIDATION_DEADLINE_HOURS,
} from "@/utils/assignment-helpers";
import { useAuthStore } from "@/stores/auth";
import { useDemoStore } from "@/stores/demo";

// Pagination constants
// Note: The API doesn't support cursor-based pagination, so we use offset-based.
// DEFAULT_PAGE_SIZE is used for regular queries where 100 items is typically sufficient.
// MAX_FETCH_ALL_PAGES is a safety limit when fetching all pages to prevent runaway requests.
const DEFAULT_PAGE_SIZE = 100;
const MAX_FETCH_ALL_PAGES = 10; // Maximum pages to fetch (1000 items)
const DEFAULT_DATE_RANGE_DAYS = 365;

// Fallback timestamp for items with missing dates - uses Unix epoch (1970-01-01)
// Items with missing dates will sort as oldest when ascending, newest when descending
const MISSING_DATE_FALLBACK_TIMESTAMP = 0;

// Helper type for items with game date
type WithGameDate = {
  refereeGame?: { game?: { startingDateTime?: string } };
};

// Helper to extract game timestamp for sorting
function getGameTimestamp(item: WithGameDate): number {
  return new Date(
    item.refereeGame?.game?.startingDateTime || MISSING_DATE_FALLBACK_TIMESTAMP,
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

/**
 * Helper to filter assignments by validation closed status.
 * Shared between demo mode and production code to avoid duplication.
 */
function filterByValidationClosed(
  items: Assignment[],
  deadlineHours: number,
): Assignment[] {
  return items.filter((assignment) =>
    isValidationClosed(
      assignment.refereeGame?.game?.startingDateTime,
      deadlineHours,
    ),
  );
}

/**
 * Fetches all pages of assignments matching the search configuration.
 * Uses sequential fetching to avoid overwhelming the API.
 * Stops when all items are fetched or MAX_FETCH_ALL_PAGES is reached.
 */
async function fetchAllAssignmentPages(
  config: SearchConfiguration,
): Promise<Assignment[]> {
  const allItems: Assignment[] = [];
  let offset = 0;
  let totalCount = 0;
  let pagesFetched = 0;

  do {
    const pageConfig = { ...config, offset, limit: DEFAULT_PAGE_SIZE };
    const response = await api.searchAssignments(pageConfig);

    allItems.push(...(response.items || []));
    totalCount = response.totalItemsCount || 0;
    offset += DEFAULT_PAGE_SIZE;
    pagesFetched++;
  } while (
    allItems.length < totalCount &&
    pagesFetched < MAX_FETCH_ALL_PAGES
  );

  return allItems;
}

// Helper to create mock query results for demo mode
// Type assertion is necessary because we're creating a partial mock of UseQueryResult
// that satisfies the interface without all internal TanStack Query state.
// Limitations: refetch, dataUpdatedAt, and other internal query methods are inherited
// from the disabled base query and won't function as expected. Consumers should check
// isError before accessing data, as data may be undefined in error cases.
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
  associationSettings: () => ["associationSettings"] as const,
  activeSeason: () => ["activeSeason"] as const,
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

  // Create base query (disabled in demo mode but needed for result structure)
  // The query object provides the UseQueryResult shape that createDemoQueryResult extends
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

/**
 * Hook to fetch assignments where validation period has closed.
 *
 * This fetches past games from the current season and filters them
 * to only include games where the validation deadline has passed.
 * The deadline is determined by the association settings field
 * `hoursAfterGameStartForRefereeToEditGameList`.
 *
 * Features:
 * - Fetches all pages to ensure no games are missed (up to MAX_FETCH_ALL_PAGES)
 * - Waits for settings and season data before querying to avoid stale results
 * - Uses shared filtering logic between production and demo modes
 */
export function useValidationClosedAssignments(): UseQueryResult<
  Assignment[],
  Error
> {
  const isDemoMode = useAuthStore((state) => state.isDemoMode);
  const demoAssignments = useDemoStore((state) => state.assignments);

  // Fetch settings and season for filtering
  // Note: In demo mode, these queries are disabled (enabled: !isDemoMode),
  // so settings and season will be undefined, causing fallback to defaults:
  // - deadlineHours falls back to DEFAULT_VALIDATION_DEADLINE_HOURS (6 hours)
  // - seasonStart falls back to 365 days ago
  const { data: settings, isLoading: settingsLoading } = useAssociationSettings();
  const { data: season, isLoading: seasonLoading } = useActiveSeason();

  // Calculate date range for the query
  // Use season dates if available, otherwise fall back to default range
  const now = new Date();
  const seasonStart = season?.seasonStartDate
    ? new Date(season.seasonStartDate)
    : subDays(now, DEFAULT_DATE_RANGE_DAYS);
  const seasonEnd = season?.seasonEndDate
    ? new Date(season.seasonEndDate)
    : now;

  // Query from season start to now (we only want past games)
  const dateRange = {
    from: startOfDay(seasonStart).toISOString(),
    to: endOfDay(now < seasonEnd ? now : seasonEnd).toISOString(),
  };

  const deadlineHours =
    settings?.hoursAfterGameStartForRefereeToEditGameList ??
    DEFAULT_VALIDATION_DEADLINE_HOURS;

  const config: SearchConfiguration = {
    propertyFilters: [
      {
        propertyName: "refereeGame.game.startingDateTime",
        dateRange,
      },
    ],
    propertyOrderings: [
      {
        propertyName: "refereeGame.game.startingDateTime",
        descending: true, // Most recent first
        isSetByUser: true,
      },
    ],
  };

  // Wait for settings and season to load before making the main query.
  // This prevents fetching with stale/default values, then refetching.
  const isReady = !isDemoMode && !settingsLoading && !seasonLoading;

  const query = useQuery({
    queryKey: [...queryKeys.assignments(config), "validationClosed", deadlineHours],
    queryFn: async () => {
      // Fetch all pages to ensure we don't miss any games in the season
      const allItems = await fetchAllAssignmentPages(config);
      // Filter to only include assignments where validation is closed
      return filterByValidationClosed(allItems, deadlineHours);
    },
    staleTime: 5 * 60 * 1000,
    enabled: isReady,
  });

  if (isDemoMode) {
    // Filter demo assignments by date range and validation status
    // Uses shared filterByValidationClosed helper to avoid duplication
    const inDateRange = demoAssignments.filter((assignment) => {
      const gameDate = assignment.refereeGame?.game?.startingDateTime;
      if (!gameDate) return false;

      const date = new Date(gameDate);
      return isWithinInterval(date, {
        start: new Date(dateRange.from),
        end: new Date(dateRange.to),
      });
    });
    const filtered = filterByValidationClosed(inDateRange, deadlineHours);
    const sorted = sortByGameDate(filtered, true);
    return createDemoQueryResult(query, sorted);
  }

  return query;
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

// Settings hooks
export function useAssociationSettings(): UseQueryResult<
  AssociationSettings,
  Error
> {
  const isDemoMode = useAuthStore((state) => state.isDemoMode);

  return useQuery({
    queryKey: queryKeys.associationSettings(),
    queryFn: () => api.getAssociationSettings(),
    staleTime: 30 * 60 * 1000, // 30 minutes - settings rarely change
    enabled: !isDemoMode,
  });
}

export function useActiveSeason(): UseQueryResult<Season, Error> {
  const isDemoMode = useAuthStore((state) => state.isDemoMode);

  return useQuery({
    queryKey: queryKeys.activeSeason(),
    queryFn: () => api.getActiveSeason(),
    staleTime: 60 * 60 * 1000, // 1 hour - season rarely changes
    enabled: !isDemoMode,
  });
}
