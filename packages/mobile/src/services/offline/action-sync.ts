/**
 * Action sync service for processing offline mutation queue.
 *
 * Handles:
 * - Processing pending actions when connectivity is restored
 * - Retry logic with exponential backoff
 * - Conflict detection and error handling
 * - Session expiry detection
 */

import {
  getPendingActions,
  markActionSyncing,
  markActionFailed,
  deleteAction,
} from './action-store'
import { MAX_RETRY_COUNT, RETRY_DELAY_BASE_MS } from './action-types'
import { realApiClient } from '../../api/realClient'

import type { OfflineAction } from './action-types'

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
      await realApiClient.updateCompensation(action.payload.compensationId, action.payload.data)
      break

    case 'applyForExchange':
      await realApiClient.applyForExchange(action.payload.exchangeId)
      break

    case 'addToExchange':
      await realApiClient.addToExchange(action.payload.convocationId)
      break

    case 'removeOwnExchange':
      await realApiClient.removeOwnExchange(action.payload.convocationId)
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
  console.debug('[action-sync] Syncing action:', { id: action.id, type: action.type })

  // Mark as syncing (also increments retry count)
  await markActionSyncing(action.id)

  try {
    await executeAction(action)

    // Success - delete from queue
    await deleteAction(action.id)
    console.info('[action-sync] Action synced successfully:', { id: action.id, type: action.type })

    return { action, success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Check for session expiry
    if (isSessionExpiredError(error)) {
      console.warn('[action-sync] Session expired during action sync:', { id: action.id })
      await markActionFailed(action.id, 'Session expired - please log in again')
      return { action, success: false, error: errorMessage, requiresReauth: true }
    }

    // Check for conflicts (entity deleted/modified)
    if (isConflictError(error)) {
      console.warn('[action-sync] Conflict detected during action sync:', {
        id: action.id,
        error: errorMessage,
      })
      await markActionFailed(action.id, `Conflict: ${errorMessage}`)
      return { action, success: false, error: errorMessage }
    }

    // Check if we should retry
    if (action.retryCount < MAX_RETRY_COUNT) {
      console.warn('[action-sync] Action sync failed, will retry:', {
        id: action.id,
        retryCount: action.retryCount,
        error: errorMessage,
      })
      await markActionFailed(action.id, errorMessage)
      return { action, success: false, error: errorMessage }
    }

    // Max retries exceeded
    console.error('[action-sync] Action sync failed permanently:', {
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
 * Sleep for a specified duration with optional abort support.
 *
 * Note: In React Native, timers pause when the app is backgrounded and resume
 * when foregrounded. This is acceptable for retry delays since the sync will
 * complete when the user returns to the app.
 *
 * @param ms - Duration in milliseconds
 * @param signal - Optional AbortSignal for cancellation
 */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }

    const timeoutId = setTimeout(resolve, ms)

    signal?.addEventListener('abort', () => {
      clearTimeout(timeoutId)
      reject(new DOMException('Aborted', 'AbortError'))
    })
  })
}

/**
 * Sync all pending actions.
 *
 * Actions are processed sequentially to:
 * 1. Preserve ordering (important for related mutations)
 * 2. Detect session expiry early and stop
 * 3. Avoid overwhelming the API
 */
export async function syncPendingActions(): Promise<SyncResult> {
  const pending = await getPendingActions()

  if (pending.length === 0) {
    console.debug('[action-sync] No pending actions to sync')
    return {
      processed: 0,
      succeeded: 0,
      failed: 0,
      requiresReauth: false,
      results: [],
    }
  }

  console.info('[action-sync] Starting sync of pending actions:', { count: pending.length })

  const results: ActionSyncResult[] = []
  let succeeded = 0
  let failed = 0
  let requiresReauth = false

  // Sort by creation time to preserve ordering
  const sorted = [...pending].sort((a, b) => a.createdAt - b.createdAt)

  for (const action of sorted) {
    // Stop if we hit a session expiry
    if (requiresReauth) {
      console.info('[action-sync] Stopping sync due to session expiry')
      break
    }

    // Add delay between retries for the same action
    if (action.retryCount > 0) {
      const delay = getRetryDelay(action.retryCount - 1)
      console.debug('[action-sync] Waiting before retry:', { delay, retryCount: action.retryCount })
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

  console.info('[action-sync] Sync completed:', {
    processed: results.length,
    succeeded,
    failed,
    requiresReauth,
  })

  return {
    processed: results.length,
    succeeded,
    failed,
    requiresReauth,
    results,
  }
}
