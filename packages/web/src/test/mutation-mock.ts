import { vi } from 'vitest'

import type { OfflineMutationResult } from '@/common/types/mutation'

/**
 * Builds an idle `OfflineMutationResult` for mocking an offline-aware mutation
 * hook. Pass the fields the test cares about (usually `mutate` or
 * `mutateAsync`); everything else is the idle default.
 */
export function createOfflineMutationResult<TData, TVariables>(
  overrides: Partial<OfflineMutationResult<TData, TVariables>> = {}
): OfflineMutationResult<TData, TVariables> {
  return {
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
    isSuccess: false,
    isError: false,
    error: null,
    reset: vi.fn(),
    wasQueued: false,
    ...overrides,
  }
}
