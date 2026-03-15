/**
 * Reusable queryOptions() factories for TanStack Query v5+.
 *
 * Each factory bundles queryKey + queryFn + config into a single object
 * that can be shared between useQuery, useSuspenseQuery, prefetchQuery,
 * and cache operations (invalidateQueries, resetQueries).
 *
 * Usage:
 *   useQuery(assignmentListOptions(apiClient, config, associationKey))
 *   queryClient.prefetchQuery(assignmentListOptions(apiClient, config, associationKey))
 */

import { queryOptions } from '@tanstack/react-query'

import type {
  SearchConfiguration,
  AssociationSettings,
  Season,
  PersonSearchFilter,
  PossibleNomination,
  PossibleNominationsResponse,
  ApiClient,
} from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import {
  validateResponse,
  personSearchResponseSchema,
  type ValidatedPersonSearchResult,
} from '@/api/validation'
import {
  ASSIGNMENTS_STALE_TIME_MS,
  COMPENSATIONS_STALE_TIME_MS,
  SETTINGS_STALE_TIME_MS,
  SEASON_STALE_TIME_MS,
} from '@/shared/hooks/usePaginatedQuery'
import { MS_PER_MINUTE } from '@/shared/utils/constants'

// ── Assignments ──────────────────────────────────────────────────────

export function assignmentListOptions(
  apiClient: ApiClient,
  config: SearchConfiguration,
  associationKey: string | null
) {
  return queryOptions({
    queryKey: queryKeys.assignments.list(config, associationKey),
    queryFn: () => apiClient.searchAssignments(config),
    staleTime: ASSIGNMENTS_STALE_TIME_MS,
  })
}

export function assignmentDetailOptions(apiClient: ApiClient, assignmentId: string) {
  return queryOptions({
    queryKey: queryKeys.assignments.detail(assignmentId),
    queryFn: () =>
      apiClient.getAssignmentDetails(assignmentId, [
        'refereeGame.game.encounter.teamHome',
        'refereeGame.game.encounter.teamAway',
        'refereeGame.game.hall',
        'refereeGame.game.hall.primaryPostalAddress',
      ]),
    staleTime: ASSIGNMENTS_STALE_TIME_MS * 2,
  })
}

// ── Compensations ────────────────────────────────────────────────────

export function compensationListOptions(
  apiClient: ApiClient,
  config: SearchConfiguration,
  associationKey: string | null
) {
  return queryOptions({
    queryKey: queryKeys.compensations.list(config, associationKey),
    queryFn: () => apiClient.searchCompensations(config),
    staleTime: COMPENSATIONS_STALE_TIME_MS,
  })
}

// ── Exchanges ────────────────────────────────────────────────────────

export function exchangeListOptions(
  apiClient: ApiClient,
  config: SearchConfiguration,
  associationKey: string | null
) {
  return queryOptions({
    queryKey: queryKeys.exchanges.list(config, associationKey),
    queryFn: () => apiClient.searchExchanges(config),
    staleTime: 2 * MS_PER_MINUTE,
  })
}

// ── Settings & Seasons ───────────────────────────────────────────────

export function associationSettingsOptions(apiClient: ApiClient, occupationId: string | null) {
  return queryOptions<AssociationSettings>({
    queryKey: queryKeys.settings.association(occupationId),
    queryFn: () => apiClient.getAssociationSettings(),
    staleTime: SETTINGS_STALE_TIME_MS,
  })
}

export function activeSeasonOptions(apiClient: ApiClient, occupationId: string | null) {
  return queryOptions<Season>({
    queryKey: queryKeys.seasons.active(occupationId),
    queryFn: () => apiClient.getActiveSeason(),
    staleTime: SEASON_STALE_TIME_MS,
  })
}

// ── Validation ───────────────────────────────────────────────────────

export function gameDetailOptions(apiClient: ApiClient, gameId: string) {
  return queryOptions({
    queryKey: queryKeys.validation.gameDetail(gameId),
    queryFn: () => apiClient.getGameWithScoresheet(gameId),
    staleTime: ASSIGNMENTS_STALE_TIME_MS,
  })
}

export function scorerSearchOptions(apiClient: ApiClient, filters: PersonSearchFilter) {
  return queryOptions<ValidatedPersonSearchResult[]>({
    queryKey: queryKeys.scorerSearch.search(filters),
    queryFn: async () => {
      const response = await apiClient.searchPersons(filters)
      const validated = validateResponse(response, personSearchResponseSchema, 'scorerSearch')
      return validated.items ?? []
    },
    staleTime: ASSIGNMENTS_STALE_TIME_MS,
  })
}

export function possibleNominationsOptions(apiClient: ApiClient, nominationListId: string) {
  return queryOptions<PossibleNomination[]>({
    queryKey: queryKeys.nominations.possible(nominationListId),
    queryFn: async () => {
      const response: PossibleNominationsResponse =
        await apiClient.getPossiblePlayerNominations(nominationListId)
      return response.items ?? []
    },
    staleTime: ASSIGNMENTS_STALE_TIME_MS,
  })
}

// ── Referee Backup ───────────────────────────────────────────────────

export function refereeBackupListOptions(
  apiClient: ApiClient,
  config: SearchConfiguration,
  associationKey: string | null
) {
  return queryOptions({
    queryKey: queryKeys.refereeBackup.list(config, associationKey),
    queryFn: () => apiClient.searchRefereeBackups(config),
    staleTime: 2 * MS_PER_MINUTE,
  })
}
