/**
 * Shared utilities for person search scoring and ranking.
 *
 * Used by both the real API client and the mock API to ensure consistent
 * ranking behavior when the user types names in any order (e.g., "LastName FirstName").
 */

/** Match scores for ranking person search results (higher = better match). */
const SCORE_EXACT = 4
const SCORE_PREFIX = 3
const SCORE_QUERY_CONTAINS_FIELD = 2
const SCORE_SUBSTRING = 1

/**
 * Normalize a string for accent-insensitive comparison.
 * Uses Unicode NFD decomposition to strip combining diacritical marks,
 * e.g. "Bühler" → "buhler", "Renée" → "renee".
 */
export function normalizeForComparison(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

/**
 * Score how well a single field matches a query term.
 * Higher score = better match.
 */
function scoreField(field: string, query: string): number {
  if (field === query) return SCORE_EXACT
  if (field.startsWith(query)) return SCORE_PREFIX
  if (query.startsWith(field)) return SCORE_QUERY_CONTAINS_FIELD
  if (field.includes(query)) return SCORE_SUBSTRING
  return 0
}

/**
 * Score how well a person's name matches two search terms, trying both orderings.
 * Used to re-rank merged results so "Lastname Firstname" and "Firstname Lastname"
 * both surface the correct person first.
 *
 * @param firstName - The person's first name (will be normalized)
 * @param lastName - The person's last name (will be normalized)
 * @param term1 - First search term (will be normalized)
 * @param term2 - Second search term (will be normalized)
 */
export function scoreNameMatch(
  firstName: string,
  lastName: string,
  term1: string,
  term2: string
): number {
  const first = normalizeForComparison(firstName)
  const last = normalizeForComparison(lastName)
  const t1 = normalizeForComparison(term1)
  const t2 = normalizeForComparison(term2)

  // Try both orderings: t1=firstName/t2=lastName and t1=lastName/t2=firstName
  const score1 = scoreField(first, t1) + scoreField(last, t2)
  const score2 = scoreField(first, t2) + scoreField(last, t1)

  return Math.max(score1, score2)
}
