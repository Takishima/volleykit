import { useCallback, useMemo, useRef } from 'react'

import { useMutation } from '@tanstack/react-query'

import { useTranslation } from '@/common/hooks/useTranslation'
import { toast } from '@/common/stores/toast'
import { createLogger, type Logger } from '@/common/utils/logger'
import type { TranslationKey } from '@/i18n'

import { useSafeModeGuard } from './useSafeModeGuard'

interface SafeMutationGuardOptions {
  /** Context for safe mode logging */
  context: string
  /** Action description for safe mode logging */
  action: string
}

interface UseSafeMutationOptions<TResult> {
  /** Unique key for logging context */
  logContext: string

  /** Translation key for success toast (optional - some mutations don't show success) */
  successMessage?: TranslationKey

  /** Translation key for error toast */
  errorMessage: TranslationKey

  /** Safe mode guard options (optional - blocks when safe mode is enabled) */
  safeGuard?: SafeMutationGuardOptions

  /** Skip success toast in demo mode */
  skipSuccessToastInDemoMode?: boolean

  /** Callback on success */
  onSuccess?: (result: TResult) => void

  /** Callback on error */
  onError?: (error: unknown) => void
}

interface UseSafeMutationResult<TArg, TResult> {
  /** Execute the mutation with race condition protection */
  execute: (arg: TArg) => Promise<TResult | undefined>
  /** Whether a mutation is currently executing (for disabling UI elements) */
  isExecuting: boolean
}

/**
 * Hook that wraps TanStack Query's useMutation with common patterns:
 * - Race condition protection via useRef
 * - Toast notifications for success/error
 * - Optional safe mode guard check
 * - Visible in React Query DevTools via mutationKey
 *
 * @example
 * const { execute } = useSafeMutation(
 *   async (id: string) => api.deleteItem(id),
 *   {
 *     logContext: "useItemActions",
 *     successMessage: "items.deleteSuccess",
 *     errorMessage: "items.deleteError",
 *     safeGuard: { context: "useItemActions", action: "deleting item" },
 *   }
 * );
 *
 * const handleDelete = useCallback((item) => execute(item.id), [execute]);
 */
export function useSafeMutation<TArg, TResult = void>(
  mutationFn: (arg: TArg, logger: Logger) => Promise<TResult>,
  options: UseSafeMutationOptions<TResult>
): UseSafeMutationResult<TArg, TResult> {
  const { t } = useTranslation()
  const { guard, isDemoMode } = useSafeModeGuard()
  const isExecutingRef = useRef(false)

  // Destructure options for stable dependency array
  const {
    logContext,
    successMessage,
    errorMessage,
    safeGuard,
    skipSuccessToastInDemoMode,
    onSuccess,
    onError,
  } = options

  // Initialize logger with useMemo for idiomatic lazy initialization
  const log = useMemo(() => createLogger(logContext), [logContext])

  const mutation = useMutation({
    mutationKey: ['safe-mutation', logContext],
    mutationFn: async (arg: TArg) => mutationFn(arg, log),
    onSuccess: (result) => {
      if (successMessage) {
        const shouldShowToast = !skipSuccessToastInDemoMode || !isDemoMode
        if (shouldShowToast) {
          toast.success(t(successMessage))
        }
      }
      onSuccess?.(result)
    },
    onError: (error) => {
      log.error('Operation failed:', error)
      toast.error(t(errorMessage))
      onError?.(error)
    },
    retry: false,
  })

  const execute = useCallback(
    async (arg: TArg): Promise<TResult | undefined> => {
      // Safe mode guard check
      if (safeGuard) {
        if (guard(safeGuard)) {
          return undefined
        }
      }

      // Race condition protection
      if (isExecutingRef.current) {
        log.debug('Operation already in progress, ignoring')
        return undefined
      }

      isExecutingRef.current = true

      try {
        return await mutation.mutateAsync(arg)
      } catch {
        // Error already handled by onError callback
        return undefined
      } finally {
        isExecutingRef.current = false
      }
    },
    [safeGuard, guard, log, mutation]
  )

  return { execute, isExecuting: mutation.isPending }
}
