/**
 * Offline services module.
 *
 * Provides IndexedDB-based storage for:
 * - TanStack Query cache persistence
 * - Offline data viewing
 * - Offline mutation queue
 */

// Only export what's currently used.
// Additional utilities (closeDB, clearAllData, getStorageSize, getPersistedCacheSize)
// are available in the submodules for future features.
export { getMetadata, setMetadata } from './indexed-db'

export { persistOptions, clearPersistedCache } from './query-persister'

// Action queue for offline mutations
export type { OfflineAction, ActionType, ActionPayload, ActionStatus } from './action-types'
export { MAX_RETRY_COUNT } from './action-types'
export { createAction, getPendingActions, deleteAction, clearAllActions } from './action-store'
export { syncPendingActions, type SyncResult } from './action-sync'
