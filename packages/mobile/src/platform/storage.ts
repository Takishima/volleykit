/**
 * Mobile storage adapter using AsyncStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage'

import type { StorageAdapter } from '@volleykit/shared/types'

export const storage: StorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(key)
    } catch {
      console.error(`Failed to get item: ${key}`)
      return null
    }
  },

  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(key, value)
    } catch {
      console.error(`Failed to set item: ${key}`)
    }
  },

  removeItem: async (key: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(key)
    } catch {
      console.error(`Failed to remove item: ${key}`)
    }
  },
}
