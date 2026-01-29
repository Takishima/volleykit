/**
 * Sync Queue Store - Platform-agnostic sync state management.
 *
 * This store manages the sync queue state for offline mutations.
 * It works with the SyncEngine to track pending operations and
 * sync results.
 */

import { create } from 'zustand'
import type { SyncQueueItem, SyncResult, SyncQueueState } from '../sync/types'

/**
 * Sync store interface with state and actions.
 */
export interface SyncStore extends SyncQueueState {
  // === Actions ===

  /** Add an item to the queue */
  addItem: (item: SyncQueueItem) => void
  /** Remove an item from the queue by ID */
  removeItem: (id: string) => void
  /** Set the entire queue (used by sync engine) */
  setItems: (items: SyncQueueItem[]) => void
  /** Update syncing state */
  setSyncing: (isSyncing: boolean) => void
  /** Set the results from the last sync */
  setLastSyncResults: (results: SyncResult[]) => void
  /** Clear the last sync results (dismisses UI) */
  clearResults: () => void
  /** Reset to initial state */
  reset: () => void

  // === Derived getters ===

  /** Get count of pending items */
  getPendingCount: () => number
  /** Check if an entity has a pending operation */
  hasPendingOperation: (entityId: string) => boolean
  /** Get pending items for a specific entity */
  getPendingForEntity: (entityId: string) => SyncQueueItem[]
  /** Check if there are any conflicts in the last sync */
  hasConflicts: () => boolean
  /** Get conflicts from the last sync */
  getConflicts: () => SyncResult[]
  /** Get successes from the last sync */
  getSuccesses: () => SyncResult[]
}

/**
 * Initial sync state.
 */
const initialState: SyncQueueState = {
  items: [],
  isSyncing: false,
  lastSyncAt: null,
  lastSyncResults: [],
}

/**
 * Sync queue store.
 *
 * Platform-agnostic store for managing offline sync queue state.
 * The SyncEngine calls these methods to update state as operations
 * are queued and synced.
 */
export const useSyncStore = create<SyncStore>((set, get) => ({
  ...initialState,

  addItem: (item) =>
    set((state) => ({
      items: [...state.items, item],
    })),

  removeItem: (id) =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    })),

  setItems: (items) => set({ items }),

  setSyncing: (isSyncing) => set({ isSyncing }),

  setLastSyncResults: (results) =>
    set({
      lastSyncResults: results,
      lastSyncAt: Date.now(),
    }),

  clearResults: () => set({ lastSyncResults: [] }),

  reset: () => set(initialState),

  getPendingCount: () => {
    const { items } = get()
    return items.filter((item) => item.status === 'pending').length
  },

  hasPendingOperation: (entityId) => {
    const { items } = get()
    return items.some(
      (item) => item.entityId === entityId && item.status === 'pending'
    )
  },

  getPendingForEntity: (entityId) => {
    const { items } = get()
    return items.filter(
      (item) => item.entityId === entityId && item.status === 'pending'
    )
  },

  hasConflicts: () => {
    const { lastSyncResults } = get()
    return lastSyncResults.some((result) => result.status === 'conflict')
  },

  getConflicts: () => {
    const { lastSyncResults } = get()
    return lastSyncResults.filter((result) => result.status === 'conflict')
  },

  getSuccesses: () => {
    const { lastSyncResults } = get()
    return lastSyncResults.filter((result) => result.status === 'success')
  },
}))
