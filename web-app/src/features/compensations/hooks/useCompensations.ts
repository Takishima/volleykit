import { useCallback, useMemo, useState } from 'react'

import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'

import {
  api,
  getApiClient,
  type SearchConfiguration,
  type CompensationRecord,
  type Assignment,
} from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import { useNetworkStatus } from '@/shared/hooks/useNetworkStatus'
import {
  DEFAULT_PAGE_SIZE,
  COMPENSATION_LOOKUP_LIMIT,
  COMPENSATIONS_STALE_TIME_MS,
  ASSIGNMENTS_STALE_TIME_MS,
} from '@/shared/hooks/usePaginatedQuery'
import { createAction } from '@/shared/services/offline/action-store'
import { useActionQueueStore } from '@/shared/stores/action-queue'
import { useAuthStore } from '@/shared/stores/auth'
import { useDemoStore } from '@/shared/stores/demo'
import type { MutationCallbacks, OfflineMutationResult } from '@/shared/types/mutation'
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

  // Use satisfies for safer typing - will produce compile-time error if
  // CompensationRecord evolves to require additional fields
  return {
    __identity: assignment.__identity,
    refereeGame: assignment.refereeGame,
    convocationCompensation: assignment.convocationCompensation,
    refereeConvocationStatus: assignment.refereeConvocationStatus,
    // Use game start time as compensation date (not ideal but close enough for display)
    compensationDate: assignment.refereeGame?.game?.startingDateTime,
    refereePosition: assignment.refereePosition,
    _permissions: assignment._permissions,
  } satisfies Partial<CompensationRecord> as CompensationRecord
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

  // Check if we have fresh assignments data in cache that we can use instead.
  // Note: This memo depends on queryClient and associationKey, but cache staleness
  // changes over time without triggering re-computation. This is intentional -
  // TanStack Query handles staleness properly and the queryFn is re-evaluated
  // on query refetch, ensuring fresh data is fetched when needed.
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

// Import and re-export CompensationUpdateData from shared for backward compatibility
import type { CompensationUpdateData } from '@volleykit/shared/offline'
export type { CompensationUpdateData }

/**
 * Mutation hook to update a compensation record directly.
 * Supports offline mode - queues changes when offline and syncs when back online.
 * Used when editing from the compensations tab where we have the compensation ID.
 */
export function useUpdateCompensation(): OfflineMutationResult<
  void,
  { compensationId: string; data: CompensationUpdateData }
