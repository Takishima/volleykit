/**
 * Badge Service
 *
 * Thin wrapper around the App Badging API.
 *
 * Browser Support:
 * - Desktop: Chrome 81+, Edge 84+ (Windows/macOS only)
 * - iOS/iPadOS: Safari 16.4+
 * - Android: Not supported (use Push Notifications instead)
 */

/** Result of a badge operation */
export interface BadgeResult {
  /** Whether the operation succeeded */
  success: boolean
  /** Error message if operation failed */
  error?: string
}

/** Check if the Badging API is available */
function isSupported(): boolean {
  return typeof navigator !== 'undefined' && 'setAppBadge' in navigator
}

/**
 * Set the app badge to a specific count (0 clears the badge).
 */
async function setBadge(count: number): Promise<BadgeResult> {
  if (!isSupported()) {
    return { success: false, error: 'Badging API not supported in this browser' }
  }

  try {
    if (count === 0) {
      await navigator.clearAppBadge()
    } else {
      await navigator.setAppBadge(count)
    }
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: `Failed to set badge: ${message}` }
  }
}

/** Clear the app badge */
function clearBadge(): Promise<BadgeResult> {
  return setBadge(0)
}

export const badgeService = { isSupported, setBadge, clearBadge }
