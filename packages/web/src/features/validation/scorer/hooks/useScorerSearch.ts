import { useQuery } from '@tanstack/react-query'

import { getApiClient, type PersonSearchFilter } from '@/api/client'
import { scorerSearchOptions } from '@/api/queryOptions'
import type { ValidatedPersonSearchResult } from '@/api/validation'
import { useAuthStore } from '@/common/stores/auth'

/**
 * Common surname particles that indicate the token is part of a compound
 * surname rather than a standalone first name (e.g. "di Martino", "von Berg").
 */
const SURNAME_PARTICLES = new Set([
  'de',
  'del',
  'della',
  'di',
  'du',
  'von',
  'van',
  'den',
  'der',
  'la',
  'le',
  'las',
  'los',
  'dos',
  'da',
  'das',
])

/**
 * Parses a search input string into search filters.
 * Supports flexible token parsing:
 * - Single word: treated as lastName
 * - Two words: treated as firstName and lastName
 * - Four-digit number at end: treated as yearOfBirth
 *
 * When the first token is a surname particle (e.g. "di", "von", "de"),
 * the entire name is treated as a lastName to preserve compound surnames
 * like "di Martino" or "de la Cruz".
 *
 * Note: When two name tokens are provided, the first is treated as firstName
 * and the second as lastName. The API layer searches both orderings in parallel,
 * so "Müller Hans" and "Hans Müller" produce the same results.
 *
 * @example
 * parseSearchInput("müller") // { lastName: "müller" }
 * parseSearchInput("hans müller") // { firstName: "hans", lastName: "müller" }
 * parseSearchInput("di martino") // { lastName: "di martino" }
 * parseSearchInput("müller 1985") // { lastName: "müller", yearOfBirth: "1985" }
 * parseSearchInput("hans müller 1985") // { firstName: "hans", lastName: "müller", yearOfBirth: "1985" }
 */
export function parseSearchInput(input: string): PersonSearchFilter {
  const trimmed = input.trim()
  if (!trimmed) {
    return {}
  }

  // Purely numeric input (not exactly 4 digits, which is year-of-birth) → association ID search
  const YEAR_LENGTH = 4
  if (/^\d+$/.test(trimmed) && trimmed.length !== YEAR_LENGTH) {
    return { associationId: trimmed }
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
    // If the first token is a surname particle (e.g. "di", "von", "de"),
    // treat the entire input as a lastName to preserve compound surnames
    // like "di Martino", "von Berg", "de la Cruz".
    if (SURNAME_PARTICLES.has(tokens[0]!.toLowerCase())) {
      result.lastName = tokens.join(' ')
    } else {
      // First token as firstName, rest as lastName
      result.firstName = tokens[0]
      result.lastName = tokens.slice(1).join(' ')
    }
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

  const hasFilters = Boolean(
    filters.firstName || filters.lastName || filters.yearOfBirth || filters.associationId
  )

  const query = useQuery({
    ...scorerSearchOptions(apiClient, filters),
    enabled: options.enabled !== false && hasFilters,
  })

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  }
}
