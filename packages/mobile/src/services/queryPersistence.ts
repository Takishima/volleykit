/**
 * TanStack Query persistence adapter for offline support.
 *
 * Persists query cache to AsyncStorage for offline viewing.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'

import type { PersistedClient } from '@tanstack/react-query-persist-client'

/** Storage key for persisted query cache */
const PERSISTED_CACHE_KEY = 'REACT_QUERY_CACHE'

/** Default garbage collection time (30 days) */
const DEFAULT_GC_TIME = 30 * 24 * 60 * 60 * 1000

/** Max cache age (30 days) */
const MAX_AGE = 30 * 24 * 60 * 60 * 1000

/**
 * AsyncStorage persister for TanStack Query.
 */
export const asyncStoragePersister = {
  /**
   * Persist client to AsyncStorage.
   */
  async persistClient(client: PersistedClient): Promise<void> {
    try {
      const serialized = JSON.stringify(client)
      await AsyncStorage.setItem(PERSISTED_CACHE_KEY, serialized)
    } catch (error) {
      console.warn('Failed to persist query cache:', error)
    }
  },

  /**
   * Restore client from AsyncStorage.
   */
  async restoreClient(): Promise<PersistedClient | undefined> {
    try {
      const data = await AsyncStorage.getItem(PERSISTED_CACHE_KEY)
      if (!data) return undefined

      const client = JSON.parse(data) as PersistedClient

      // Check if cache is too old
      if (Date.now() - client.timestamp > MAX_AGE) {
        await AsyncStorage.removeItem(PERSISTED_CACHE_KEY)
        return undefined
      }

      return client
    } catch (error) {
      console.warn('Failed to restore query cache:', error)
      return undefined
    }
  },

  /**
   * Remove persisted client.
   */
  async removeClient(): Promise<void> {
    try {
      await AsyncStorage.removeItem(PERSISTED_CACHE_KEY)
    } catch (error) {
      console.warn('Failed to remove persisted cache:', error)
    }
  },
}

/**
 * Default query client options for offline support.
 */
export const offlineQueryClientOptions = {
  defaultOptions: {
    queries: {
      // Cache stays fresh for 5 minutes
      staleTime: 5 * 60 * 1000,
      // Keep in cache for 30 days for offline viewing
      gcTime: DEFAULT_GC_TIME,
      // Retry up to 3 times for network errors
      retry: 3,
      retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Show stale data while revalidating
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      // Retry mutations on network error
      retry: 2,
    },
  },
}

/**
 * Persist options for react-query-persist-client.
 */
export const persistOptions = {
  persister: asyncStoragePersister,
  maxAge: MAX_AGE,
  // Don't persist errored queries
  dehydrateOptions: {
    shouldDehydrateQuery: (query: { state: { status: string } }) => {
      return query.state.status !== 'error'
    },
  },
}

/**
 * Clear the persisted query cache.
 */
export async function clearPersistedCache(): Promise<void> {
  await asyncStoragePersister.removeClient()
}

/**
 * Get persisted cache size in bytes.
 */
export async function getPersistedCacheSize(): Promise<number> {
  try {
    const data = await AsyncStorage.getItem(PERSISTED_CACHE_KEY)
    if (!data) return 0
    return new Blob([data]).size
  } catch {
    return 0
  }
}
