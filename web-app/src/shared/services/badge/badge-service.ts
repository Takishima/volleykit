/**
 * Badge Service
 *
 * Abstraction layer for the App Badging API.
 * Designed to work from both the main thread and service worker.
 *
 * Browser Support:
 * - Desktop: Chrome 81+, Edge 84+ (Windows/macOS only)
 * - iOS/iPadOS: Safari 16.4+
 * - Android: Not supported (use Push Notifications instead)
 *
 * Future: This service can be imported into a service worker
 * to update badges from push notification handlers.
 */

import type { BadgeResult, BadgeService, BadgeUpdateOptions } from "./types";

// Track the last badge value to avoid unnecessary API calls
let lastBadgeCount: number | null = null;

/**
 * Check if the Badging API is available
 */
function isSupported(): boolean {
  return (
    typeof navigator !== "undefined" && "setAppBadge" in navigator
  );
}

/**
 * Set the app badge to a specific count
 *
 * @param count - Number to display (0 clears the badge)
 * @param options - Optional settings for the update
 * @returns Result indicating success or failure
 */
async function setBadge(
  count: number,
  options: BadgeUpdateOptions = {},
): Promise<BadgeResult> {
  const { skipIfUnchanged = false } = options;

  // Skip if unchanged and option is set
  if (skipIfUnchanged && lastBadgeCount === count) {
    return { success: true };
  }

  if (!isSupported()) {
    return {
      success: false,
      error: "Badging API not supported in this browser",
    };
  }

  try {
    if (count === 0) {
      await navigator.clearAppBadge();
    } else {
      await navigator.setAppBadge(count);
    }
    lastBadgeCount = count;
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      error: `Failed to set badge: ${message}`,
    };
  }
}

/**
 * Clear the app badge
 *
 * @returns Result indicating success or failure
 */
async function clearBadge(): Promise<BadgeResult> {
  return setBadge(0);
}

/**
 * Badge service singleton
 *
 * Usage:
 * ```typescript
 * import { badgeService } from '@/shared/services/badge';
 *
 * if (badgeService.isSupported()) {
 *   await badgeService.setBadge(3);
 * }
 * ```
 */
export const badgeService: BadgeService = {
  isSupported,
  setBadge: (count: number) => setBadge(count),
  clearBadge,
};

/**
 * Extended badge operations for advanced use cases
 */
export const badgeOperations = {
  /**
   * Set badge with options
   */
  setBadgeWithOptions: setBadge,

  /**
   * Get the last known badge count (for debugging/testing)
   */
  getLastBadgeCount: (): number | null => lastBadgeCount,

  /**
   * Reset the cached badge count (useful for testing)
   */
  resetCache: (): void => {
    lastBadgeCount = null;
  },
};
