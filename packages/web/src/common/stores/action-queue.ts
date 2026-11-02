/**
 * Zustand store for offline action queue state.
 *
 * Provides reactive state for the pending action count (badge display)
 * and the sync-in-progress flag.
 */

import { create } from 'zustand'

import { getPendingActions } from '@/common/services/offline/action-store'
import { syncPendingActions, type SyncResult } from '@/common/services/offline/action-sync'
import { createLogger } from '@/common/utils/logger'

const log = createLogger('action-queue-store')

interface ActionQueueState {
  /** Number of pending actions */
  pendingCount: number
  /** Whether a sync is in progress */
  isSyncing: boolean
  /** Refresh state from IndexedDB */
  refresh: () => Promise<void>
  /** Trigger sync of pending actions */
  sync: () => Promise<SyncResult | null>
}

export const useActionQueueStore = create<ActionQueueState>((set, get) => ({
  pendingCount: 0,
  isSyncing: false,

  refresh: async () => {
    const pending = await getPendingActions()
    set({ pendingCount: pending.length })
  },

  sync: async () => {
    const { isSyncing } = get()
    if (isSyncing) {
      log.debug('Sync already in progress')
      return null
    }

    set({ isSyncing: true })

    try {
      const result = await syncPendingActions()
      await get().refresh()
      return result
    } catch (error) {
      log.error('Sync failed:', error)
      return null
    } finally {
      set({ isSyncing: false })
    }
  },
}))