> {
  const queryClient = useQueryClient()
  const dataSource = useAuthStore((state) => state.dataSource)
  const isOnline = useNetworkStatus()
  const { refresh: refreshActionQueue } = useActionQueueStore()
  const apiClient = getApiClient(dataSource)

  const [isPending, setIsPending] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isError, setIsError] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [wasQueued, setWasQueued] = useState(false)

  const reset = useCallback(() => {
    setIsPending(false)
    setIsSuccess(false)
    setIsError(false)
    setError(null)
    setWasQueued(false)
  }, [])

  const mutateAsync = useCallback(
    async ({ compensationId, data }: { compensationId: string; data: CompensationUpdateData }) => {
      reset()
      setIsPending(true)

      try {
        if (isOnline) {
          // Online: execute immediately
          log.debug('Updating compensation (online):', { compensationId, data, dataSource })
          await apiClient.updateCompensation(compensationId, data)

          // Invalidate queries to refetch fresh data
          await queryClient.invalidateQueries({ queryKey: queryKeys.compensations.lists() })
          await queryClient.invalidateQueries({ queryKey: queryKeys.assignments.lists() })

          setIsSuccess(true)
          setWasQueued(false)
        } else {
          // Offline: queue the action
          log.debug('Queueing compensation update (offline):', { compensationId, data })
          const action = await createAction('updateCompensation', { compensationId, data })

          if (!action) {
            throw new Error('Failed to queue action - IndexedDB unavailable')
          }

          // Refresh action queue store to update badge count
          await refreshActionQueue()

          setIsSuccess(true)
          setWasQueued(true)
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        log.error('Failed to update compensation:', error)
        setIsError(true)
        setError(error)
        throw error
      } finally {
        setIsPending(false)
      }
    },
    [isOnline, dataSource, apiClient, queryClient, refreshActionQueue, reset]
  )

  const mutate = useCallback(
    (
      variables: { compensationId: string; data: CompensationUpdateData },
      options?: MutationCallbacks<void>
    ) => {
      mutateAsync(variables)
        .then(() => {
          options?.onSuccess?.()
        })
        .catch((err) => {
          options?.onError?.(err)
        })
    },
    [mutateAsync]
  )

  return {
    mutate,
    mutateAsync,
    isPending,
    isSuccess,
    isError,
    error,
    reset,
    wasQueued,
  }
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
 * Supports offline mode - queues changes when offline and syncs when back online.
 * Used for updating all compensations at the same hall with the same distance.
 */
export function useBatchUpdateCompensations(): OfflineMutationResult<
  BatchUpdateResult,
  { compensationIds: string[]; data: CompensationUpdateData }
> {
  const queryClient = useQueryClient()
  const dataSource = useAuthStore((state) => state.dataSource)
  const isOnline = useNetworkStatus()
  const { refresh: refreshActionQueue } = useActionQueueStore()
  const apiClient = getApiClient(dataSource)

  const [isPending, setIsPending] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isError, setIsError] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [wasQueued, setWasQueued] = useState(false)

  const reset = useCallback(() => {
    setIsPending(false)
    setIsSuccess(false)
    setIsError(false)
    setError(null)
    setWasQueued(false)
  }, [])

  const mutateAsync = useCallback(
    async ({
      compensationIds,
      data,
    }: {
      compensationIds: string[]
      data: CompensationUpdateData
    }): Promise<BatchUpdateResult> => {
      reset()
      setIsPending(true)

      try {
        if (isOnline) {
          // Online: execute immediately
          log.debug('Batch updating compensations (online):', {
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
            } catch (err) {
              log.error('Failed to update compensation in batch:', { compensationId, error: err })
              failedCount++
            }
          }

          // Invalidate queries to refetch fresh data
          await queryClient.invalidateQueries({ queryKey: queryKeys.compensations.lists() })
          await queryClient.invalidateQueries({ queryKey: queryKeys.assignments.lists() })

          setIsSuccess(true)
          setWasQueued(false)

          return { successCount, failedCount, totalCount: compensationIds.length }
        } else {
          // Offline: queue the action as a single batch
          log.debug('Queueing batch compensation update (offline):', {
            count: compensationIds.length,
            data,
          })
          const action = await createAction('batchUpdateCompensations', { compensationIds, data })

          if (!action) {
            throw new Error('Failed to queue action - IndexedDB unavailable')
          }

          // Refresh action queue store to update badge count
          await refreshActionQueue()

          setIsSuccess(true)
          setWasQueued(true)

          // Return optimistic result (will be verified on sync)
          return {
            successCount: compensationIds.length,
            failedCount: 0,
            totalCount: compensationIds.length,
          }
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        log.error('Failed to batch update compensations:', error)
        setIsError(true)
        setError(error)
        throw error
      } finally {
        setIsPending(false)
      }
    },
    [isOnline, dataSource, apiClient, queryClient, refreshActionQueue, reset]
  )

  const mutate = useCallback(
    (
      variables: { compensationIds: string[]; data: CompensationUpdateData },
      options?: MutationCallbacks<BatchUpdateResult>
    ) => {
      mutateAsync(variables)
        .then((result) => {
          options?.onSuccess?.(result)
        })
        .catch((err) => {
          options?.onError?.(err)
        })
    },
    [mutateAsync]
  )

  return {
    mutate,
    mutateAsync,
    isPending,
    isSuccess,
    isError,
    error,
    reset,
    wasQueued,
  }
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
 * Mutation hook to update compensation from an assignment context.
 * Supports offline mode - resolves compensation ID from cache and queues if offline.
 * Used when editing compensation from the assignments tab (where we have an Assignment, not a CompensationRecord).
 * Handles the lookup of the corresponding compensation record.
 */
export function useUpdateAssignmentCompensation(): OfflineMutationResult<
  void,
  { assignmentId: string; data: CompensationUpdateData }
> {
  const queryClient = useQueryClient()
  const dataSource = useAuthStore((state) => state.dataSource)
  const isDemoMode = dataSource === 'demo'
  const isOnline = useNetworkStatus()
  const { refresh: refreshActionQueue } = useActionQueueStore()
  const updateAssignmentCompensation = useDemoStore((state) => state.updateAssignmentCompensation)
  const apiClient = getApiClient(dataSource)

  const [isPending, setIsPending] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isError, setIsError] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [wasQueued, setWasQueued] = useState(false)

  const reset = useCallback(() => {
    setIsPending(false)
    setIsSuccess(false)
    setIsError(false)
    setError(null)
    setWasQueued(false)
  }, [])

  const mutateAsync = useCallback(
    async ({ assignmentId, data }: { assignmentId: string; data: CompensationUpdateData }) => {
      reset()
      setIsPending(true)

      try {
        if (isDemoMode) {
          // Demo mode: update the demo store directly (always works, no network needed)
          updateAssignmentCompensation(assignmentId, data)
          setIsSuccess(true)
          setWasQueued(false)
          return
        }

        // Find the assignment in cache to get game number for compensation lookup
        const assignment = findAssignmentInCache(assignmentId, queryClient)
        if (!assignment?.refereeGame?.game?.number) {
          throw new Error(COMPENSATION_ERROR_KEYS.ASSIGNMENT_NOT_FOUND)
        }

        const gameNumber = assignment.refereeGame.game.number

        // Try to find compensation ID in cache first
        const cachedComp = findCompensationInCache(gameNumber, queryClient)
        let compensationId = cachedComp?.convocationCompensation?.__identity

        if (isOnline) {
          // Online: can fetch from API if not in cache
          if (!compensationId) {
            log.debug('Compensation not in cache, fetching from API:', { gameNumber })
            const fetchedComp = await fetchCompensationByGameNumber(gameNumber, apiClient)
            compensationId = fetchedComp?.convocationCompensation?.__identity
          }

          if (!compensationId) {
            throw new Error(COMPENSATION_ERROR_KEYS.COMPENSATION_NOT_FOUND)
          }

          log.debug('Updating compensation via API (online):', {
            assignmentId,
            compensationId,
            data,
          })

          await apiClient.updateCompensation(compensationId, data)

          // Invalidate queries
          await queryClient.invalidateQueries({
            queryKey: queryKeys.assignments.detail(assignmentId),
          })
          await queryClient.invalidateQueries({ queryKey: queryKeys.assignments.lists() })
          await queryClient.invalidateQueries({ queryKey: queryKeys.compensations.lists() })

          setIsSuccess(true)
          setWasQueued(false)
        } else {
          // Offline: must have compensation ID from cache
          if (!compensationId) {
            throw new Error(COMPENSATION_ERROR_KEYS.COMPENSATION_NOT_FOUND)
          }

          log.debug('Queueing compensation update (offline):', {
            assignmentId,
            compensationId,
            data,
          })

          // Queue as a direct compensation update since we resolved the ID
          const action = await createAction('updateCompensation', { compensationId, data })

          if (!action) {
            throw new Error('Failed to queue action - IndexedDB unavailable')
          }

          // Refresh action queue store to update badge count
          await refreshActionQueue()

          setIsSuccess(true)
          setWasQueued(true)
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        log.error('Failed to update assignment compensation:', error)
        setIsError(true)
        setError(error)
        throw error
      } finally {
        setIsPending(false)
      }
    },
    [
      isDemoMode,
      isOnline,
      queryClient,
      apiClient,
      updateAssignmentCompensation,
      refreshActionQueue,
      reset,
    ]
  )

  const mutate = useCallback(
    (
      variables: { assignmentId: string; data: CompensationUpdateData },
      options?: MutationCallbacks<void>
    ) => {
      mutateAsync(variables)
        .then(() => {
          options?.onSuccess?.()
        })
        .catch((err) => {
          options?.onError?.(err)
        })
    },
    [mutateAsync]
  )

  return {
    mutate,
    mutateAsync,
    isPending,
    isSuccess,
    isError,
    error,
    reset,
    wasQueued,
  }
}
