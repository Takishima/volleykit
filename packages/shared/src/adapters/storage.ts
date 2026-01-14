/**
 * Storage adapter interface and context
 */

import { createContext, useContext } from 'react';
import type { StorageAdapter, SecureStorageAdapter } from '../types/platform';

/**
 * Default no-op storage adapter (for SSR/testing)
 */
export const noopStorageAdapter: StorageAdapter = {
  getItem: async () => null,
  setItem: async () => {},
  removeItem: async () => {},
};

/**
 * Default no-op secure storage adapter (for SSR/testing)
 */
export const noopSecureStorageAdapter: SecureStorageAdapter = {
  setCredentials: async () => {},
  getCredentials: async () => null,
  clearCredentials: async () => {},
  hasCredentials: async () => false,
};

/**
 * Storage context for platform-specific implementation injection
 */
export interface StorageContextValue {
  storage: StorageAdapter;
  secureStorage: SecureStorageAdapter;
}

export const StorageContext = createContext<StorageContextValue>({
  storage: noopStorageAdapter,
  secureStorage: noopSecureStorageAdapter,
});

/**
 * Hook to access storage adapters
 */
export const useStorage = (): StorageContextValue => {
  return useContext(StorageContext);
};
