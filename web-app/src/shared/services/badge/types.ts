/**
 * Badge service types
 *
 * Designed for extensibility - the same types can be used
 * from both the main app and service worker in the future.
 */

/**
 * Result of a badge operation
 */
export interface BadgeResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** Error message if operation failed */
  error?: string;
}

/**
 * Badge service interface - can be implemented for different contexts
 * (main thread, service worker, etc.)
 */
export interface BadgeService {
  /** Check if the Badging API is supported */
  isSupported(): boolean;
  /** Set the badge to a specific count (0 clears the badge) */
  setBadge(count: number): Promise<BadgeResult>;
  /** Clear the badge */
  clearBadge(): Promise<BadgeResult>;
}

/**
 * Options for badge updates
 */
export interface BadgeUpdateOptions {
  /** Only update if the count has changed from the previous value */
  skipIfUnchanged?: boolean;
}
