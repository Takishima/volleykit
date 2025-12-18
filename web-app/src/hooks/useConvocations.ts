import { useMemo } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from "@tanstack/react-query";
import {
  api,
  getApiClient,
  type SearchConfiguration,
  type CompensationRecord,
  type Assignment,
  type AssociationSettings,
  type Season,
} from "@/api/client";
import {
  addDays,
  startOfDay,
  endOfDay,
  subDays,
  isWithinInterval,
} from "date-fns";
import {
  isValidationClosed,
  DEFAULT_VALIDATION_DEADLINE_HOURS,
} from "@/utils/assignment-helpers";
import { useAuthStore } from "@/stores/auth";
import { useDemoStore } from "@/stores/demo";
import { logger } from "@/utils/logger";

// Pagination constants
// Note: The API doesn't support cursor-based pagination, so we use offset-based.
// DEFAULT_PAGE_SIZE is used for regular queries where 100 items is typically sufficient.
// MAX_FETCH_ALL_PAGES is a safety limit when fetching all pages to prevent runaway requests.
const DEFAULT_PAGE_SIZE = 100;
const MAX_FETCH_ALL_PAGES = 10; // Maximum pages to fetch (1000 items)
const DEFAULT_DATE_RANGE_DAYS = 365;

// Cache duration for validation-closed assignments (15 minutes).
// Longer than default because validation status changes infrequently
// and fetching all pages is expensive.
const VALIDATION_CLOSED_STALE_TIME_MS = 15 * 60 * 1000;

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

/**
 * Safely parses a date string, returning a fallback if invalid.
 * Prevents Invalid Date objects from propagating through the system.
 */
