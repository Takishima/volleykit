import { useQuery } from "@tanstack/react-query";
import {
  getApiClient,
  type PersonSearchFilter,
  type PersonSearchResult,
} from "@/api/client";
import { useAuthStore } from "@/stores/auth";

// Query key factory for scorer search
const scorerSearchKeys = {
  all: ["scorerSearch"] as const,
  search: (filters: PersonSearchFilter) =>
    [...scorerSearchKeys.all, filters] as const,
};

// Cache duration: 5 minutes for search results
const STALE_TIME_MS = 5 * 60 * 1000;

/**
 * Parses a search input string into search filters.
 * Supports flexible token parsing:
 * - Single word: treated as lastName
 * - Two words: treated as firstName and lastName (any order)
 * - Four-digit number at end: treated as yearOfBirth
 *
 * @example
 * parseSearchInput("müller") // { lastName: "müller" }
 * parseSearchInput("hans müller") // { firstName: "hans", lastName: "müller" }
 * parseSearchInput("müller 1985") // { lastName: "müller", yearOfBirth: "1985" }
 * parseSearchInput("hans müller 1985") // { firstName: "hans", lastName: "müller", yearOfBirth: "1985" }
 */
export function parseSearchInput(input: string): PersonSearchFilter {
  const trimmed = input.trim();
  if (!trimmed) {
    return {};
  }

  const tokens = trimmed.split(/\s+/);
  const result: PersonSearchFilter = {};

  // Check if last token is a year (4 digits)
  const lastToken = tokens[tokens.length - 1];
  if (lastToken && /^\d{4}$/.test(lastToken)) {
    result.yearOfBirth = lastToken;
    tokens.pop();
  }

  // Parse remaining name tokens
  if (tokens.length === 1) {
    result.lastName = tokens[0];
  } else if (tokens.length >= 2) {
    // First token as firstName, rest as lastName
    result.firstName = tokens[0];
    result.lastName = tokens.slice(1).join(" ");
  }

  return result;
}

interface UseScorerSearchOptions {
  enabled?: boolean;
}

interface UseScorerSearchResult {
  data: PersonSearchResult[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

/**
 * Hook for searching scorers/persons by name or year of birth.
 * Uses TanStack Query for caching and automatic refetching.
 *
 * @param filters - Search filters (firstName, lastName, yearOfBirth)
 * @param options - Query options
 * @returns Query result with search results
 * @example
 * const { data, isLoading } = useScorerSearch({ lastName: 'müller' });
 */
export function useScorerSearch(
  filters: PersonSearchFilter,
  options: UseScorerSearchOptions = {},
): UseScorerSearchResult {
  const isDemoMode = useAuthStore((state) => state.isDemoMode);
  const apiClient = getApiClient(isDemoMode);

  const hasFilters = Boolean(
    filters.firstName || filters.lastName || filters.yearOfBirth,
  );

  const query = useQuery({
    queryKey: scorerSearchKeys.search(filters),
    queryFn: async () => {
      const response = await apiClient.searchPersons(filters);
      return response.items ?? [];
    },
    enabled: options.enabled !== false && hasFilters,
    staleTime: STALE_TIME_MS,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
