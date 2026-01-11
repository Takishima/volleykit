/**
 * Utility functions for handling React Query errors.
 * Separated from App.tsx to comply with react-refresh/only-export-components rule.
 */

/**
 * Classify error type for better logging and handling.
 */
export function classifyQueryError(
  message: string
): 'network' | 'auth' | 'validation' | 'rate_limit' | 'unknown' {
  const lowerMessage = message.toLowerCase()
  if (
    lowerMessage.includes('network') ||
    lowerMessage.includes('failed to fetch') ||
    lowerMessage.includes('timeout') ||
    lowerMessage.includes('connection')
  ) {
    return 'network'
  }
  if (
    lowerMessage.includes('401') ||
    lowerMessage.includes('403') ||
    lowerMessage.includes('406') ||
    lowerMessage.includes('unauthorized') ||
    lowerMessage.includes('session expired')
  ) {
    return 'auth'
  }
  if (lowerMessage.includes('429') || lowerMessage.includes('too many requests')) {
    return 'rate_limit'
  }
  if (lowerMessage.includes('validation') || lowerMessage.includes('invalid')) {
    return 'validation'
  }
  return 'unknown'
}

/**
 * Determine if an error should trigger a retry.
 * Network and rate limit errors are retryable; auth and validation errors are not.
 */
export function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const errorType = classifyQueryError(error.message)
  return errorType === 'network' || errorType === 'rate_limit'
}

/**
 * Retry configuration for TanStack Query.
 * Exported as a single config object for easier testing and modification.
 */
export const RETRY_CONFIG = {
  MAX_RETRY_DELAY_MS: 30000, // 30 seconds maximum delay between retries
  BASE_RETRY_DELAY_MS: 1000, // Start with 1 second delay
  JITTER_FACTOR: 0.25, // Add up to 25% random jitter to prevent thundering herd
  MAX_QUERY_RETRIES: 3, // Maximum number of retry attempts
} as const

/**
 * Calculate retry delay with exponential backoff and jitter.
 *
 * @param attemptIndex - Zero-based retry attempt (0 = first retry)
 * @param _error - Error that triggered the retry (unused, accepted for TanStack Query compatibility)
 * @returns Delay in milliseconds before next retry
 */
export function calculateRetryDelay(
  attemptIndex: number,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _error?: unknown
): number {
  const exponentialDelay = RETRY_CONFIG.BASE_RETRY_DELAY_MS * Math.pow(2, attemptIndex)
  const jitter = exponentialDelay * Math.random() * RETRY_CONFIG.JITTER_FACTOR
  return Math.min(exponentialDelay + jitter, RETRY_CONFIG.MAX_RETRY_DELAY_MS)
}

/**
 * Check if an error is an authentication error that requires redirect to login.
 */
export function isAuthError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  return classifyQueryError(error.message) === 'auth'
}
