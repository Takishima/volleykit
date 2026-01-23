/**
 * useExchanges hook - Fetches exchange data with filtering.
 *
 * Platform-agnostic implementation that works with any API client.
 *
 * Extracted from web-app/src/features/exchanges/hooks/useExchanges.ts
 */

import { useMemo } from 'react'
import { useQuery, type UseQueryResult } from '@tanstack/react-query'

import { queryKeys, type SearchConfiguration } from '../api/queryKeys'
import type { GameExchange } from '../api/validation'

/** Stale time for exchanges list (2 minutes - shorter since exchanges change frequently) */
export const EXCHANGES_STALE_TIME_MS = 2 * 60 * 1000

/** Default page size for API requests */
export const DEFAULT_PAGE_SIZE = 50

/** Exchange status filter options */
export type ExchangeStatusFilter = 'open' | 'applied' | 'closed' | 'all'

/**
 * API client interface for fetching exchanges.
 */
export interface ExchangesApiClient {
  searchExchanges: (
    config: SearchConfiguration
  ) => Promise<{ items: GameExchange[]; totalItemsCount: number }>
  applyForExchange?: (exchangeId: string) => Promise<void>
  withdrawFromExchange?: (exchangeId: string) => Promise<void>
}

/** Stable empty array for React Query selectors */
const EMPTY_EXCHANGES: GameExchange[] = []

export interface UseExchangesOptions {
  /** API client for fetching exchanges */
  apiClient: ExchangesApiClient
  /** Filter by exchange status */
  status?: ExchangeStatusFilter
  /** Association key for cache invalidation */
  associationKey?: string | null
  /** Whether to enable the query */
  enabled?: boolean
  /** Filter out exchanges submitted by the current user */
  hideOwn?: boolean
  /** Current user ID for filtering own exchanges */
  currentUserId?: string
}

/**
 * Hook to fetch exchanges with optional status filtering.
 *
 * @param options - Configuration options including API client
 * @returns Query result with exchanges array
 */
export function useExchanges(options: UseExchangesOptions): UseQueryResult<GameExchange[], Error> {
  const {
    apiClient,
    status = 'open',
    associationKey,
    enabled = true,
    hideOwn = false,
    currentUserId,
  } = options

  const config = useMemo<SearchConfiguration>(
    () => ({
      offset: 0,
      limit: DEFAULT_PAGE_SIZE,
      status: status === 'all' ? undefined : status,
      sortField: 'refereeGame.game.startingDateTime',
      sortDirection: 'asc',
    }),
    [status]
  )

  return useQuery({
    queryKey: queryKeys.exchanges.list(config, associationKey),
    queryFn: async () => {
      const response = await apiClient.searchExchanges(config)
      let items = response.items ?? EMPTY_EXCHANGES

      // Filter out own exchanges if requested
      if (hideOwn && currentUserId) {
        items = items.filter((exchange) => exchange.submittedByPerson?.__identity !== currentUserId)
      }

      return items
    },
    staleTime: EXCHANGES_STALE_TIME_MS,
    enabled,
  })
}

/**
 * Get display info for an exchange.
 */
export function getExchangeDisplayInfo(exchange: GameExchange): {
  gameNumber: string
  dateTime: string | null
  homeTeam: string
  awayTeam: string
  hall: string
  position: string
  submittedBy: string
  reason: string | null
} {
  const game = exchange.refereeGame?.game

  return {
    gameNumber: game?.gameNumber ?? '',
    dateTime: game?.startingDateTime ?? null,
    homeTeam: game?.teamHome?.name ?? 'TBD',
    awayTeam: game?.teamAway?.name ?? 'TBD',
    hall: game?.hall?.name ?? 'TBD',
    position: exchange.refereePosition ?? '',
    submittedBy: exchange.submittedByPerson?.displayName ?? '',
    reason: exchange.exchangeReason ?? null,
  }
}
