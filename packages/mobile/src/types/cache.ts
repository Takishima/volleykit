/**
 * Cache types for offline data viewing.
 *
 * Defines types for cached data with metadata for freshness indicators.
 */

/**
 * Generic cached data wrapper with metadata.
 */
export interface CachedData<T> {
  /** The cached data */
  data: T;
  /** ISO 8601 timestamp when data was cached */
  cachedAt: string;
  /** ISO 8601 timestamp when data expires (optional) */
  expiresAt?: string;
  /** Version number for cache invalidation */
  version: number;
}

/**
 * Cache metadata without data (for checking freshness).
 */
export interface CacheMetadata {
  /** ISO 8601 timestamp when data was cached */
  cachedAt: string;
  /** ISO 8601 timestamp when data expires (optional) */
  expiresAt?: string;
  /** Version number for cache invalidation */
  version: number;
  /** Size in bytes (optional) */
  sizeBytes?: number;
}

/**
 * Cache entry status.
 */
export type CacheStatus = 'fresh' | 'stale' | 'expired' | 'missing';

/**
 * Cache configuration.
 */
export interface CacheConfig {
  /** Default cache TTL in milliseconds (30 days) */
  defaultTtlMs: number;
  /** Maximum cache size in bytes */
  maxSizeBytes: number;
  /** Cache version for invalidation on schema changes */
  version: number;
}

/**
 * Default cache configuration.
 */
export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  defaultTtlMs: 30 * 24 * 60 * 60 * 1000, // 30 days
  maxSizeBytes: 10 * 1024 * 1024, // 10 MB
  version: 1,
};

/**
 * Cache keys for different data types.
 */
export const CACHE_KEYS = {
  assignments: 'cache_assignments',
  compensations: 'cache_compensations',
  exchanges: 'cache_exchanges',
  userProfile: 'cache_user_profile',
} as const;

export type CacheKey = (typeof CACHE_KEYS)[keyof typeof CACHE_KEYS];

/**
 * Calculate cache status from metadata.
 */
export function getCacheStatus(metadata: CacheMetadata | null): CacheStatus {
  if (!metadata) return 'missing';

  const now = new Date();
  const cachedAt = new Date(metadata.cachedAt);
  const expiresAt = metadata.expiresAt ? new Date(metadata.expiresAt) : null;

  // Check if expired
  if (expiresAt && now > expiresAt) {
    return 'expired';
  }

  // Check if stale (older than 1 hour)
  const staleThreshold = 60 * 60 * 1000; // 1 hour
  if (now.getTime() - cachedAt.getTime() > staleThreshold) {
    return 'stale';
  }

  return 'fresh';
}

/**
 * Format cache age for display.
 */
export function formatCacheAge(cachedAt: string): string {
  const cached = new Date(cachedAt);
  const now = new Date();
  const diffMs = now.getTime() - cached.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'yesterday';
  return `${diffDays}d ago`;
}
