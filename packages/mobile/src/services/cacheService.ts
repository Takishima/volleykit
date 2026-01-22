/**
 * Cache service for offline data persistence.
 *
 * Uses AsyncStorage to persist and retrieve cached data with metadata.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_CACHE_CONFIG, getCacheStatus } from '../types/cache';

import type {
  CachedData,
  CacheMetadata,
  CacheKey,
  CacheConfig,
} from '../types/cache';

/**
 * Cache service interface.
 */
export interface CacheService {
  /** Save data to cache */
  save<T>(key: CacheKey, data: T, ttlMs?: number): Promise<void>;
  /** Load data from cache */
  load<T>(key: CacheKey): Promise<CachedData<T> | null>;
  /** Get cache metadata without loading data */
  getMetadata(key: CacheKey): Promise<CacheMetadata | null>;
  /** Check if cache is valid (not expired) */
  isValid(key: CacheKey): Promise<boolean>;
  /** Clear specific cache entry */
  clear(key: CacheKey): Promise<void>;
  /** Clear all cache entries */
  clearAll(): Promise<void>;
  /** Get total cache size */
  getCacheSize(): Promise<number>;
}

/**
 * Create a cache entry.
 */
function createCacheEntry<T>(
  data: T,
  config: CacheConfig,
  ttlMs?: number
): CachedData<T> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + (ttlMs ?? config.defaultTtlMs));

  return {
    data,
    cachedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    version: config.version,
  };
}

/**
 * Save data to cache.
 */
async function save<T>(
  key: CacheKey,
  data: T,
  ttlMs?: number,
  config: CacheConfig = DEFAULT_CACHE_CONFIG
): Promise<void> {
  try {
    const cacheEntry = createCacheEntry(data, config, ttlMs);
    const jsonString = JSON.stringify(cacheEntry);

    // Check size limit
    const sizeBytes = new Blob([jsonString]).size;
    if (sizeBytes > config.maxSizeBytes) {
      console.warn(`Cache entry for ${key} exceeds size limit, skipping`);
      return;
    }

    await AsyncStorage.setItem(key, jsonString);
  } catch (error) {
    console.error(`Failed to save cache for ${key}:`, error);
  }
}

/**
 * Load data from cache.
 */
async function load<T>(
  key: CacheKey,
  config: CacheConfig = DEFAULT_CACHE_CONFIG
): Promise<CachedData<T> | null> {
  try {
    const jsonString = await AsyncStorage.getItem(key);
    if (!jsonString) return null;

    const cacheEntry = JSON.parse(jsonString) as CachedData<T>;

    // Check version - invalidate if version mismatch
    if (cacheEntry.version !== config.version) {
      await clear(key);
      return null;
    }

    return cacheEntry;
  } catch (error) {
    console.error(`Failed to load cache for ${key}:`, error);
    return null;
  }
}

/**
 * Get cache metadata without loading data.
 */
async function getMetadata(
  key: CacheKey,
  config: CacheConfig = DEFAULT_CACHE_CONFIG
): Promise<CacheMetadata | null> {
  try {
    const jsonString = await AsyncStorage.getItem(key);
    if (!jsonString) return null;

    const cacheEntry = JSON.parse(jsonString) as CachedData<unknown>;

    // Check version
    if (cacheEntry.version !== config.version) {
      return null;
    }

    return {
      cachedAt: cacheEntry.cachedAt,
      expiresAt: cacheEntry.expiresAt,
      version: cacheEntry.version,
      sizeBytes: new Blob([jsonString]).size,
    };
  } catch {
    return null;
  }
}

/**
 * Check if cache is valid (not expired).
 */
async function isValid(key: CacheKey): Promise<boolean> {
  const metadata = await getMetadata(key);
  const status = getCacheStatus(metadata);
  return status !== 'expired' && status !== 'missing';
}

/**
 * Clear specific cache entry.
 */
async function clear(key: CacheKey): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error(`Failed to clear cache for ${key}:`, error);
  }
}

/**
 * Clear all cache entries.
 */
async function clearAll(): Promise<void> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const cacheKeys = allKeys.filter((key) => key.startsWith('cache_'));
    await AsyncStorage.multiRemove(cacheKeys);
  } catch (error) {
    console.error('Failed to clear all cache:', error);
  }
}

/**
 * Get total cache size in bytes.
 */
async function getCacheSize(): Promise<number> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const cacheKeys = allKeys.filter((key) => key.startsWith('cache_'));
    const items = await AsyncStorage.multiGet(cacheKeys);

    let totalSize = 0;
    for (const item of items) {
      const value = item[1];
      if (value) {
        totalSize += new Blob([value]).size;
      }
    }

    return totalSize;
  } catch {
    return 0;
  }
}

/**
 * Cache service implementation.
 */
export const cacheService: CacheService = {
  save: (key, data, ttlMs) => save(key, data, ttlMs),
  load: (key) => load(key),
  getMetadata: (key) => getMetadata(key),
  isValid,
  clear,
  clearAll,
  getCacheSize,
};
