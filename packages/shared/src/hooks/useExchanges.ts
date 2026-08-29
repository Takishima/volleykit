/**
 * useExchanges hook - Fetches exchange data with filtering.
 *
 * Platform-agnostic implementation that works with any API client.
 *
 * Extracted from web-app/src/features/exchanges/hooks/useExchanges.ts
 */

import { useCallback, useMemo } from 'react'
import { useQuery, type UseQueryResult } from '@tanstack/react-query'

import {
  queryKeys,
  type PaginatedResponse,
  type SearchConfiguration,
  type GameExchange,
} from '../api'
import { DEFAULT_PAGE_SIZE, EXCHANGES_STALE_TIME_MS } from '../api/constants'
import { filterTakeableExchanges } from '../utils/exchange-helpers'

export { DEFAULT_PAGE_SIZE, EXCHANGES_STALE_TIME_MS }

/** Exchange status filter options */
export type ExchangeStatusFilter = 'open' | 'applied' | 'closed' | 'all'

/**
 * API client interface for fetching exchanges.
 */
export interface ExchangesApiClient {
  searchExchanges: (config: SearchConfiguration) => Promise<PaginatedResponse<GameExchange>>
  applyForExchange?: (exchangeId: string) => Promise<void>
  removeOwnExchange?: (convocationId: string) => Promise<void>
}

/** Stable empty array for React Query selectors */
const EMPTY_EXCHANGES: GameExchange[] = []

/**
 * What the hook reports: the entries to show, plus how many the server refuses
 * to hand over. Consumers need the count to explain a short list rather than
 * leaving the referee to wonder.
 */
export interface ExchangeListResult {
  /** Entries worth offering to the referee */
  items: GameExchange[]
  /** How many entries the server marked as not takeable */
  notTakeableCount: number
}

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
export function useExchanges(
  options: UseExchangesOptions
): UseQueryResult<ExchangeListResult, Error> {
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

  // Both filters depend on per-caller options that the query key does not carry,
  // so they run per observer in `select` rather than in `queryFn`. That keeps the
  // shared (and persisted) cache entry holding the server's list verbatim.
  const select = useCallback(
    (items: GameExchange[]): ExchangeListResult => {
      let result = items

      // Drop entries the referee is barred from taking over (own entries stay so
      // they can still be pulled back off the marketplace). Only on the open
      // marketplace: on the applied and closed tabs the flag is false by
      // definition, and those entries still belong in the list.
      if (status === 'open') {
        result = filterTakeableExchanges(result, currentUserId)
      }
      const notTakeableCount = items.length - result.length

      // Filter out own exchanges if requested
      if (hideOwn && currentUserId) {
        result = result.filter(
          (exchange) => exchange.submittedByPerson?.__identity !== currentUserId
        )
      }

      return { items: result, notTakeableCount }
    },
    [status, currentUserId, hideOwn]
  )

  return useQuery({
    queryKey: queryKeys.exchanges.list(config, associationKey),
    queryFn: async () => {
      const response = await apiClient.searchExchanges(config)
      return response.items ?? EMPTY_EXCHANGES
    },
    select,
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
