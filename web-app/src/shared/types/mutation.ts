/**
 * Shared types for offline-aware mutation hooks.
 *
 * These types provide a consistent interface for mutation hooks that
 * support offline queueing and are compatible with TanStack Query patterns.
 */

/**
 * Callback options for mutation operations.
 * Provides onSuccess/onError callbacks similar to TanStack Query.
 */
export interface MutationCallbacks<TData> {
  onSuccess?: (data: TData) => void
  onError?: (error: Error) => void
}

/**
 * Result type for offline-aware mutation hooks.
 * Compatible with TanStack Query's UseMutationResult pattern.
 */
export interface OfflineMutationResult<TData, TVariables> {
  mutate: (variables: TVariables, options?: MutationCallbacks<TData>) => void
  mutateAsync: (variables: TVariables) => Promise<TData>
  isPending: boolean
  isSuccess: boolean
  isError: boolean
  error: Error | null
  reset: () => void
  /** Whether the last operation was queued offline */
  wasQueued: boolean
}
