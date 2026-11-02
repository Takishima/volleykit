/**
 * Offline services module.
 *
 * Provides IndexedDB-based storage for TanStack Query cache persistence and
 * the offline mutation queue. Only what the app shell needs is exported here;
 * feature code imports the submodules directly.
 */

export { persistOptions, clearPersistedCache } from './query-persister'

// Service worker runtime caches (purged on logout)
export { clearApiResponseCaches } from './sw-cache'

export { clearAllActions } from './action-store'
