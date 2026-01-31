/**
 * TanStack Query persistence adapter using IndexedDB.
 *
 * Persists query cache to IndexedDB for offline viewing.
 * Falls back gracefully if IndexedDB is unavailable.
 */

import { MS_PER_DAY } from '@/shared/utils/constants'
import { logger } from '@/shared/utils/logger'

import { getDB, STORES, isIndexedDBSupported } from './indexed-db'


import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client'

/** Storage key for persisted query cache */
const PERSISTED_CACHE_KEY = 'persisted-client'

/** Current cache version - increment to invalidate old caches */
const CACHE_VERSION = 1

/** Max cache age: 7 days */
const CACHE_DAYS = 7
const MAX_AGE_MS = CACHE_DAYS * MS_PER_DAY

/** Throttle persistence to avoid excessive writes */
const PERSIST_THROTTLE_MS = 2000

/** Last persist timestamp for throttling */
let lastPersistTime = 0

/** Pending persist data (for throttling) */
let pendingPersist: PersistedClient | null = null

/** Timeout ID for throttled persist */
let persistTimeoutId: ReturnType<typeof setTimeout> | null = null

/**
 * IndexedDB persister for TanStack Query.
 *
 * Features:
 * - Automatic cache invalidation after MAX_AGE_MS
 * - Throttled writes to reduce IndexedDB overhead
 * - Graceful fallback when IndexedDB unavailable
 * - Version-based cache invalidation for schema changes
 */
export const indexedDBPersister: Persister = {
  /**
   * Persist client to IndexedDB.
   * Throttled to avoid excessive writes during rapid updates.
   */
  async persistClient(client: PersistedClient): Promise<void> {
    if (!isIndexedDBSupported()) return

    // Throttle persistence
    const now = Date.now()
    const timeSinceLastPersist = now - lastPersistTime

    if (timeSinceLastPersist < PERSIST_THROTTLE_MS) {
      // Store pending data and schedule delayed persist
      pendingPersist = client

      if (!persistTimeoutId) {
        persistTimeoutId = setTimeout(async () => {
          persistTimeoutId = null
          if (pendingPersist) {
            await doPersist(pendingPersist)
            pendingPersist = null
          }
        }, PERSIST_THROTTLE_MS - timeSinceLastPersist)
      }
      return
    }

    await doPersist(client)
  },

  /**
   * Restore client from IndexedDB.
   */
  async restoreClient(): Promise<PersistedClient | undefined> {
    if (!isIndexedDBSupported()) return undefined

    try {
      const db = await getDB()
      if (!db) return undefined

      const record = await db.get(STORES.QUERY_CACHE, PERSISTED_CACHE_KEY)
      if (!record) return undefined

      // Check cache version
      if (record.version !== CACHE_VERSION) {
        logger.info('Query cache version mismatch, clearing stale cache')
        await db.delete(STORES.QUERY_CACHE, PERSISTED_CACHE_KEY)
        return undefined
      }

      // Check if cache is too old
      if (Date.now() - record.timestamp > MAX_AGE_MS) {
        logger.info('Query cache expired, clearing stale cache')
        await db.delete(STORES.QUERY_CACHE, PERSISTED_CACHE_KEY)
        return undefined
      }

      const client = JSON.parse(record.data) as PersistedClient
      logger.info('Restored query cache from IndexedDB')
      return client
    } catch (error) {
      logger.warn('Failed to restore query cache:', error)
      return undefined
    }
  },

  /**
   * Remove persisted client.
   */
  async removeClient(): Promise<void> {
    if (!isIndexedDBSupported()) return

    // Cancel any pending persist
    if (persistTimeoutId) {
      clearTimeout(persistTimeoutId)
      persistTimeoutId = null
    }
    pendingPersist = null

    try {
      const db = await getDB()
      if (!db) return

      await db.delete(STORES.QUERY_CACHE, PERSISTED_CACHE_KEY)
      logger.info('Query cache cleared from IndexedDB')
    } catch (error) {
      logger.warn('Failed to remove query cache:', error)
    }
  },
}

/**
 * Actually persist the client to IndexedDB.
 */
async function doPersist(client: PersistedClient): Promise<void> {
  try {
    const db = await getDB()
    if (!db) return

    const serialized = JSON.stringify(client)

    await db.put(STORES.QUERY_CACHE, {
      data: serialized,
      timestamp: Date.now(),
      version: CACHE_VERSION,
    }, PERSISTED_CACHE_KEY)

    lastPersistTime = Date.now()
  } catch (error) {
    logger.warn('Failed to persist query cache:', error)
  }
}

/**
 * Configuration for PersistQueryClientProvider.
 */
export const persistOptions = {
  persister: indexedDBPersister,
  maxAge: MAX_AGE_MS,
  // Only persist successful queries (not loading or error states)
  dehydrateOptions: {
    shouldDehydrateQuery: (query: { state: { status: string } }) => {
      return query.state.status === 'success'
    },
  },
  // Restore cache in background (don't block initial render)
  buster: String(CACHE_VERSION),
}

/**
 * Clear the persisted query cache.
 * Call this on logout to ensure user data is removed.
 */
export async function clearPersistedCache(): Promise<void> {
  await indexedDBPersister.removeClient()
}
