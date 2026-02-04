/**
 * Action store service for offline mutation queue.
 *
 * Provides CRUD operations for managing offline actions in AsyncStorage.
 * Actions are stored with status tracking and can be queried by status.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'

import type { OfflineAction, ActionType, ActionPayload, ActionStatus } from './action-types'

/** AsyncStorage key for the action queue */
const STORAGE_KEY = '@volleykit/action-queue'

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
 * Get all actions from storage.
 */
async function getAllActions(): Promise<OfflineAction[]> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY)
    if (!json) return []
    return JSON.parse(json) as OfflineAction[]
  } catch (error) {
    console.error('[action-store] Failed to get actions:', error)
    return []
  }
}

/**
 * Save all actions to storage.
 */
async function saveAllActions(actions: OfflineAction[]): Promise<boolean> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(actions))
    return true
  } catch (error) {
    console.error('[action-store] Failed to save actions:', error)
    return false
  }
}

/**
 * Create a new action and add it to the queue.
 *
 * @param type - The action type
 * @param payload - The action payload (type-specific data)
 * @returns The created action, or null if storage unavailable
 */
export async function createAction<T extends ActionType>(
  type: T,
  payload: ActionPayload<T>
): Promise<OfflineAction | null> {
  const action: OfflineAction = {
    id: generateActionId(),
    type,
    payload,
    createdAt: Date.now(),
    status: 'pending',
    retryCount: 0,
  } as OfflineAction

  try {
    const actions = await getAllActions()
    actions.push(action)
    await saveAllActions(actions)
    console.debug('[action-store] Created action:', { id: action.id, type })
    return action
  } catch (error) {
    console.error('[action-store] Failed to create action:', error)
    return null
  }
}

/**
 * Get actions by status.
 */
export async function getActionsByStatus(status: ActionStatus): Promise<OfflineAction[]> {
  const actions = await getAllActions()
  return actions.filter((a) => a.status === status)
}

/**
 * Get all pending actions (not yet synced).
 */
export async function getPendingActions(): Promise<OfflineAction[]> {
  return getActionsByStatus('pending')
}

/**
 * Get a single action by ID.
 */
export async function getAction(id: string): Promise<OfflineAction | null> {
  const actions = await getAllActions()
  return actions.find((a) => a.id === id) ?? null
}

/**
 * Update an action's status.
 */
export async function updateActionStatus(
  id: string,
  status: ActionStatus,
  error?: string
): Promise<boolean> {
  try {
    const actions = await getAllActions()
    const index = actions.findIndex((a) => a.id === id)

    if (index === -1) {
      console.warn('[action-store] Action not found for status update:', id)
      return false
    }

    const action = actions[index]
    actions[index] = {
      ...action,
      status,
      error: error ?? action.error,
      retryCount: status === 'syncing' ? action.retryCount + 1 : action.retryCount,
    }

    await saveAllActions(actions)
    console.debug('[action-store] Updated action status:', { id, status })
    return true
  } catch (error) {
    console.error('[action-store] Failed to update action status:', error)
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
  try {
    const actions = await getAllActions()
    const filtered = actions.filter((a) => a.id !== id)
    await saveAllActions(filtered)
    console.debug('[action-store] Deleted action:', id)
    return true
  } catch (error) {
    console.error('[action-store] Failed to delete action:', error)
    return false
  }
}

/**
 * Clear all actions from the queue.
 * Use with caution - typically only for logout or testing.
 */
export async function clearAllActions(): Promise<boolean> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY)
    console.info('[action-store] Cleared all actions from queue')
    return true
  } catch (error) {
    console.error('[action-store] Failed to clear action queue:', error)
    return false
  }
}
