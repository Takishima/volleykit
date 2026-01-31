/**
 * Action store service for offline mutation queue.
 *
 * Provides CRUD operations for managing offline actions in IndexedDB.
 * Actions are stored with status tracking and can be queried by status.
 */

import { createLogger } from '@/shared/utils/logger'

import { getDB, STORES } from './indexed-db'

import type { OfflineAction, ActionType, ActionPayload, ActionStatus } from './action-types'

const log = createLogger('action-store')

/** Base for random string generation (base36 = 0-9 + a-z) */
const RANDOM_STRING_BASE = 36
/** Start index for slicing random string (skip "0.") */
const RANDOM_STRING_START = 2
/** End index for slicing random string (9 chars total) */
const RANDOM_STRING_END = 11

/**
 * Generate a unique ID for an action.
 */
function generateActionId(): string {
  return `${Date.now()}-${Math.random().toString(RANDOM_STRING_BASE).slice(RANDOM_STRING_START, RANDOM_STRING_END)}`
}

/**
 * Create a new action and add it to the queue.
 *
 * @param type - The action type
 * @param payload - The action payload (type-specific data)
 * @returns The created action, or null if IndexedDB is unavailable
 */
export async function createAction<T extends ActionType>(
  type: T,
  payload: ActionPayload<T>
): Promise<OfflineAction | null> {
  const db = await getDB()
  if (!db) {
    log.warn('Cannot create action: IndexedDB unavailable')
    return null
  }

  const action: OfflineAction = {
    id: generateActionId(),
    type,
    payload,
    createdAt: Date.now(),
    status: 'pending',
    retryCount: 0,
  } as OfflineAction

  try {
    await db.add(STORES.ACTION_QUEUE, action)
    log.debug('Created action:', { id: action.id, type })
    return action
  } catch (error) {
    log.error('Failed to create action:', error)
    return null
  }
}

/**
 * Get actions by status.
 */
export async function getActionsByStatus(status: ActionStatus): Promise<OfflineAction[]> {
  const db = await getDB()
  if (!db) return []

  try {
    return await db.getAllFromIndex(STORES.ACTION_QUEUE, 'by-status', status)
  } catch (error) {
    log.error('Failed to get actions by status:', error)
    return []
  }
}

/**
 * Get all pending actions (not yet synced).
 */
export async function getPendingActions(): Promise<OfflineAction[]> {
  return getActionsByStatus('pending')
}

/**
 * Update an action's status.
 */
export async function updateActionStatus(
  id: string,
  status: ActionStatus,
  error?: string
): Promise<boolean> {
  const db = await getDB()
  if (!db) return false

  try {
    const action = await db.get(STORES.ACTION_QUEUE, id)
    if (!action) {
      log.warn('Action not found for status update:', id)
      return false
    }

    const updated: OfflineAction = {
      ...action,
      status,
      error: error ?? action.error,
      retryCount: status === 'syncing' ? action.retryCount + 1 : action.retryCount,
    }

    await db.put(STORES.ACTION_QUEUE, updated)
    log.debug('Updated action status:', { id, status })
    return true
  } catch (error) {
    log.error('Failed to update action status:', error)
    return false
  }
}

/**
 * Mark an action as syncing (in progress).
 */
export async function markActionSyncing(id: string): Promise<boolean> {
  return updateActionStatus(id, 'syncing')
}

/**
 * Mark an action as failed with an error message.
 */
export async function markActionFailed(id: string, error: string): Promise<boolean> {
  return updateActionStatus(id, 'failed', error)
}

/**
 * Reset a failed action back to pending for retry.
 */
export async function resetActionForRetry(id: string): Promise<boolean> {
  return updateActionStatus(id, 'pending')
}

/**
 * Delete an action from the queue.
 * Called after successful sync or when user dismisses a failed action.
 */
export async function deleteAction(id: string): Promise<boolean> {
  const db = await getDB()
  if (!db) return false

  try {
    await db.delete(STORES.ACTION_QUEUE, id)
    log.debug('Deleted action:', id)
    return true
  } catch (error) {
    log.error('Failed to delete action:', error)
    return false
  }
}

/**
 * Clear all actions from the queue.
 * Use with caution - typically only for logout or testing.
 */
export async function clearAllActions(): Promise<boolean> {
  const db = await getDB()
  if (!db) return false

  try {
    await db.clear(STORES.ACTION_QUEUE)
    log.info('Cleared all actions from queue')
    return true
  } catch (error) {
    log.error('Failed to clear action queue:', error)
    return false
  }
}
