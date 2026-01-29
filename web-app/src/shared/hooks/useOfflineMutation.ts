/**
 * Offline-aware mutation hook.
 *
 * Wraps mutations to support offline queueing with automatic sync
 * when connectivity is restored.
 */

import { useCallback, useMemo, useRef, useState } from 'react'

import {
  generateItemId,
  useSyncStore,
  type MutationType,
  type SyncQueueItem,
} from '@volleykit/shared'

import type { TranslationKey } from '@/i18n'
import { useTranslation } from '@/shared/hooks/useTranslation'
import { useSettingsStore } from '@/shared/stores/settings'
import { toast } from '@/shared/stores/toast'
import { createLogger, type Logger } from '@/shared/utils/logger'

import { useIsOnline } from './useNetworkStatus'
import { useSafeModeGuard } from './useSafeModeGuard'

interface SafeMutationGuardOptions {
  /** Context for safe mode logging */
  context: string
  /** Action description for safe mode logging */
  action: string
}

interface UseOfflineMutationOptions<TArg, TResult> {
  /** Unique key for logging context */
  logContext: string

  /** Mutation type for the sync queue */
  mutationType: MutationType

  /** Get the entity ID from the mutation argument */
  getEntityId: (arg: TArg) => string

  /** Get a human-readable label for UI display */
  getDisplayLabel: (arg: TArg) => string

  /** Get an optional entity label for additional context */
  getEntityLabel?: (arg: TArg) => string | undefined

  /** Translation key for success toast */
  successMessage?: TranslationKey

  /** Translation key for error toast */
  errorMessage: TranslationKey

  /** Translation key for "queued offline" toast */
  queuedMessage?: TranslationKey

  /** Safe mode guard options */
  safeGuard?: SafeMutationGuardOptions

  /** Skip success toast in demo mode */
  skipSuccessToastInDemoMode?: boolean

  /** Callback on success */
  onSuccess?: (result: TResult) => void

  /** Callback on error */
  onError?: (error: unknown) => void

  /** Callback when queued offline */
  onQueued?: (item: SyncQueueItem) => void
}

interface UseOfflineMutationResult<TArg, TResult> {
  /** Execute the mutation (online) or queue it (offline) */
  execute: (arg: TArg) => Promise<TResult | undefined>
  /** Whether a mutation is currently executing */
  isExecuting: boolean
  /** Whether the last operation was queued offline */
  wasQueued: boolean
}

/**
 * Hook that wraps async mutation functions with offline support.
 *
 * When online: Executes the mutation immediately
 * When offline: Queues the operation for sync when connectivity returns
 *
 * @example
 * ```tsx
 * const { execute } = useOfflineMutation(
 *   async (exchangeId: string) => api.applyForExchange(exchangeId),
 *   {
 *     logContext: 'useExchangeActions',
 *     mutationType: 'applyForExchange',
 *     getEntityId: (id) => id,
 *     getDisplayLabel: () => 'Take over game',
 *     successMessage: 'exchange.applySuccess',
 *     errorMessage: 'exchange.applyError',
 *     queuedMessage: 'sync.savedOffline',
 *   }
 * )
 * ```
 */
export function useOfflineMutation<TArg, TResult = void>(
  mutationFn: (arg: TArg, logger: Logger) => Promise<TResult>,
  options: UseOfflineMutationOptions<TArg, TResult>
): UseOfflineMutationResult<TArg, TResult> {
  const { t } = useTranslation()
  const { guard, isDemoMode } = useSafeModeGuard()
  const isOnline = useIsOnline()
  const isOfflineSyncEnabled = useSettingsStore((state) => state.isOfflineSyncEnabled)
  const addItem = useSyncStore((state) => state.addItem)

  const isExecutingRef = useRef(false)
  const [isExecuting, setIsExecuting] = useState(false)
  const [wasQueued, setWasQueued] = useState(false)

  const {
    logContext,
    mutationType,
    getEntityId,
    getDisplayLabel,
    getEntityLabel,
    successMessage,
    errorMessage,
    queuedMessage,
    safeGuard,
    skipSuccessToastInDemoMode,
    onSuccess,
    onError,
    onQueued,
  } = options

  const log = useMemo(() => createLogger(logContext), [logContext])

  const execute = useCallback(
    async (arg: TArg): Promise<TResult | undefined> => {
      setWasQueued(false)

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

      // If offline, either queue the operation or show error based on setting
      if (!isOnline) {
        // If offline sync is disabled, show error and return
        if (!isOfflineSyncEnabled) {
          log.debug('Offline sync disabled, cannot execute while offline')
          toast.error(t('sync.offlineNotAvailable' as TranslationKey))
          return undefined
        }

        const queueItem: SyncQueueItem = {
          id: generateItemId(),
          type: mutationType,
          entityId: getEntityId(arg),
          payload: arg,
          timestamp: Date.now(),
          status: 'pending',
          retryCount: 0,
          displayLabel: getDisplayLabel(arg),
          entityLabel: getEntityLabel?.(arg),
        }

        addItem(queueItem)
        setWasQueued(true)

        log.debug('Operation queued for offline sync:', queueItem.id)

        if (queuedMessage) {
          toast.info(t(queuedMessage))
        } else {
          toast.info(t('sync.savedOffline' as TranslationKey))
        }

        onQueued?.(queueItem)
        return undefined
      }

      // Online - execute immediately
      isExecutingRef.current = true
      setIsExecuting(true)

      try {
        const result = await mutationFn(arg, log)

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
      isOnline,
      isOfflineSyncEnabled,
      mutationType,
      getEntityId,
      getDisplayLabel,
      getEntityLabel,
      addItem,
      queuedMessage,
      t,
      onQueued,
      mutationFn,
      successMessage,
      skipSuccessToastInDemoMode,
      isDemoMode,
      onSuccess,
      errorMessage,
      onError,
    ]
  )

  return { execute, isExecuting, wasQueued }
}
