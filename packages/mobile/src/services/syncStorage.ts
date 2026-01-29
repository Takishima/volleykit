/**
 * Sync Queue Storage - AsyncStorage adapter for React Native.
 *
 * Persists the offline sync queue to AsyncStorage for persistence
 * across app restarts.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import type { SyncQueueItem, SyncStorageAdapter } from '@volleykit/shared'

/** Storage key for the sync queue */
const STORAGE_KEY = 'volleykit-sync-queue'

/**
 * Mobile sync storage adapter using AsyncStorage.
 *
 * Implements the SyncStorageAdapter interface for React Native,
 * persisting the sync queue to AsyncStorage.
 */
export const mobileSyncStorage: SyncStorageAdapter = {
  /**
   * Load the sync queue from AsyncStorage.
   *
   * @returns The stored queue items, or empty array if none exist
   */
  async load(): Promise<SyncQueueItem[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY)
      if (!data) return []

      const parsed = JSON.parse(data)

      // Validate the parsed data is an array
      if (!Array.isArray(parsed)) {
        console.warn('Sync queue data is not an array, resetting')
        await AsyncStorage.removeItem(STORAGE_KEY)
        return []
      }

      return parsed as SyncQueueItem[]
    } catch (error) {
      // If parsing fails (corrupt data), reset the queue
      console.warn('Failed to load sync queue from storage:', error)
      await AsyncStorage.removeItem(STORAGE_KEY)
      return []
    }
  },

  /**
   * Save the sync queue to AsyncStorage.
   *
   * @param items - The queue items to save
   */
  async save(items: SyncQueueItem[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch (error) {
      console.error('Failed to save sync queue to storage:', error)
    }
  },

  /**
   * Clear the sync queue from AsyncStorage.
   */
  async clear(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY)
    } catch (error) {
      console.warn('Failed to clear sync queue from storage:', error)
    }
  },
}

/**
 * Get the size of the persisted sync queue in bytes.
 *
 * @returns The size in bytes
 */
export async function getSyncQueueSize(): Promise<number> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY)
    if (!data) return 0
    return new Blob([data]).size
  } catch {
    return 0
  }
}
