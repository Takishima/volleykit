import { useCallback, useState } from 'react'

import { useQueryClient } from '@tanstack/react-query'

import { api, getApiClient, type CompensationRecord, type Assignment } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import { useNetworkStatus } from '@/common/hooks/useNetworkStatus'
import { COMPENSATION_LOOKUP_LIMIT } from '@/common/hooks/usePaginatedQuery'
import { createAction } from '@/common/services/offline/action-store'
import { useActionQueueStore } from '@/common/stores/action-queue'
import { useAuthStore } from '@/common/stores/auth'
import { useDemoStore } from '@/common/stores/demo'
import type { MutationCallbacks, OfflineMutationResult } from '@/common/types/mutation'
import { createLogger } from '@/common/utils/logger'

import { COMPENSATION_ERROR_KEYS } from './useCompensationsQuery'

import type { CompensationUpdateData } from '@volleykit/shared/offline'

const log = createLogger('useUpdateAssignmentCompensation')

/**
 * Searches all cached assignment queries for a specific assignment by ID.
 * Uses partial key matching to find assignments regardless of search configuration.
 */
function findAssignmentInCache(
  assignmentId: string,
  queryClient: ReturnType<typeof useQueryClient>
): Assignment | null {
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
  const refreshActionQueue = useActionQueueStore((s) => s.refresh)
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
