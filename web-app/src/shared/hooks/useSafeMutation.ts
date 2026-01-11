import { useCallback, useMemo, useRef, useState } from 'react'

import type { TranslationKey } from '@/i18n'
import { useTranslation } from '@/shared/hooks/useTranslation'
import { toast } from '@/shared/stores/toast'
import { createLogger, type Logger } from '@/shared/utils/logger'

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
 * Hook that wraps async mutation functions with common patterns:
 * - Race condition protection via useRef
 * - Try-catch with logging
 * - Toast notifications for success/error
 * - Optional safe mode guard check
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
  const [isExecuting, setIsExecuting] = useState(false)

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
      setIsExecuting(true)

      try {
        const result = await mutationFn(arg, log)

        // Success toast (skip in demo mode if configured)
        if (successMessage) {
          const shouldShowToast = !skipSuccessToastInDemoMode || !isDemoMode
          if (shouldShowToast) {
            toast.success(t(successMessage))
          }
        }

        onSuccess?.(result)
        return result
      } catch (error) {
        log.error('Operation failed:', error)
        toast.error(t(errorMessage))
        onError?.(error)
        return undefined
      } finally {
        isExecutingRef.current = false
        setIsExecuting(false)
      }
    },
    [
      safeGuard,
      guard,
      log,
      mutationFn,
      successMessage,
      skipSuccessToastInDemoMode,
      isDemoMode,
      t,
      onSuccess,
      errorMessage,
      onError,
    ]
  )

  return { execute, isExecuting }
}
