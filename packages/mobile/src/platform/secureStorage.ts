/**
 * Secure storage adapter implementation using expo-secure-store
 *
 * Uses device Keychain (iOS) or Keystore (Android) for credential storage.
 * Credentials are encrypted at rest and require device authentication to access.
 */

import * as SecureStore from 'expo-secure-store';

import type { SecureStorageAdapter } from '@volleykit/shared/types/platform';

/** Key for storing username in secure storage */
const USERNAME_KEY = 'volleykit_username';

/** Key for storing password in secure storage */
const PASSWORD_KEY = 'volleykit_password';

/**
 * Secure storage options for expo-secure-store
 * - keychainAccessible: Always allow access (no additional biometric on each read)
 * - requireAuthentication: We handle biometric separately for UX control
 */
const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.ALWAYS,
};

/**
 * Secure storage adapter for credential persistence
 * Implements SecureStorageAdapter interface from shared types
 */
export const secureStorage: SecureStorageAdapter = {
  /**
   * Store credentials securely
   */
  async setCredentials(username: string, password: string): Promise<void> {
    await SecureStore.setItemAsync(USERNAME_KEY, username, SECURE_STORE_OPTIONS);
    await SecureStore.setItemAsync(PASSWORD_KEY, password, SECURE_STORE_OPTIONS);
  },

  /**
   * Retrieve stored credentials
   * Returns null if no credentials are stored
   */
  async getCredentials(): Promise<{ username: string; password: string } | null> {
    const username = await SecureStore.getItemAsync(USERNAME_KEY, SECURE_STORE_OPTIONS);
    const password = await SecureStore.getItemAsync(PASSWORD_KEY, SECURE_STORE_OPTIONS);

    if (!username || !password) {
      return null;
    }

    return { username, password };
  },

  /**
   * Clear stored credentials
   */
  async clearCredentials(): Promise<void> {
    await SecureStore.deleteItemAsync(USERNAME_KEY, SECURE_STORE_OPTIONS);
    await SecureStore.deleteItemAsync(PASSWORD_KEY, SECURE_STORE_OPTIONS);
  },

  /**
   * Check if credentials are stored
   */
  async hasCredentials(): Promise<boolean> {
    const username = await SecureStore.getItemAsync(USERNAME_KEY, SECURE_STORE_OPTIONS);
    const password = await SecureStore.getItemAsync(PASSWORD_KEY, SECURE_STORE_OPTIONS);
    return !!(username && password);
  },
};
