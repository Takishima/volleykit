/**
 * Hook for executing mutations with offline support.
 *
 * Provides a unified interface for mutations that:
 * - Execute immediately when online
 * - Queue in IndexedDB when offline
 * - Support optimistic updates
 * - Trigger sync when connectivity is restored
 */

import { useCallback, useState } from 'react'

import { useQueryClient } from '@tanstack/react-query'

import { api } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import { useNetworkStatus } from '@/shared/hooks/useNetworkStatus'
import { createAction } from '@/shared/services/offline/action-store'
import { syncPendingActions } from '@/shared/services/offline/action-sync'
import type {
  ActionType,
  ActionPayload,
  OfflineAction,
} from '@/shared/services/offline/action-types'
import { createLogger } from '@/shared/utils/logger'


const log = createLogger('useOfflineAction')

/**
 * Result of an offline action execution.
 */
export interface OfflineActionResult {
  /** Whether the action was executed immediately (online) or queued (offline) */
  mode: 'immediate' | 'queued'
  /** The created action (if queued) */
  action?: OfflineAction
  /** Error message if execution failed */
  error?: string
}

/**
 * Options for executing an offline action.
 */
export interface ExecuteOptions {
  /** Callback for optimistic update before execution */
  onOptimisticUpdate?: () => void
  /** Callback on successful execution */
  onSuccess?: () => void
  /** Callback on error */
  onError?: (error: Error) => void
  /** Callback when action is queued (offline) */
  onQueued?: (action: OfflineAction) => void
}

/**
 * Execute a mutation action against the API.
 */
async function executeApiAction<T extends ActionType>(
  type: T,
  payload: ActionPayload<T>
): Promise<void> {
  switch (type) {
    case 'updateCompensation': {
      const p = payload as ActionPayload<'updateCompensation'>
      await api.updateCompensation(p.compensationId, p.data)
      break
    }

    case 'updateAssignmentCompensation': {
      // This is handled specially by the mutation hook
      // as it requires looking up the compensation ID
      throw new Error('updateAssignmentCompensation should be handled by the mutation hook')
    }

    case 'batchUpdateCompensations': {
      const p = payload as ActionPayload<'batchUpdateCompensations'>
      for (const compensationId of p.compensationIds) {
        await api.updateCompensation(compensationId, p.data)
      }
      break
    }

    case 'applyForExchange': {
      const p = payload as ActionPayload<'applyForExchange'>
      await api.applyForExchange(p.exchangeId)
      break
    }

    case 'withdrawFromExchange': {
      const p = payload as ActionPayload<'withdrawFromExchange'>
      await api.withdrawFromExchange(p.exchangeId)
      break
    }

    case 'addToExchange': {
      const p = payload as ActionPayload<'addToExchange'>
      await api.addToExchange(p.convocationId)
      break
    }

    default: {
      const _exhaustive: never = type
      throw new Error(`Unknown action type: ${_exhaustive}`)
    }
  }
}

/**
 * Get query keys to invalidate for a given action type.
 */
function getInvalidationKeys(type: ActionType): readonly (readonly unknown[])[] {
  switch (type) {
    case 'updateCompensation':
    case 'updateAssignmentCompensation':
    case 'batchUpdateCompensations':
      return [queryKeys.compensations.lists(), queryKeys.assignments.lists()]

    case 'applyForExchange':
    case 'withdrawFromExchange':
      return [queryKeys.exchanges.lists()]

    case 'addToExchange':
      return [queryKeys.exchanges.lists(), queryKeys.assignments.lists()]

    default:
      return []
  }
}

/**
 * Hook for executing a specific action type with offline support.
 *
 * @param type - The action type to execute
 * @returns Object with execute function and loading state
 */
export function useOfflineAction<T extends ActionType>(type: T) {
  const isOnline = useNetworkStatus()
  const queryClient = useQueryClient()
  const [isExecuting, setIsExecuting] = useState(false)

  const execute = useCallback(
    async (
      payload: ActionPayload<T>,
      options?: ExecuteOptions
    ): Promise<OfflineActionResult> => {
      setIsExecuting(true)

      // Apply optimistic update if provided
      options?.onOptimisticUpdate?.()

      try {
        if (isOnline) {
          // Online: execute immediately
          log.debug('Executing action immediately (online):', { type })
          await executeApiAction(type, payload)

          // Invalidate relevant queries
          const keys = getInvalidationKeys(type)
          await Promise.all(
            keys.map((key) => queryClient.invalidateQueries({ queryKey: key }))
          )

          options?.onSuccess?.()
          return { mode: 'immediate' }
        } else {
          // Offline: queue the action
          log.debug('Queueing action (offline):', { type })
          const action = await createAction(type, payload)

          if (!action) {
            throw new Error('Failed to queue action - IndexedDB unavailable')
          }

          options?.onQueued?.(action)
          return { mode: 'queued', action }
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error))
        log.error('Action execution failed:', { type, error: err.message })
        options?.onError?.(err)
        return { mode: isOnline ? 'immediate' : 'queued', error: err.message }
      } finally {
        setIsExecuting(false)
      }
    },
    [type, isOnline, queryClient]
  )

  return {
    execute,
    isExecuting,
    isOnline,
  }
}

/**
 * Hook for syncing pending actions when connectivity is restored.
 *
 * This hook should be used in a component that monitors network status
 * and triggers sync when the app comes back online.
 */
export function useActionSync() {
  const queryClient = useQueryClient()
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncResult, setLastSyncResult] = useState<{
    succeeded: number
    failed: number
    requiresReauth: boolean
  } | null>(null)

  const sync = useCallback(async () => {
    if (isSyncing) {
      log.debug('Sync already in progress, skipping')
      return
    }

    setIsSyncing(true)
    try {
      const result = await syncPendingActions(queryClient)
      setLastSyncResult({
        succeeded: result.succeeded,
        failed: result.failed,
        requiresReauth: result.requiresReauth,
      })
      return result
    } finally {
      setIsSyncing(false)
    }
  }, [queryClient, isSyncing])

  return {
    sync,
    isSyncing,
    lastSyncResult,
  }
}
