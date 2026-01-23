/**
 * useCompensations hook - Fetches compensation data with filtering.
 *
 * Platform-agnostic implementation that works with any API client.
 *
 * Extracted from web-app/src/features/compensations/hooks/useCompensations.ts
 */

import { useMemo } from 'react'
import { useQuery, type UseQueryResult } from '@tanstack/react-query'

import { queryKeys, type SearchConfiguration } from '../api/queryKeys'
import type { CompensationRecord } from '../api/validation'

/** Stale time for compensations list (5 minutes) */
export const COMPENSATIONS_STALE_TIME_MS = 5 * 60 * 1000

/** Default page size for API requests */
export const DEFAULT_PAGE_SIZE = 50

/** Compensation status filter options */
export type CompensationStatus = 'pending' | 'paid' | 'all'

/**
 * API client interface for fetching compensations.
 */
export interface CompensationsApiClient {
  searchCompensations: (
    config: SearchConfiguration
  ) => Promise<{ items: CompensationRecord[]; totalItemsCount: number }>
}

/** Stable empty array for React Query selectors */
const EMPTY_COMPENSATIONS: CompensationRecord[] = []

export interface UseCompensationsOptions {
  /** API client for fetching compensations */
  apiClient: CompensationsApiClient
  /** Filter by payment status */
  status?: CompensationStatus
  /** Association key for cache invalidation */
  associationKey?: string | null
  /** Whether to enable the query */
  enabled?: boolean
}

/**
 * Hook to fetch compensations with optional status filtering.
 *
 * @param options - Configuration options including API client
 * @returns Query result with compensations array
 */
export function useCompensations(
  options: UseCompensationsOptions
): UseQueryResult<CompensationRecord[], Error> {
  const { apiClient, status = 'all', associationKey, enabled = true } = options

  const config = useMemo<SearchConfiguration>(
    () => ({
      offset: 0,
      limit: DEFAULT_PAGE_SIZE,
      status: status === 'all' ? undefined : status,
      sortField: 'compensationDate',
      sortDirection: 'desc',
    }),
    [status]
  )

  return useQuery({
    queryKey: queryKeys.compensations.list(config, associationKey),
    queryFn: async () => {
      const response = await apiClient.searchCompensations(config)
      return response.items ?? EMPTY_COMPENSATIONS
    },
    staleTime: COMPENSATIONS_STALE_TIME_MS,
    enabled,
  })
}

/**
 * Calculate total compensation amount from a list of records.
 */
export function calculateTotalCompensation(records: CompensationRecord[]): {
  gameFees: number
  travelExpenses: number
  total: number
} {
  let gameFees = 0
  let travelExpenses = 0

  for (const record of records) {
    const comp = record.convocationCompensation
    if (comp?.gameCompensation) {
      gameFees += comp.gameCompensation
    }
    if (comp?.travelExpenses) {
      travelExpenses += comp.travelExpenses
    }
  }

  return {
    gameFees,
    travelExpenses,
    total: gameFees + travelExpenses,
  }
}
