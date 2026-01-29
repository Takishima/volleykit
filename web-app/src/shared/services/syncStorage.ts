/**
 * Sync Queue Storage - IndexedDB adapter for Web.
 *
 * Persists the offline sync queue to IndexedDB for persistence
 * across page refreshes and browser restarts.
 */

import type { SyncQueueItem, SyncStorageAdapter } from '@volleykit/shared'

/** Database name */
const DB_NAME = 'volleykit-sync'

/** Object store name */
const STORE_NAME = 'queue'

/** Database version */
const DB_VERSION = 1

/**
 * Open the IndexedDB database.
 *
 * @returns A promise that resolves to the database instance
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      reject(new Error(`Failed to open sync database: ${request.error?.message}`))
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // Create the queue object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
  })
}

/**
 * Web sync storage adapter using IndexedDB.
 *
 * Implements the SyncStorageAdapter interface for web browsers,
 * persisting the sync queue to IndexedDB.
 */
export const webSyncStorage: SyncStorageAdapter = {
  /**
   * Load the sync queue from IndexedDB.
   *
   * @returns The stored queue items, or empty array if none exist
   */
  async load(): Promise<SyncQueueItem[]> {
    try {
      const db = await openDB()

      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly')
        const store = tx.objectStore(STORE_NAME)
        const request = store.getAll()

        request.onerror = () => {
          reject(new Error(`Failed to load sync queue: ${request.error?.message}`))
        }

        request.onsuccess = () => {
          resolve((request.result as SyncQueueItem[]) ?? [])
        }

        tx.oncomplete = () => {
          db.close()
        }
      })
    } catch (error) {
      console.warn('Failed to load sync queue from storage:', error)
      return []
    }
  },

  /**
   * Save the sync queue to IndexedDB.
   *
   * This clears the existing queue and saves all items atomically.
   *
   * @param items - The queue items to save
   */
  async save(items: SyncQueueItem[]): Promise<void> {
    try {
      const db = await openDB()

      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        const store = tx.objectStore(STORE_NAME)

        // Clear existing items and add new ones
        store.clear()
        for (const item of items) {
          store.add(item)
        }

        tx.onerror = () => {
          reject(new Error(`Failed to save sync queue: ${tx.error?.message}`))
        }

        tx.oncomplete = () => {
          db.close()
          resolve()
        }
      })
    } catch (error) {
      console.error('Failed to save sync queue to storage:', error)
    }
  },

  /**
   * Clear the sync queue from IndexedDB.
   */
  async clear(): Promise<void> {
    try {
      const db = await openDB()

      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        const store = tx.objectStore(STORE_NAME)
        const request = store.clear()

        request.onerror = () => {
          reject(new Error(`Failed to clear sync queue: ${request.error?.message}`))
        }

        tx.oncomplete = () => {
          db.close()
          resolve()
        }
      })
    } catch (error) {
      console.warn('Failed to clear sync queue from storage:', error)
    }
  },
}

/**
 * Delete the sync queue database entirely.
 *
 * Use this for complete cleanup (e.g., on logout).
 */
export async function deleteSyncDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME)

    request.onerror = () => {
      reject(new Error(`Failed to delete sync database: ${request.error?.message}`))
    }

    request.onsuccess = () => {
      resolve()
    }
  })
}
