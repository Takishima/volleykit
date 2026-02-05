import { useQuery } from '@tanstack/react-query'

import { getApiClient, type PersonSearchFilter } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import {
  validateResponse,
  personSearchResponseSchema,
  type ValidatedPersonSearchResult,
} from '@/api/validation'
import { ASSIGNMENTS_STALE_TIME_MS } from '@/shared/hooks/usePaginatedQuery'
import { useAuthStore } from '@/shared/stores/auth'

/**
 * Parses a search input string into search filters.
 * Supports flexible token parsing:
 * - Single word: treated as lastName
 * - Two words: treated as firstName and lastName
 * - Four-digit number at end: treated as yearOfBirth
 *
 * Note: When two name tokens are provided, the first is treated as firstName
 * and the second as lastName. The API layer searches both orderings in parallel,
 * so "Müller Hans" and "Hans Müller" produce the same results.
 *
 * @example
 * parseSearchInput("müller") // { lastName: "müller" }
 * parseSearchInput("hans müller") // { firstName: "hans", lastName: "müller" }
 * parseSearchInput("müller 1985") // { lastName: "müller", yearOfBirth: "1985" }
 * parseSearchInput("hans müller 1985") // { firstName: "hans", lastName: "müller", yearOfBirth: "1985" }
 */
export function parseSearchInput(input: string): PersonSearchFilter {
  const trimmed = input.trim()
  if (!trimmed) {
    return {}
  }

  const tokens = trimmed.split(/\s+/)
  const result: PersonSearchFilter = {}

  // Check if last token is a year (4 digits)
  const lastToken = tokens[tokens.length - 1]
  if (lastToken && /^\d{4}$/.test(lastToken)) {
    result.yearOfBirth = lastToken
    tokens.pop()
  }

  // Parse remaining name tokens
  if (tokens.length === 1) {
    result.lastName = tokens[0]
  } else if (tokens.length >= 2) {
    // First token as firstName, rest as lastName
    result.firstName = tokens[0]
    result.lastName = tokens.slice(1).join(' ')
  }

  return result
}

interface UseScorerSearchOptions {
  enabled?: boolean
}

interface UseScorerSearchResult {
  data: ValidatedPersonSearchResult[] | undefined
  isLoading: boolean
  isError: boolean
  error: Error | null
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
  options: UseScorerSearchOptions = {}
): UseScorerSearchResult {
  const dataSource = useAuthStore((state) => state.dataSource)
  const apiClient = getApiClient(dataSource)

  const hasFilters = Boolean(filters.firstName || filters.lastName || filters.yearOfBirth)

  const query = useQuery({
    queryKey: queryKeys.scorerSearch.search(filters),
    queryFn: async () => {
      const response = await apiClient.searchPersons(filters)
      const validated = validateResponse(response, personSearchResponseSchema, 'scorerSearch')
      return validated.items ?? []
    },
    enabled: options.enabled !== false && hasFilters,
    staleTime: ASSIGNMENTS_STALE_TIME_MS,
  })

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  }
}
