import { useMemo } from 'react'

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseMutationResult,
  type QueryClient,
} from '@tanstack/react-query'

import {
  api,
  getApiClient,
  type SearchConfiguration,
  type CompensationRecord,
  type Assignment,
} from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import {
  DEFAULT_PAGE_SIZE,
  COMPENSATION_LOOKUP_LIMIT,
  COMPENSATIONS_STALE_TIME_MS,
  ASSIGNMENTS_STALE_TIME_MS,
} from '@/shared/hooks/usePaginatedQuery'
import { useAuthStore } from '@/shared/stores/auth'
import { useDemoStore } from '@/shared/stores/demo'
import { createLogger } from '@/shared/utils/logger'

const log = createLogger('useCompensations')

// Stable empty array for React Query selectors to prevent unnecessary re-renders.
const EMPTY_COMPENSATIONS: CompensationRecord[] = []

/**
 * Transforms an Assignment to a CompensationRecord format.
 * Used when deriving compensation data from cached assignments.
 */
function assignmentToCompensationRecord(assignment: Assignment): CompensationRecord | null {
  // Skip assignments without compensation data
  if (!assignment.convocationCompensation) {
    return null
  }

  return {
    __identity: assignment.__identity,
    refereeGame: assignment.refereeGame,
    convocationCompensation: assignment.convocationCompensation,
    refereeConvocationStatus: assignment.refereeConvocationStatus,
    // Use game start time as compensation date (not ideal but close enough for display)
    compensationDate: assignment.refereeGame?.game?.startingDateTime,
    refereePosition: assignment.refereePosition,
    _permissions: assignment._permissions,
  } as CompensationRecord
}

/**
 * Gets fresh (non-stale) assignments from cache if available.
 * Returns null if cache is empty or stale.
 */
function getFreshAssignmentsFromCache(
  queryClient: QueryClient,
  associationKey: string | null
): Assignment[] | null {
  // Check all cached assignment queries for this association
  const queries = queryClient.getQueriesData<{ items: Assignment[] }>({
    queryKey: queryKeys.assignments.all,
  })

  // Collect all assignments from fresh cache entries
  const freshAssignments: Assignment[] = []
  const now = Date.now()

  for (const [queryKey, data] of queries) {
    // Check if this query is for the current association
    // Query key format: ['assignments', 'list', config, associationKey]
    const keyAssociationKey = queryKey[3]
    if (keyAssociationKey !== associationKey) continue

    // Check if query is fresh (not stale)
    const queryState = queryClient.getQueryState(queryKey)
    if (!queryState?.dataUpdatedAt) continue

    const age = now - queryState.dataUpdatedAt
    if (age > ASSIGNMENTS_STALE_TIME_MS) continue

    // This cache entry is fresh - collect its assignments
    if (data?.items) {
      freshAssignments.push(...data.items)
    }
  }

  if (freshAssignments.length === 0) {
    return null
  }

  // Deduplicate by __identity (same assignment may appear in multiple queries)
  const seen = new Set<string>()
  const deduplicated = freshAssignments.filter((a) => {
    if (seen.has(a.__identity)) return false
    seen.add(a.__identity)
    return true
  })

  log.debug('Found fresh assignments in cache:', { count: deduplicated.length })
  return deduplicated
}

/**
 * Error keys for compensation-related errors.
 * These correspond to i18n keys in compensations.* namespace.
 * Use with translateCompensationError() to get localized messages.
 */
export const COMPENSATION_ERROR_KEYS = {
  ASSIGNMENT_NOT_FOUND: 'compensations.assignmentNotFoundInCache',
  COMPENSATION_NOT_FOUND: 'compensations.compensationNotFound',
  COMPENSATION_MISSING_ID: 'compensations.compensationMissingId',
} as const

export type CompensationErrorKey =
  (typeof COMPENSATION_ERROR_KEYS)[keyof typeof COMPENSATION_ERROR_KEYS]

/**
 * Hook to fetch compensation records with optional paid/unpaid filtering.
 *
 * Optimization: Uses cached assignment data when available and fresh to avoid
 * a separate API call. Falls back to the compensations endpoint if assignments
 * cache is stale or empty.
 *
 * Note: The volleymanager API does not support filtering by paymentDone=true/false.
 * It only supports NOT_NULL to check if compensation data exists. Therefore, we
 * fetch all compensations and apply client-side filtering for paid/unpaid status.
 *
 * @param paidFilter - Optional filter: true for paid, false for unpaid, undefined for all
 */
