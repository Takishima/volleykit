/**
 * React Query client configuration.
 *
 * Centralizes QueryClient setup: retry logic, stale times, GC times,
 * and global mutation error handling.
 */

import { QueryClient } from '@tanstack/react-query'

import { ASSIGNMENTS_STALE_TIME_MS, OFFLINE_GC_TIME_MS } from '@/shared/hooks/usePaginatedQuery'
import { logger } from '@/shared/utils/logger'
import {
  classifyQueryError,
  isRetryableError,
  calculateRetryDelay,
  RETRY_CONFIG,
} from '@/shared/utils/query-error-utils'

/**
 * Global error handler for React Query mutations.
 * Logs errors with context for debugging. Network errors allow retry,
 * while other errors may need different handling.
 */
function handleMutationError(error: unknown, variables: unknown, context: unknown): void {
  const message = error instanceof Error ? error.message : 'Unknown error'
  const errorType = classifyQueryError(message)
  const stack = error instanceof Error ? error.stack : undefined

  logger.error('Mutation error:', {
    message,
    errorType,
    variables: variables ? '[redacted]' : undefined, // Don't log sensitive data
    hasContext: context !== undefined,
    stack: import.meta.env.DEV ? stack : undefined, // Only show stack in dev
  })
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (!isRetryableError(error)) return false
        return failureCount < RETRY_CONFIG.MAX_QUERY_RETRIES
      },
      // Use exponential backoff with jitter for retry delays
      retryDelay: calculateRetryDelay,
      refetchOnWindowFocus: false,
      // Cache data for 5 minutes before considering it stale
      staleTime: ASSIGNMENTS_STALE_TIME_MS,
      // Keep unused data in cache for 7 days (offline persistence)
      gcTime: OFFLINE_GC_TIME_MS,
    },
    mutations: {
      // Log mutation errors globally with context
      onError: handleMutationError,
      // Don't retry mutations by default - they have side effects
      retry: false,
    },
  },
})
