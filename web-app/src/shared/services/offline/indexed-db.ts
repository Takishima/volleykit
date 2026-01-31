/**
 * IndexedDB service for offline data storage.
 *
 * Provides structured storage for:
 * - TanStack Query cache persistence
 * - Offline mutation queue (future)
 * - Large datasets that exceed localStorage limits
 *
 * Uses the `idb` library for a clean Promise-based API.
 */

import { openDB, type IDBPDatabase, type DBSchema } from 'idb'

import { logger } from '@/shared/utils/logger'

import type { OfflineAction } from './action-types'

/** Current database version - increment when schema changes */
const DB_VERSION = 2

/** Database name */
const DB_NAME = 'volleykit-offline'

/** Store names */
export const STORES = {
  /** TanStack Query persisted cache */
  QUERY_CACHE: 'query-cache',
  /** Metadata like last sync time, cache version */
  METADATA: 'metadata',
  /** Offline action queue for mutations */
  ACTION_QUEUE: 'action-queue',
} as const

/** Schema definition for type safety */
interface VolleyKitDB extends DBSchema {
  [STORES.QUERY_CACHE]: {
    key: string
    value: {
      /** The persisted query client data */
      data: string
      /** Timestamp when cached */
      timestamp: number
      /** Version for migrations */
      version: number
    }
  }
  [STORES.METADATA]: {
    key: string
    value: {
      /** Metadata key */
      key: string
      /** Metadata value */
      value: unknown
      /** Last updated timestamp */
      updatedAt: number
    }
  }
  [STORES.ACTION_QUEUE]: {
    key: string
    value: OfflineAction
    indexes: {
      'by-status': string
      'by-created': number
    }
  }
}

/** Singleton database connection */
let dbInstance: IDBPDatabase<VolleyKitDB> | null = null

/** Whether IndexedDB is supported in this browser */
let isSupported: boolean | null = null

/**
 * Check if IndexedDB is available in this environment.
 * Handles private browsing modes where IndexedDB may be restricted.
 */
export function isIndexedDBSupported(): boolean {
  if (isSupported !== null) return isSupported

  try {
    // Check for IndexedDB availability
    if (!('indexedDB' in globalThis)) {
      isSupported = false
      return false
    }

    // Some browsers (Safari private mode) have indexedDB but it throws on open
    // We'll verify this when actually opening the database
    isSupported = true
    return true
  } catch {
    isSupported = false
    return false
  }
}

/**
 * Open or get the database connection.
 * Creates the database and object stores if they don't exist.
 */
export async function getDB(): Promise<IDBPDatabase<VolleyKitDB> | null> {
  if (!isIndexedDBSupported()) {
    logger.warn('IndexedDB is not supported in this browser')
    return null
  }

  if (dbInstance) return dbInstance

  try {
    dbInstance = await openDB<VolleyKitDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion) {
        logger.info(`Upgrading IndexedDB from v${oldVersion} to v${newVersion}`)

        // Create stores if they don't exist
        if (!db.objectStoreNames.contains(STORES.QUERY_CACHE)) {
          db.createObjectStore(STORES.QUERY_CACHE)
        }
        if (!db.objectStoreNames.contains(STORES.METADATA)) {
          db.createObjectStore(STORES.METADATA, { keyPath: 'key' })
        }

        // v2: Add action queue store
        if (!db.objectStoreNames.contains(STORES.ACTION_QUEUE)) {
          const actionStore = db.createObjectStore(STORES.ACTION_QUEUE, { keyPath: 'id' })
          actionStore.createIndex('by-status', 'status')
          actionStore.createIndex('by-created', 'createdAt')
        }
      },
      blocked() {
        logger.warn('IndexedDB upgrade blocked - close other tabs')
      },
      blocking() {
        // Close connection when a newer version is trying to upgrade
        dbInstance?.close()
        dbInstance = null
      },
      terminated() {
        // Connection was unexpectedly terminated
        dbInstance = null
      },
    })

    return dbInstance
  } catch (error) {
    // Handle private browsing mode or other restrictions
    logger.warn('Failed to open IndexedDB:', error)
    isSupported = false
    return null
  }
}

/**
 * Get metadata value.
 */
export async function getMetadata<T>(key: string): Promise<T | undefined> {
  const db = await getDB()
  if (!db) return undefined

  try {
    const record = await db.get(STORES.METADATA, key)
    return record?.value as T | undefined
  } catch (error) {
    logger.warn(`Failed to get metadata '${key}':`, error)
    return undefined
  }
}

/**
 * Set metadata value.
 */
export async function setMetadata<T>(key: string, value: T): Promise<void> {
  const db = await getDB()
  if (!db) return

  try {
    await db.put(STORES.METADATA, {
      key,
      value,
      updatedAt: Date.now(),
    })
  } catch (error) {
    logger.warn(`Failed to set metadata '${key}':`, error)
  }
}
