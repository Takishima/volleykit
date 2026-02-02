import { useCallback, useMemo, useState } from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { startOfDay, endOfDay, format } from 'date-fns'

import {
  getApiClient,
  type SearchConfiguration,
  type GameExchange,
  type PickExchangeResponse,
} from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import { useNetworkStatus } from '@/shared/hooks/useNetworkStatus'
import { DEFAULT_PAGE_SIZE } from '@/shared/hooks/usePaginatedQuery'
import { createAction } from '@/shared/services/offline/action-store'
import { useActionQueueStore } from '@/shared/stores/action-queue'
import { useAuthStore } from '@/shared/stores/auth'
import { useDemoStore, DEMO_USER_PERSON_IDENTITY } from '@/shared/stores/demo'
import type { MutationCallbacks, OfflineMutationResult } from '@/shared/types/mutation'
import { MS_PER_MINUTE } from '@/shared/utils/constants'
import { getSeasonDateRange } from '@/shared/utils/date-helpers'
import { createLogger } from '@/shared/utils/logger'

const log = createLogger('useExchanges')

// Format date as YYYY-MM-DD for stable comparison (no time component)
const formatDateKey = (date: Date): string => format(date, 'yyyy-MM-dd')

// Stable empty array for React Query selectors to prevent unnecessary re-renders.
const EMPTY_EXCHANGES: GameExchange[] = []

// Exchange status filter type
// "mine" shows exchanges submitted by the current user (regardless of status)
export type ExchangeStatus = 'open' | 'applied' | 'closed' | 'all' | 'mine'

/**
 * Hook to fetch game exchange requests with optional status filtering.
 *
 * The API requires a date filter to return results. We use the current
 * volleyball season dates (September to May) to filter exchanges.
 *
 * @param status - Filter by exchange status, or 'all' for no filtering
 */
