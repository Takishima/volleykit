import { useCallback, useState } from 'react'

import { useQueryClient } from '@tanstack/react-query'

import { getApiClient } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import { useNetworkStatus } from '@/common/hooks/useNetworkStatus'
import { createAction } from '@/common/services/offline/action-store'
import { useActionQueueStore } from '@/common/stores/action-queue'
import { useAuthStore } from '@/common/stores/auth'
import type { MutationCallbacks, OfflineMutationResult } from '@/common/types/mutation'
import { createLogger } from '@/common/utils/logger'

// Import and re-export CompensationUpdateData from shared for backward compatibility
import type { CompensationUpdateData } from '@volleykit/shared/offline'
export type { CompensationUpdateData }

// Re-export useUpdateAssignmentCompensation from its own module
export { useUpdateAssignmentCompensation } from './useUpdateAssignmentCompensation'

const log = createLogger('useCompensationMutations')

/**
 * Result of a batch compensation update operation.
 */
export interface BatchUpdateResult {
  successCount: number
  failedCount: number
  totalCount: number
}

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
  const refreshActionQueue = useActionQueueStore((s) => s.refresh)
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
  const refreshActionQueue = useActionQueueStore((s) => s.refresh)
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
