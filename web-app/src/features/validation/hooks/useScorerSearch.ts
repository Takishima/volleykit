import { useQuery } from "@tanstack/react-query";
import { getApiClient, type PersonSearchFilter } from "@/api/client";
import {
  validateResponse,
  personSearchResponseSchema,
  type ValidatedPersonSearchResult,
} from "@/api/validation";
import { useAuthStore } from "@/shared/stores/auth";
import { queryKeys } from "@/api/queryKeys";

/**
 * Cache duration for search results.
 * 5 minutes balances data freshness with reducing unnecessary requests:
 * - Person data changes infrequently (names, IDs are stable)
 * - Users often search for the same person multiple times in a session
 * - Reduces load on the Elasticsearch backend
 */
const STALE_TIME_MS = 5 * 60 * 1000;

/**
 * Parses a search input string into search filters.
 * Supports flexible token parsing:
 * - Single word: treated as lastName
 * - Two words: treated as firstName and lastName
 * - Four-digit number at end: treated as yearOfBirth
 *
 * Note: When two name tokens are provided, the first is treated as firstName
 * and the second as lastName. This follows common Western conventions, but
 * Elasticsearch's fuzzy matching typically handles reversed order (e.g.,
 * "Müller Hans" vs "Hans Müller") well since both fields are searched.
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
  data: ValidatedPersonSearchResult[] | undefined;
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
  const dataSource = useAuthStore((state) => state.dataSource);
  const apiClient = getApiClient(dataSource);

  const hasFilters = Boolean(
    filters.firstName || filters.lastName || filters.yearOfBirth,
  );

  const query = useQuery({
    queryKey: queryKeys.scorerSearch.search(filters),
    queryFn: async () => {
      const response = await apiClient.searchPersons(filters);
      const validated = validateResponse(
        response,
        personSearchResponseSchema,
        "scorerSearch",
      );
      return validated.items ?? [];
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
