/**
 * Action sync service for processing offline mutation queue.
 *
 * Handles:
 * - Processing pending actions when connectivity is restored
 * - Retry logic with exponential backoff
 * - Conflict detection and error handling
 * - Session expiry detection
 */


import { api } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import { createLogger } from '@/shared/utils/logger'

import {
  getPendingActions,
  markActionSyncing,
  markActionFailed,
  deleteAction,
} from './action-store'
import { MAX_RETRY_COUNT, RETRY_DELAY_BASE_MS } from './action-types'

import type { OfflineAction } from './action-types'
import type { QueryClient } from '@tanstack/react-query'

const log = createLogger('action-sync')

/**
 * Result of syncing a single action.
 */
export interface ActionSyncResult {
  action: OfflineAction
  success: boolean
  error?: string
  requiresReauth?: boolean
}

/**
 * Result of syncing all pending actions.
 */
export interface SyncResult {
  processed: number
  succeeded: number
  failed: number
  requiresReauth: boolean
  results: ActionSyncResult[]
}

/**
 * Check if an error indicates session expiry.
 */
function isSessionExpiredError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return (
      message.includes('unauthorized') ||
      message.includes('401') ||
      message.includes('session') ||
      message.includes('login')
    )
  }
  return false
}

/**
 * Check if an error indicates a conflict (entity was modified/deleted).
 */
function isConflictError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return (
      message.includes('not found') ||
      message.includes('404') ||
      message.includes('conflict') ||
      message.includes('409') ||
      message.includes('already')
    )
  }
  return false
}

/**
 * Execute a single action against the API.
 */
async function executeAction(action: OfflineAction): Promise<void> {
  switch (action.type) {
    case 'updateCompensation':
      await api.updateCompensation(action.payload.compensationId, action.payload.data)
      break

    case 'updateAssignmentCompensation':
      // This requires looking up the compensation ID from the assignment
      // For offline sync, we need the compensation ID to be resolved at action creation time
      // or we need to re-resolve it here. For now, throw an error if not provided.
      throw new Error(
        'updateAssignmentCompensation requires compensation ID resolution - use updateCompensation instead'
      )

    case 'batchUpdateCompensations':
      // Execute batch updates sequentially
      for (const compensationId of action.payload.compensationIds) {
        await api.updateCompensation(compensationId, action.payload.data)
      }
      break

    case 'applyForExchange':
      await api.applyForExchange(action.payload.exchangeId)
      break

    case 'withdrawFromExchange':
      await api.withdrawFromExchange(action.payload.exchangeId)
      break

    case 'addToExchange':
      await api.addToExchange(action.payload.convocationId)
      break

    default: {
      // TypeScript exhaustiveness check
      const _exhaustive: never = action
      throw new Error(`Unknown action type: ${(_exhaustive as OfflineAction).type}`)
    }
  }
}

/**
 * Sync a single action.
 */
async function syncAction(action: OfflineAction): Promise<ActionSyncResult> {
  log.debug('Syncing action:', { id: action.id, type: action.type })

  // Mark as syncing (also increments retry count)
  await markActionSyncing(action.id)

  try {
    await executeAction(action)

    // Success - delete from queue
    await deleteAction(action.id)
    log.info('Action synced successfully:', { id: action.id, type: action.type })

    return { action, success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Check for session expiry
    if (isSessionExpiredError(error)) {
      log.warn('Session expired during action sync:', { id: action.id })
      await markActionFailed(action.id, 'Session expired - please log in again')
      return { action, success: false, error: errorMessage, requiresReauth: true }
    }

    // Check for conflicts (entity deleted/modified)
    if (isConflictError(error)) {
      log.warn('Conflict detected during action sync:', { id: action.id, error: errorMessage })
      await markActionFailed(action.id, `Conflict: ${errorMessage}`)
      return { action, success: false, error: errorMessage }
    }

    // Check if we should retry
    if (action.retryCount < MAX_RETRY_COUNT) {
      log.warn('Action sync failed, will retry:', {
        id: action.id,
        retryCount: action.retryCount,
        error: errorMessage,
      })
      // Leave as 'syncing' status - next sync cycle will retry
      // Actually, reset to pending so it gets picked up again
      await markActionFailed(action.id, errorMessage)
      return { action, success: false, error: errorMessage }
    }

    // Max retries exceeded
    log.error('Action sync failed permanently:', {
      id: action.id,
      retryCount: action.retryCount,
      error: errorMessage,
    })
    await markActionFailed(action.id, `Failed after ${MAX_RETRY_COUNT} attempts: ${errorMessage}`)
    return { action, success: false, error: errorMessage }
  }
}

/**
 * Calculate delay for exponential backoff.
 */
function getRetryDelay(retryCount: number): number {
  return RETRY_DELAY_BASE_MS * Math.pow(2, retryCount)
}

/**
 * Sleep for a specified duration.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Sync all pending actions.
 *
 * Actions are processed sequentially to:
 * 1. Preserve ordering (important for related mutations)
 * 2. Detect session expiry early and stop
 * 3. Avoid overwhelming the API
 *
 * @param queryClient - Optional QueryClient to invalidate queries after sync
 */
export async function syncPendingActions(queryClient?: QueryClient): Promise<SyncResult> {
  const pending = await getPendingActions()

  if (pending.length === 0) {
    log.debug('No pending actions to sync')
    return {
      processed: 0,
      succeeded: 0,
      failed: 0,
      requiresReauth: false,
      results: [],
    }
  }

  log.info('Starting sync of pending actions:', { count: pending.length })

  const results: ActionSyncResult[] = []
  let succeeded = 0
  let failed = 0
  let requiresReauth = false

  // Sort by creation time to preserve ordering
  const sorted = [...pending].sort((a, b) => a.createdAt - b.createdAt)

  for (const action of sorted) {
    // Stop if we hit a session expiry
    if (requiresReauth) {
      log.info('Stopping sync due to session expiry')
      break
    }

    // Add delay between retries for the same action
    if (action.retryCount > 0) {
      const delay = getRetryDelay(action.retryCount - 1)
      log.debug('Waiting before retry:', { delay, retryCount: action.retryCount })
      await sleep(delay)
    }

    const result = await syncAction(action)
    results.push(result)

    if (result.success) {
      succeeded++
    } else {
      failed++
      if (result.requiresReauth) {
        requiresReauth = true
      }
    }
  }

  // Invalidate relevant queries if we had any successful syncs
  if (succeeded > 0 && queryClient) {
    log.debug('Invalidating queries after successful sync')
    // Invalidate all lists since we don't know which specific ones were affected
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.compensations.lists() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments.lists() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.exchanges.lists() }),
    ])
  }

  log.info('Sync completed:', { processed: results.length, succeeded, failed, requiresReauth })

  return {
    processed: results.length,
    succeeded,
    failed,
    requiresReauth,
    results,
  }
}

/**
 * Check if there are any pending actions that need syncing.
 */
export async function hasPendingActions(): Promise<boolean> {
  const pending = await getPendingActions()
  return pending.length > 0
}
