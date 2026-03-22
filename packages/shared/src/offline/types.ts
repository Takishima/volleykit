/**
 * Shared offline sync types and interfaces.
 *
 * Platform-agnostic contracts that web (IndexedDB) and mobile (AsyncStorage)
 * implement with their respective storage backends.
 */

import type { OfflineAction, ActionStatus } from './action-types'

// Re-export for convenience
export type { OfflineAction, ActionStatus }

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
 * Platform-agnostic interface for offline action storage.
 *
 * Web implements with IndexedDB, mobile with AsyncStorage.
 */
export interface OfflineActionStore {
  /** Add a new action to the queue */
  addAction(action: OfflineAction): Promise<void>
  /** Get a single action by ID */
  getActionById(id: string): Promise<OfflineAction | undefined>
  /** Get all actions with a given status */
  getActionsByStatus(status: ActionStatus): Promise<OfflineAction[]>
  /** Update an action's status and optional error message */
  updateActionStatus(
    id: string,
    status: ActionStatus,
    error?: string
  ): Promise<void>
  /** Delete a completed/abandoned action */
  deleteAction(id: string): Promise<void>
  /** Clear all actions from the queue */
  clearAllActions(): Promise<void>
}

/**
 * Platform-agnostic interface for executing actions against the API.
 *
 * Each platform provides its own implementation with the appropriate API client.
 */
export interface ActionExecutor {
  /** Execute a single offline action against the API */
  execute(action: OfflineAction): Promise<void>
}