export function useGameExchanges(status: ExchangeStatus = 'all') {
  const dataSource = useAuthStore((state) => state.dataSource)
  const isDemoMode = dataSource === 'demo'
  const activeOccupationId = useAuthStore((state) => state.activeOccupationId)
  const userId = useAuthStore((state) => state.user?.id)
  const demoAssociationCode = useDemoStore((state) => state.activeAssociationCode)
  const apiClient = getApiClient(dataSource)

  // Use appropriate key for cache invalidation when switching associations
  const associationKey = isDemoMode ? demoAssociationCode : activeOccupationId

  // Compute date keys (YYYY-MM-DD) for stable memoization.
  // Using just the date portion ensures the key is stable within the same day.
  const todayKey = formatDateKey(new Date())
  const seasonEndKey = formatDateKey(getSeasonDateRange().to)

  // Memoize date range to ensure stable query key across tab switches.
  // Only recalculates when the day changes (for overnight refresh).
  const dateRange = useMemo(
    () => ({
      from: startOfDay(new Date()).toISOString(),
      to: endOfDay(getSeasonDateRange().to).toISOString(),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Use date keys for stability, not Date objects
    [todayKey, seasonEndKey]
  )

  // Build property filters: always fetch open exchanges, filter client-side for "mine".
  // This allows both tabs to share the same cached query.
  const propertyFilters = useMemo<SearchConfiguration['propertyFilters']>(
    () => [
      {
        propertyName: 'refereeGame.game.startingDateTime',
        dateRange,
      },
      {
        propertyName: 'status',
        enumValues: ['open'],
      },
    ],
    [dateRange]
  )

  const config = useMemo<SearchConfiguration>(
    () => ({
      offset: 0,
      limit: DEFAULT_PAGE_SIZE,
      propertyFilters,
      propertyOrderings: [
        {
          propertyName: 'refereeGame.game.startingDateTime',
          descending: false,
          isSetByUser: true,
        },
      ],
    }),
    [propertyFilters]
  )

  // Filter by submittedByPerson for "mine" status. Both tabs share the same
  // cached query (open exchanges), with "mine" filtering to show only the
  // user's own submissions.
  const selectExchanges = useMemo(() => {
    return (data: { items?: GameExchange[] }) => {
      const items = data.items ?? EMPTY_EXCHANGES

      if (status === 'mine') {
        const userIdentity = isDemoMode ? DEMO_USER_PERSON_IDENTITY : userId
        if (!userIdentity) return EMPTY_EXCHANGES

        return items.filter((exchange) => exchange.submittedByPerson?.__identity === userIdentity)
      }

      return items
    }
  }, [status, isDemoMode, userId])

  return useQuery({
    queryKey: queryKeys.exchanges.list(config, associationKey),
    queryFn: () => apiClient.searchExchanges(config),
    select: selectExchanges,
    staleTime: 2 * MS_PER_MINUTE,
    // Keep previous data while selector recalculates during tab switches.
    // This prevents loading flash since both tabs share the same cached query.
    placeholderData: (prev) => prev,
  })
}

/**
 * Mutation hook to apply for an exchange.
 * Supports offline mode - queues the application when offline and syncs when back online.
 */
export function useApplyForExchange(): OfflineMutationResult<PickExchangeResponse | null, string> {
  const queryClient = useQueryClient()
  const dataSource = useAuthStore((state) => state.dataSource)
  const isOnline = useNetworkStatus()
  const { refresh: refreshActionQueue } = useActionQueueStore()
  const apiClient = getApiClient(dataSource)

  const [isPending, setIsPending] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isError, setIsError] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [wasQueued, setWasQueued] = useState(false)

  const reset = useCallback(() => {
    setIsPending(false)
    setIsSuccess(false)
    setIsError(false)
    setError(null)
    setWasQueued(false)
  }, [])

  const mutateAsync = useCallback(
    async (exchangeId: string): Promise<PickExchangeResponse | null> => {
      reset()
      setIsPending(true)

      try {
        if (isOnline) {
          // Online: execute immediately
          log.debug('Applying for exchange (online):', { exchangeId })
          const result = await apiClient.applyForExchange(exchangeId)

          // Invalidate queries to refetch fresh data
          await queryClient.invalidateQueries({ queryKey: queryKeys.exchanges.lists() })

          setIsSuccess(true)
          setWasQueued(false)
          return result
        } else {
          // Offline: queue the action
          log.debug('Queueing exchange application (offline):', { exchangeId })
          const action = await createAction('applyForExchange', { exchangeId })

          if (!action) {
            throw new Error('Failed to queue action - IndexedDB unavailable')
          }

          // Refresh action queue store to update badge count
          await refreshActionQueue()

          setIsSuccess(true)
          setWasQueued(true)
          return null // No response when queued
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        log.error('Failed to apply for exchange:', error)
        setIsError(true)
        setError(error)
        throw error
      } finally {
        setIsPending(false)
      }
    },
    [isOnline, apiClient, queryClient, refreshActionQueue, reset]
  )

  const mutate = useCallback(
    (exchangeId: string, options?: MutationCallbacks<PickExchangeResponse>) => {
      mutateAsync(exchangeId)
        .then((result) => {
          options?.onSuccess?.(result)
        })
        .catch((err) => {
          options?.onError?.(err)
        })
    },
    [mutateAsync]
  )

  return {
    mutate,
    mutateAsync,
    isPending,
    isSuccess,
    isError,
    error,
    reset,
    wasQueued,
  }
}

/**
 * Mutation hook to withdraw from an exchange.
 * Supports offline mode - queues the withdrawal when offline and syncs when back online.
 */
export function useWithdrawFromExchange(): OfflineMutationResult<void, string> {
  const queryClient = useQueryClient()
  const dataSource = useAuthStore((state) => state.dataSource)
  const isOnline = useNetworkStatus()
  const { refresh: refreshActionQueue } = useActionQueueStore()
  const apiClient = getApiClient(dataSource)

  const [isPending, setIsPending] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isError, setIsError] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [wasQueued, setWasQueued] = useState(false)

  const reset = useCallback(() => {
    setIsPending(false)
    setIsSuccess(false)
    setIsError(false)
    setError(null)
    setWasQueued(false)
  }, [])

  const mutateAsync = useCallback(
    async (exchangeId: string): Promise<void> => {
      reset()
      setIsPending(true)

      try {
        if (isOnline) {
          // Online: execute immediately
          log.debug('Withdrawing from exchange (online):', { exchangeId })
          await apiClient.withdrawFromExchange(exchangeId)

          // Invalidate queries to refetch fresh data
          await queryClient.invalidateQueries({ queryKey: queryKeys.exchanges.lists() })

          setIsSuccess(true)
          setWasQueued(false)
        } else {
          // Offline: queue the action
          log.debug('Queueing exchange withdrawal (offline):', { exchangeId })
          const action = await createAction('withdrawFromExchange', { exchangeId })

          if (!action) {
            throw new Error('Failed to queue action - IndexedDB unavailable')
          }

          // Refresh action queue store to update badge count
          await refreshActionQueue()

          setIsSuccess(true)
          setWasQueued(true)
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        log.error('Failed to withdraw from exchange:', error)
        setIsError(true)
        setError(error)
        throw error
      } finally {
        setIsPending(false)
      }
    },
    [isOnline, apiClient, queryClient, refreshActionQueue, reset]
  )

  const mutate = useCallback(
    (exchangeId: string, options?: MutationCallbacks<void>) => {
      mutateAsync(exchangeId)
        .then(() => {
          options?.onSuccess?.()
        })
        .catch((err) => {
          options?.onError?.(err)
        })
    },
    [mutateAsync]
  )

  return {
    mutate,
    mutateAsync,
    isPending,
    isSuccess,
    isError,
    error,
    reset,
    wasQueued,
  }
}

/**
 * Mutation hook to add an assignment to the exchange marketplace.
 * Supports offline mode - queues the action when offline and syncs when back online.
 * This moves the assignment from your assignments to the exchange.
 */
export function useAddToExchange(): OfflineMutationResult<void, string> {
  const queryClient = useQueryClient()
  const dataSource = useAuthStore((state) => state.dataSource)
  const isOnline = useNetworkStatus()
  const { refresh: refreshActionQueue } = useActionQueueStore()
  const apiClient = getApiClient(dataSource)

  const [isPending, setIsPending] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isError, setIsError] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [wasQueued, setWasQueued] = useState(false)

  const reset = useCallback(() => {
    setIsPending(false)
    setIsSuccess(false)
    setIsError(false)
    setError(null)
    setWasQueued(false)
  }, [])

  const mutateAsync = useCallback(
    async (convocationId: string): Promise<void> => {
      reset()
      setIsPending(true)

      try {
        if (isOnline) {
          // Online: execute immediately
          log.debug('Adding to exchange (online):', { convocationId })
          await apiClient.addToExchange(convocationId)

          // Invalidate both exchanges and assignments since the assignment moves between them
          await queryClient.invalidateQueries({ queryKey: queryKeys.exchanges.lists() })
          await queryClient.invalidateQueries({ queryKey: queryKeys.assignments.lists() })

          setIsSuccess(true)
          setWasQueued(false)
        } else {
          // Offline: queue the action
          log.debug('Queueing add to exchange (offline):', { convocationId })
          const action = await createAction('addToExchange', { convocationId })

          if (!action) {
            throw new Error('Failed to queue action - IndexedDB unavailable')
          }

          // Refresh action queue store to update badge count
          await refreshActionQueue()

          setIsSuccess(true)
          setWasQueued(true)
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        log.error('Failed to add to exchange:', error)
        setIsError(true)
        setError(error)
        throw error
      } finally {
        setIsPending(false)
      }
    },
    [isOnline, apiClient, queryClient, refreshActionQueue, reset]
  )

  const mutate = useCallback(
    (convocationId: string, options?: MutationCallbacks<void>) => {
      mutateAsync(convocationId)
        .then(() => {
          options?.onSuccess?.()
        })
        .catch((err) => {
          options?.onError?.(err)
        })
    },
    [mutateAsync]
  )

  return {
    mutate,
    mutateAsync,
    isPending,
    isSuccess,
    isError,
    error,
    reset,
    wasQueued,
  }
}