function parseDateOrFallback(
  dateString: string | undefined | null,
  fallback: Date,
): Date {
  if (!dateString) return fallback;
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? fallback : date;
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
 *
 * Stops fetching when any of these conditions are met:
 * - All items fetched (allItems.length >= totalCount)
 * - MAX_FETCH_ALL_PAGES reached (safety limit)
 * - Empty page returned (API exhausted or issue)
 * - Stalled response (totalCount unchanged between pages, indicating potential issue)
 *
 * Note: This function manages its own offset/limit pagination internally.
 * The caller's config should NOT include offset/limit as they will be overwritten.
 *
 * @param config - Search configuration for the API (without offset/limit)
 * @param signal - Optional AbortSignal for cancellation support
 * @returns Array of all fetched assignments
 */
async function fetchAllAssignmentPages(
  config: SearchConfiguration,
  signal?: AbortSignal,
): Promise<Assignment[]> {
  const allItems: Assignment[] = [];
  let offset = 0;
  let totalCount = 0;
  let previousTotalCount = -1;
  let pagesFetched = 0;

  do {
    // Check for cancellation before each request
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    const pageConfig = { ...config, offset, limit: DEFAULT_PAGE_SIZE };
    const response = await api.searchAssignments(pageConfig);

    // Check for cancellation after async operation completes
    // (request may have finished while abort was signaled)
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    const pageItems = response.items || [];

    // Guard against infinite loop: break if page returns no items
    // This can happen if totalItemsCount is stale or API has issues
    if (pageItems.length === 0) {
      break;
    }

    allItems.push(...pageItems);
    previousTotalCount = totalCount;
    totalCount = response.totalItemsCount || 0;

    // Detect stalled responses: if totalCount hasn't changed after adding items,
    // the API may be returning duplicate data or has a pagination issue
    if (
      pagesFetched > 0 &&
      totalCount === previousTotalCount &&
      totalCount > 0
    ) {
      break;
    }

    // Early exit when all items are fetched to avoid unnecessary loop iterations
    if (allItems.length >= totalCount && totalCount > 0) {
      break;
    }

    offset += DEFAULT_PAGE_SIZE;
    pagesFetched++;
  } while (allItems.length < totalCount && pagesFetched < MAX_FETCH_ALL_PAGES);

  // Log warning if we hit the page limit before fetching all items
  if (pagesFetched >= MAX_FETCH_ALL_PAGES && allItems.length < totalCount) {
    logger.warn(
      `[fetchAllAssignmentPages] Reached MAX_FETCH_ALL_PAGES limit (${MAX_FETCH_ALL_PAGES}). ` +
        `Fetched ${allItems.length} of ${totalCount} total items. Some data may be missing.`,
    );
  }

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
// Note: demoAssociationCode is included in query keys to ensure cache invalidation
// when the user switches roles/associations in demo mode. Without this, TanStack Query
// would return stale cached data even after the demo store regenerates data for the new association.
export const queryKeys = {
  assignments: (config?: SearchConfiguration, demoAssociationCode?: string | null) =>
    ["assignments", config, demoAssociationCode] as const,
  assignmentDetails: (id: string) => ["assignment", id] as const,
  compensations: (config?: SearchConfiguration, demoAssociationCode?: string | null) =>
    ["compensations", config, demoAssociationCode] as const,
  exchanges: (config?: SearchConfiguration, demoAssociationCode?: string | null) =>
    ["exchanges", config, demoAssociationCode] as const,
  associationSettings: () => ["associationSettings"] as const,
  activeSeason: () => ["activeSeason"] as const,
  possibleNominations: (nominationListId: string) =>
    ["possibleNominations", nominationListId] as const,
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
) {
  const isDemoMode = useAuthStore((state) => state.isDemoMode);
  const demoAssociationCode = useDemoStore((state) => state.activeAssociationCode);
  const apiClient = getApiClient(isDemoMode);
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

  return useQuery({
    queryKey: queryKeys.assignments(config, isDemoMode ? demoAssociationCode : null),
    queryFn: () => apiClient.searchAssignments(config),
    select: (data) => data.items || [],
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpcomingAssignments() {
  return useAssignments("upcoming");
}

export function usePastAssignments() {
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
 * - Falls back to defaults if settings/season queries fail
 * - Uses shared filtering logic between production and demo modes
 * - Supports cancellation via AbortController
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
  const {
    data: settings,
    isSuccess: settingsSuccess,
    isError: settingsError,
  } = useAssociationSettings();
  const {
    data: season,
    isSuccess: seasonSuccess,
    isError: seasonError,
  } = useActiveSeason();

  // Memoize date calculations to prevent query key changes on every render.
  // Only recalculate when season data actually changes.
  const { fromDate, toDate } = useMemo(() => {
    const now = new Date();
    const seasonStart = parseDateOrFallback(
      season?.seasonStartDate,
      subDays(now, DEFAULT_DATE_RANGE_DAYS),
    );
    const seasonEnd = parseDateOrFallback(season?.seasonEndDate, now);

    return {
      fromDate: startOfDay(seasonStart).toISOString(),
      toDate: endOfDay(now < seasonEnd ? now : seasonEnd).toISOString(),
    };
  }, [season?.seasonStartDate, season?.seasonEndDate]);

  const deadlineHours =
    settings?.hoursAfterGameStartForRefereeToEditGameList ??
    DEFAULT_VALIDATION_DEADLINE_HOURS;

  // Memoize config to prevent unnecessary object recreation
  const config = useMemo<SearchConfiguration>(
    () => ({
      propertyFilters: [
        {
          propertyName: "refereeGame.game.startingDateTime",
          dateRange: { from: fromDate, to: toDate },
        },
      ],
      propertyOrderings: [
        {
          propertyName: "refereeGame.game.startingDateTime",
          descending: true, // Most recent first
          isSetByUser: true,
        },
      ],
    }),
    [fromDate, toDate],
  );

  // Wait for settings and season to load before making the main query.
  // Use isSuccess for reliable state detection (avoids race conditions where
  // isLoading is false but data hasn't arrived yet).
  // If either query fails, proceed with defaults rather than blocking indefinitely.
  // Extra checks: verify we have actual data when queries succeed to prevent
  // race conditions where isSuccess is true but derived values use stale data.
  const settingsResolved = settingsSuccess || settingsError;
  const seasonResolved = seasonSuccess || seasonError;
  const hasSettingsData = settingsSuccess ? settings !== undefined : true;
  const hasSeasonDates = seasonSuccess
    ? season?.seasonStartDate !== undefined
    : true;
  const isReady =
    !isDemoMode &&
    settingsResolved &&
    seasonResolved &&
    hasSettingsData &&
    hasSeasonDates;

  const query = useQuery({
    queryKey: [
      "assignments",
      "validationClosed",
      fromDate,
      toDate,
      deadlineHours,
    ],
    queryFn: async ({ signal }) => {
      // Fetch all pages because API doesn't support server-side filtering
      // by validation status - we must filter client-side after fetching.
      const allItems = await fetchAllAssignmentPages(config, signal);
      return filterByValidationClosed(allItems, deadlineHours);
    },
    // Longer cache time because validation status changes infrequently
    // and fetching all pages is expensive (multiple API calls).
    staleTime: VALIDATION_CLOSED_STALE_TIME_MS,
    enabled: isReady,
  });

  // Memoize demo data filtering to prevent recalculation on every render.
  // Only recompute when demo assignments, date range, or deadline changes.
  const demoFilteredData = useMemo(() => {
    if (!isDemoMode) return [];

    // Defensive fallback: store initializes assignments as [], but during SSR/hydration
    // or in test environments, the store state may not be fully initialized yet.
    const assignments = Array.isArray(demoAssignments) ? demoAssignments : [];
    const inDateRange = assignments.filter((assignment) => {
      const gameDate = assignment.refereeGame?.game?.startingDateTime;
      if (!gameDate) return false;

      const date = new Date(gameDate);
      return isWithinInterval(date, {
        start: new Date(fromDate),
        end: new Date(toDate),
      });
    });
    const filtered = filterByValidationClosed(inDateRange, deadlineHours);
    return sortByGameDate(filtered, true);
  }, [isDemoMode, demoAssignments, fromDate, toDate, deadlineHours]);

  if (isDemoMode) {
    return createDemoQueryResult(query, demoFilteredData);
  }

  return query;
}

export function useAssignmentDetails(assignmentId: string | null) {
  const isDemoMode = useAuthStore((state) => state.isDemoMode);
  const apiClient = getApiClient(isDemoMode);

  return useQuery({
    queryKey: queryKeys.assignmentDetails(assignmentId || ""),
    queryFn: () =>
      apiClient.getAssignmentDetails(assignmentId!, [
        "refereeGame.game.encounter.teamHome",
        "refereeGame.game.encounter.teamAway",
        "refereeGame.game.hall",
        "refereeGame.game.hall.postalAddress",
      ]),
    enabled: !!assignmentId,
    staleTime: 10 * 60 * 1000,
  });
}

// Compensations hooks
export function useCompensations(paidFilter?: boolean) {
  const isDemoMode = useAuthStore((state) => state.isDemoMode);
  const demoAssociationCode = useDemoStore((state) => state.activeAssociationCode);
  const apiClient = getApiClient(isDemoMode);

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

  return useQuery({
    queryKey: queryKeys.compensations(config, isDemoMode ? demoAssociationCode : null),
    queryFn: () => apiClient.searchCompensations(config),
    select: (data) => data.items || [],
    staleTime: 5 * 60 * 1000,
  });
}

export function usePaidCompensations() {
  return useCompensations(true);
}

export function useUnpaidCompensations() {
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

export function useGameExchanges(status: ExchangeStatus = "all") {
  const isDemoMode = useAuthStore((state) => state.isDemoMode);
  const demoAssociationCode = useDemoStore((state) => state.activeAssociationCode);
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
    queryKey: queryKeys.exchanges(config, isDemoMode ? demoAssociationCode : null),
    queryFn: () => apiClient.searchExchanges(config),
    select: (data) => data.items || [],
    staleTime: 2 * 60 * 1000,
  });
}

export function useApplyForExchange(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  const isDemoMode = useAuthStore((state) => state.isDemoMode);
  const apiClient = getApiClient(isDemoMode);

  return useMutation({
    mutationFn: (exchangeId: string) => apiClient.applyForExchange(exchangeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exchanges"] });
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
  const apiClient = getApiClient(isDemoMode);

  return useMutation({
    mutationFn: (exchangeId: string) =>
      apiClient.withdrawFromExchange(exchangeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exchanges"] });
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
