/**
 * Zustand store for offline action queue state.
 *
 * Provides reactive state for:
 * - Pending action count (for badge display)
 * - Failed actions (for user notification)
 * - Sync status
 */

import { create } from 'zustand'

import {
  getPendingActions,
  getActionsByStatus,
  deleteAction,
  resetActionForRetry,
  clearAllActions,
} from './action-store'
import { syncPendingActions, type SyncResult } from './action-sync'

import type { OfflineAction } from './action-types'

interface ActionQueueState {
  /** Number of pending actions */
  pendingCount: number
  /** Failed actions that need user attention */
  failedActions: OfflineAction[]
  /** Whether a sync is in progress */
  isSyncing: boolean
  /** Whether reauth is required (session expired) */
  requiresReauth: boolean
  /** Last sync result */
  lastSyncResult: SyncResult | null
  /** Refresh state from AsyncStorage */
  refresh: () => Promise<void>
  /** Trigger sync of pending actions */
  sync: () => Promise<SyncResult | null>
  /** Retry a failed action */
  retryAction: (id: string) => Promise<void>
  /** Dismiss (delete) a failed action */
  dismissAction: (id: string) => Promise<void>
  /** Clear all actions (for logout) */
  clearAll: () => Promise<void>
}

export const useActionQueueStore = create<ActionQueueState>((set, get) => ({
  pendingCount: 0,
  failedActions: [],
  isSyncing: false,
  requiresReauth: false,
  lastSyncResult: null,

  refresh: async () => {
    const [pending, failed] = await Promise.all([getPendingActions(), getActionsByStatus('failed')])

    set({
      pendingCount: pending.length,
      failedActions: failed,
    })
  },

  sync: async () => {
    const { isSyncing } = get()
    if (isSyncing) {
      console.debug('[action-queue-store] Sync already in progress')
      return null
    }

    set({ isSyncing: true })

    try {
      const result = await syncPendingActions()

      set({
        lastSyncResult: result,
        requiresReauth: result.requiresReauth,
      })

      // Refresh state after sync
      await get().refresh()

      return result
    } catch (error) {
      console.error('[action-queue-store] Sync failed:', error)
      return null
    } finally {
      set({ isSyncing: false })
    }
  },

  retryAction: async (id: string) => {
    await resetActionForRetry(id)
    await get().refresh()
    // Trigger sync to retry immediately
    await get().sync()
  },

  dismissAction: async (id: string) => {
    await deleteAction(id)
    await get().refresh()
  },

  clearAll: async () => {
    await clearAllActions()
    set({
      pendingCount: 0,
      failedActions: [],
      lastSyncResult: null,
      requiresReauth: false,
    })
  },
}))

/**
 * Initialize the action queue store by loading state from AsyncStorage.
 * Should be called once when the app starts.
 */
export async function initializeActionQueueStore(): Promise<void> {
  await useActionQueueStore.getState().refresh()
}
