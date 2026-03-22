/**
 * Platform-agnostic offline sync utilities.
 *
 * Pure functions for error classification, retry logic, and sync orchestration.
 * No platform-specific dependencies (no IndexedDB, no browser APIs).
 */

import type { SyncResult, OfflineAction } from './types'
import { MAX_RETRY_COUNT, RETRY_DELAY_BASE_MS } from './action-types'

/**
 * Check if an error indicates session expiry (401/unauthorized).
 */
export function isSessionExpiredError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return (
      message.includes('unauthorized') ||
      message.includes('401') ||
      message.includes('session') ||
      message.includes('login')
    )
  }
  return false
}

/**
 * Check if an error indicates a conflict (entity modified/deleted).
 */
export function isConflictError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return (
      message.includes('not found') ||
      message.includes('404') ||
      message.includes('conflict') ||
      message.includes('409') ||
      message.includes('already')
    )
  }
  return false
}

/**
 * Calculate delay for exponential backoff.
 *
 * @param retryCount - Number of previous retry attempts (0-based)
 * @returns Delay in milliseconds
 */
export function getRetryDelay(retryCount: number): number {
  return RETRY_DELAY_BASE_MS * Math.pow(2, retryCount)
}

/**
 * Sleep for a specified duration.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Generate a unique action ID for the offline queue.
 * Uses timestamp + random suffix for uniqueness without crypto dependency.
 */
export function generateActionId(): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).slice(2, 10)
  return `action_${timestamp}_${random}`
}

/**
 * Determine whether a failed action should be retried.
 */
export function shouldRetryAction(action: OfflineAction): boolean {
  return action.retryCount < MAX_RETRY_COUNT
}

/**
 * Create an empty sync result (no pending actions).
 */
export function emptySyncResult(): SyncResult {
  return {
    processed: 0,
    succeeded: 0,
    failed: 0,
    requiresReauth: false,
    results: [],
  }
}

/**
 * Sort actions by creation time for ordered processing.
 */
export function sortActionsByCreatedAt(actions: OfflineAction[]): OfflineAction[] {
  return [...actions].sort((a, b) => a.createdAt - b.createdAt)
}