export function useCompensations(paidFilter?: boolean) {
  const queryClient = useQueryClient()
  const dataSource = useAuthStore((state) => state.dataSource)
  const isDemoMode = dataSource === 'demo'
  const activeOccupationId = useAuthStore((state) => state.activeOccupationId)
  const demoAssociationCode = useDemoStore((state) => state.activeAssociationCode)
  const apiClient = getApiClient(dataSource)

  // Use appropriate key for cache invalidation when switching associations
  const associationKey = isDemoMode ? demoAssociationCode : activeOccupationId

  // Check if we have fresh assignments data in cache that we can use instead
  const cachedCompensations = useMemo(() => {
    const freshAssignments = getFreshAssignmentsFromCache(queryClient, associationKey)
    if (!freshAssignments) return null

    // Transform assignments to compensation records
    const records = freshAssignments
      .map(assignmentToCompensationRecord)
      .filter((r): r is CompensationRecord => r !== null)

    log.debug('Derived compensations from assignments cache:', { count: records.length })
    return { items: records, totalItemsCount: records.length }
  }, [queryClient, associationKey])

  // Note: We don't send paymentDone filter to the API because the real API
  // doesn't support "true"/"false" values - it only supports "NOT_NULL".
  // Client-side filtering is applied in the select function instead.
  const config: SearchConfiguration = {
    offset: 0,
    limit: DEFAULT_PAGE_SIZE,
    propertyFilters: [],
    propertyOrderings: [
      {
        propertyName: 'refereeGame.game.startingDateTime',
        descending: true,
        isSetByUser: true,
      },
    ],
  }

  return useQuery({
    // All tabs share the same base query - filtering is done client-side via select
    queryKey: queryKeys.compensations.list(config, associationKey),
    queryFn: () => {
      // If we have fresh cached data from assignments, use it instead of fetching
      if (cachedCompensations) {
        log.debug('Using cached assignments data for compensations (skipping API call)')
        return Promise.resolve(cachedCompensations)
      }
      return apiClient.searchCompensations(config)
    },
    select: (data) => {
      const items = data.items ?? EMPTY_COMPENSATIONS
      // Apply client-side filtering for paid/unpaid status
      if (paidFilter === undefined) {
        return items
      }
      return items.filter((record) => record.convocationCompensation?.paymentDone === paidFilter)
    },
    staleTime: COMPENSATIONS_STALE_TIME_MS,
  })
}

/**
 * Convenience hook for paid compensations.
 */
export function usePaidCompensations() {
  return useCompensations(true)
}

/**
 * Convenience hook for unpaid compensations.
 */
export function useUnpaidCompensations() {
  return useCompensations(false)
}

// Compensation update types
export interface CompensationUpdateData {
  distanceInMetres?: number
  correctionReason?: string
}

/**
 * Mutation hook to update a compensation record directly.
 * Used when editing from the compensations tab where we have the compensation ID.
 */
export function useUpdateCompensation(): UseMutationResult<
  void,
  Error,
  { compensationId: string; data: CompensationUpdateData }
> {
  const queryClient = useQueryClient()
  const dataSource = useAuthStore((state) => state.dataSource)
  const apiClient = getApiClient(dataSource)

  return useMutation({
    mutationFn: async ({
      compensationId,
      data,
    }: {
      compensationId: string
      data: CompensationUpdateData
    }) => {
      log.debug('Updating compensation:', {
        compensationId,
        data,
        dataSource,
      })
      await apiClient.updateCompensation(compensationId, data)
    },
    onSuccess: () => {
      // Invalidate compensation lists (not details) to refetch fresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.compensations.lists() })
    },
  })
}

/**
 * Result of a batch compensation update operation.
 */
export interface BatchUpdateResult {
  successCount: number
  failedCount: number
  totalCount: number
}

/**
 * Mutation hook to update multiple compensations in a batch.
 * Used for updating all compensations at the same hall with the same distance.
 */
export function useBatchUpdateCompensations(): UseMutationResult<
  BatchUpdateResult,
  Error,
  { compensationIds: string[]; data: CompensationUpdateData }
> {
  const queryClient = useQueryClient()
  const dataSource = useAuthStore((state) => state.dataSource)
  const apiClient = getApiClient(dataSource)

  return useMutation({
    mutationFn: async ({
      compensationIds,
      data,
    }: {
      compensationIds: string[]
      data: CompensationUpdateData
    }): Promise<BatchUpdateResult> => {
      log.debug('Batch updating compensations:', {
        count: compensationIds.length,
        data,
        dataSource,
      })

      let successCount = 0
      let failedCount = 0

      // Update each compensation sequentially to avoid overwhelming the API
      for (const compensationId of compensationIds) {
        try {
          await apiClient.updateCompensation(compensationId, data)
          successCount++
        } catch (error) {
          log.error('Failed to update compensation in batch:', { compensationId, error })
          failedCount++
        }
      }

      return {
        successCount,
        failedCount,
        totalCount: compensationIds.length,
      }
    },
    onSuccess: () => {
      // Invalidate compensation lists to refetch fresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.compensations.lists() })
    },
  })
}

/**
 * Searches all cached assignment queries for a specific assignment by ID.
 * Uses partial key matching to find assignments regardless of search configuration.
 */
function findAssignmentInCache(
  assignmentId: string,
  queryClient: ReturnType<typeof useQueryClient>
): Assignment | null {
  // Get all cached queries that start with "assignments"
  const queries = queryClient.getQueriesData<{ items: Assignment[] }>({
    queryKey: queryKeys.assignments.all,
  })

  for (const [, data] of queries) {
    const assignment = data?.items?.find((a) => a.__identity === assignmentId)
    if (assignment) {
      return assignment
    }
  }
  return null
}

