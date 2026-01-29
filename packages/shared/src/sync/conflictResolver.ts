/**
 * Offline Sync Queue - Conflict resolution
 *
 * This module provides functions for detecting and categorizing
 * sync conflicts and errors.
 */

import type { ConflictReason, MutationType } from './types'

/**
 * API error with optional HTTP status code.
 */
export interface ApiErrorWithStatus extends Error {
  status?: number
  code?: string
}

/**
 * Categorize a conflict error based on the error details and mutation type.
 *
 * @param error - The error from the API
 * @param mutationType - The type of mutation that was attempted
 * @returns The categorized conflict reason
 */
export function categorizeConflict(
  error: ApiErrorWithStatus,
  mutationType: MutationType
): ConflictReason {
  const message = error.message?.toLowerCase() ?? ''
  const status = error.status

  // Check HTTP status codes first
  if (status === 404) return 'not_found'
  if (status === 403) return 'permission_denied'

  // Check for exchange-specific conflicts
  if (mutationType === 'applyForExchange' || mutationType === 'withdrawFromExchange') {
    if (message.includes('already') || message.includes('taken') || status === 409) {
      return 'already_taken'
    }
    if (message.includes('closed') || message.includes('expired')) {
      return 'expired'
    }
  }

  return 'unknown'
}

/**
 * Determine if an error is retryable.
 *
 * Retryable errors are:
 * - Network errors (no status code)
 * - Server errors (5xx)
 * - Rate limiting (429)
 *
 * @param error - The error to check
 * @returns True if the operation should be retried
 */
export function isRetryableError(error: ApiErrorWithStatus): boolean {
  const status = error.status

  // Network errors (no status) are retryable
  if (!status) return true

  // Server errors are retryable
  if (status >= 500) return true

  // Rate limiting is retryable
  if (status === 429) return true

  return false
}

/**
 * Determine if an error represents a conflict.
 *
 * Conflict errors are client errors that indicate the operation
 * cannot be completed (400, 404, 409).
 *
 * @param error - The error to check
 * @returns True if this is a conflict error
 */
export function isConflictError(error: ApiErrorWithStatus): boolean {
  const status = error.status
  return status === 400 || status === 404 || status === 409
}

/**
 * Determine if an error is a network error (for sync context).
 *
 * @param error - The error to check
 * @returns True if this appears to be a network error
 */
export function isSyncNetworkError(error: ApiErrorWithStatus): boolean {
  // No status code typically means network error
  if (!error.status) return true

  // Check for common network error messages
  const message = error.message?.toLowerCase() ?? ''
  return (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('timeout') ||
    message.includes('offline')
  )
}
