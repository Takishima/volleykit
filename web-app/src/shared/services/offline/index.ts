/**
 * Offline services module.
 *
 * Provides IndexedDB-based storage for:
 * - TanStack Query cache persistence
 * - Offline data viewing
 * - Future: offline mutation queue
 */

// Only export what's currently used.
// Additional utilities (closeDB, clearAllData, getStorageSize, getPersistedCacheSize)
// are available in the submodules for future features.
export { getMetadata, setMetadata } from './indexed-db'

export { persistOptions, clearPersistedCache } from './query-persister'