/**
 * Searches all cached compensation queries for a compensation matching the game number.
 * Uses partial key matching to find compensations regardless of search configuration.
 */
function findCompensationInCache(
  gameNumber: number,
  queryClient: ReturnType<typeof useQueryClient>
): CompensationRecord | null {
  // Get all cached queries that start with "compensations"
  const queries = queryClient.getQueriesData<{ items: CompensationRecord[] }>({
    queryKey: queryKeys.compensations.all,
  })

  for (const [, data] of queries) {
    const comp = data?.items?.find((c) => c.refereeGame?.game?.number === gameNumber)
    if (comp) {
      return comp
    }
  }
  return null
}

/**
 * Fetches compensations from the API and finds one matching the game number.
 */
async function fetchCompensationByGameNumber(
  gameNumber: number,
  apiClient: typeof api
): Promise<CompensationRecord | null> {
  log.debug('Fetching compensations from API:', { gameNumber })

  const compensations = await apiClient.searchCompensations({
    limit: COMPENSATION_LOOKUP_LIMIT,
  })

  return compensations.items.find((c) => c.refereeGame?.game?.number === gameNumber) || null
}

/**
 * Finds the corresponding compensation record for an assignment by matching game numbers.
 * This is needed because assignments don't have the convocationCompensation.__identity
 * required by the compensation update API.
 *
 * @param assignmentId - The assignment's __identity (convocation ID)
 * @param queryClient - TanStack Query client for cache access
 * @param apiClient - The API client to use for fetching compensations
 * @returns The matching CompensationRecord
 * @throws Error if assignment or compensation cannot be found
 */
async function findCompensationForAssignment(
  assignmentId: string,
  queryClient: ReturnType<typeof useQueryClient>,
  apiClient: typeof api
): Promise<CompensationRecord> {
  // Find the assignment in cache to get its game number
  const assignment = findAssignmentInCache(assignmentId, queryClient)

  if (!assignment?.refereeGame?.game?.number) {
    throw new Error(COMPENSATION_ERROR_KEYS.ASSIGNMENT_NOT_FOUND)
  }

  const gameNumber = assignment.refereeGame.game.number

  // Try to find compensation in cache first
  const cachedComp = findCompensationInCache(gameNumber, queryClient)
  if (cachedComp) {
    log.debug('Found compensation in cache:', {
      gameNumber,
      compensationId: cachedComp.convocationCompensation?.__identity,
    })
    return cachedComp
  }

  // Fetch from API if not in cache
  const fetchedComp = await fetchCompensationByGameNumber(gameNumber, apiClient)
  if (fetchedComp) {
    log.debug('Found compensation via API:', {
      gameNumber,
      compensationId: fetchedComp.convocationCompensation?.__identity,
    })
    return fetchedComp
  }

  throw new Error(COMPENSATION_ERROR_KEYS.COMPENSATION_NOT_FOUND)
}

/**
 * Mutation hook to update compensation from an assignment context.
 * Used when editing compensation from the assignments tab (where we have an Assignment, not a CompensationRecord).
 * Handles the lookup of the corresponding compensation record.
 */
export function useUpdateAssignmentCompensation(): UseMutationResult<
  void,
  Error,
  { assignmentId: string; data: CompensationUpdateData }
> {
  const queryClient = useQueryClient()
  const dataSource = useAuthStore((state) => state.dataSource)
  const isDemoMode = dataSource === 'demo'
  const updateAssignmentCompensation = useDemoStore((state) => state.updateAssignmentCompensation)
  const apiClient = getApiClient(dataSource)

  return useMutation({
    mutationFn: async ({
      assignmentId,
      data,
    }: {
      assignmentId: string
      data: CompensationUpdateData
    }) => {
      if (isDemoMode) {
        // Demo mode: update the demo store directly
        updateAssignmentCompensation(assignmentId, data)
        return
      }

      // Non-demo mode: find the corresponding compensation record and update it via API
      log.debug('Looking up compensation for assignment:', {
        assignmentId,
        data,
      })

      // findCompensationForAssignment throws if assignment or compensation not found
      const compensation = await findCompensationForAssignment(assignmentId, queryClient, apiClient)
      const compensationId = compensation.convocationCompensation?.__identity

      if (!compensationId) {
        throw new Error(COMPENSATION_ERROR_KEYS.COMPENSATION_MISSING_ID)
      }

      log.debug('Updating compensation via API:', {
        assignmentId,
        compensationId,
        data,
        dataSource,
      })

      await apiClient.updateCompensation(compensationId, data)
    },
    onSuccess: (_data, variables) => {
      // Invalidate targeted queries to refetch fresh data while avoiding unnecessary refetches
      // 1. Invalidate the specific assignment detail (if cached)
      queryClient.invalidateQueries({
        queryKey: queryKeys.assignments.detail(variables.assignmentId),
      })
      // 2. Invalidate assignment lists (compensation data is embedded in list items)
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments.lists() })
      // 3. Invalidate compensation lists
      queryClient.invalidateQueries({ queryKey: queryKeys.compensations.lists() })
    },
  })
}
