import { useEffect, useState, useMemo } from 'react'

import { useQueryClient } from '@tanstack/react-query'

import { getApiClient } from '@/api/client'
import type { Assignment, CompensationRecord } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import { COMPENSATION_LOOKUP_LIMIT } from '@/shared/hooks/usePaginatedQuery'
import { useTranslation } from '@/shared/hooks/useTranslation'
import { useAuthStore, type DataSource } from '@/shared/stores/auth'
import { useDemoStore } from '@/shared/stores/demo'
import { formatDistanceKm } from '@/shared/utils/distance'
import { logger } from '@/shared/utils/logger'

import { COMPENSATION_ERROR_KEYS, type CompensationErrorKey } from './useCompensations'
import {
  findCompensationInCache,
  findOtherEditableCompensationsAtSameHall,
} from '../utils/compensation-cache'

/** State setters interface for data fetching helpers */
interface FormStateSetters {
  setKilometers: (value: string) => void
  setReason: (value: string) => void
  setIsDistanceEditable: (value: boolean) => void
  setIsLoading: (value: boolean) => void
  setFetchError: (value: string | null) => void
}

/**
 * Extracts compensation data from an assignment's eager-loaded convocationCompensation.
 * Returns distance in km format and editability flag.
 */
function getEagerLoadedCompensationData(assignment: Assignment): {
  distanceKm: string
  isDistanceEditable: boolean
  compensationId: string | undefined
} | null {
  const compensation = assignment.convocationCompensation
  if (!compensation) return null

  const distanceInMetres = compensation.distanceInMetres
  const distanceKm =
    distanceInMetres !== undefined && distanceInMetres > 0 ? formatDistanceKm(distanceInMetres) : ''

  // When hasFlexibleTravelExpenses is false, the backend does not allow editing
  const hasFlexibleTravelExpenses = compensation.hasFlexibleTravelExpenses
  const isDistanceEditable = hasFlexibleTravelExpenses !== false

  return {
    distanceKm,
    isDistanceEditable,
    compensationId: compensation.__identity,
  }
}

/**
 * Fetches only the correctionReason field for an assignment with eager-loaded data.
 * Returns a cleanup function.
 */
function fetchCorrectionReasonOnly(
  compensationId: string,
  dataSource: DataSource,
  setters: Pick<FormStateSetters, 'setReason'>
): () => void {
  let cancelled = false

  const fetchData = async () => {
    const apiClient = getApiClient(dataSource)
    try {
      const details = await apiClient.getCompensationDetails(compensationId)
      if (cancelled) return

      const existingReason = details.convocationCompensation?.correctionReason
      if (existingReason) {
        setters.setReason(existingReason)
      }
    } catch (error) {
      // Non-critical: correctionReason is optional, log but don't show error
      if (!cancelled) {
        logger.debug('[EditCompensationModal] Could not fetch correctionReason:', error)
      }
    }
  }

  fetchData()
  return () => {
    cancelled = true
  }
}

/**
 * Fetches compensation details by looking up via game number.
 * Used as fallback when eager-loaded data is not available.
 */
function fetchCompensationByGameNumber(
  gameNumber: string | number,
  dataSource: DataSource,
  queries: [unknown, { items: CompensationRecord[] } | undefined][],
  setters: FormStateSetters,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accept any translation function
  t: (key: any) => string
): () => void {
  let cancelled = false

  const fetchData = async () => {
    setters.setIsLoading(true)
    setters.setFetchError(null)
    const apiClient = getApiClient(dataSource)

    try {
      // Try to find compensation in cache first
      let foundCompensationId = findCompensationInCache(gameNumber, queries)
        ?.convocationCompensation?.__identity

      // If not in cache, fetch compensations from API
      if (!foundCompensationId) {
        const compensations = await apiClient.searchCompensations({
          limit: COMPENSATION_LOOKUP_LIMIT,
        })
        if (cancelled) return

        const matchingComp = compensations.items.find(
          (c) => String(c.refereeGame?.game?.number) === String(gameNumber)
        )
        foundCompensationId = matchingComp?.convocationCompensation?.__identity
      }

      if (!foundCompensationId) {
        logger.debug('[EditCompensationModal] No compensation found for game number:', gameNumber)
        return
      }

      // Fetch detailed compensation data
      const details = await apiClient.getCompensationDetails(foundCompensationId)
      if (cancelled) return

      const distanceInMetres = details.convocationCompensation?.distanceInMetres
      if (distanceInMetres !== undefined && distanceInMetres > 0) {
        setters.setKilometers(formatDistanceKm(distanceInMetres))
      }

      const existingReason = details.convocationCompensation?.correctionReason
      if (existingReason) {
        setters.setReason(existingReason)
      }

      const hasFlexibleTravelExpenses = details.convocationCompensation?.hasFlexibleTravelExpenses
      setters.setIsDistanceEditable(hasFlexibleTravelExpenses !== false)

      logger.debug('[EditCompensationModal] Loaded compensation details for assignment:', details)
    } catch (error) {
      if (cancelled) return

      logger.error(
        '[EditCompensationModal] Failed to fetch compensation details for assignment:',
        error
      )
      const errorMessage = error instanceof Error ? error.message : ''
      const knownErrorKeys = Object.values(COMPENSATION_ERROR_KEYS)
      const isKnownErrorKey = knownErrorKeys.includes(errorMessage as CompensationErrorKey)
      setters.setFetchError(
        isKnownErrorKey ? t(errorMessage) : errorMessage || t('assignments.failedToLoadData')
      )
    } finally {
      if (!cancelled) {
        setters.setIsLoading(false)
      }
    }
  }

  fetchData()
  return () => {
    cancelled = true
  }
}

/**
 * Fetches compensation details directly by compensation ID.
 * Used for compensation record edits.
 */
function fetchCompensationDetailsById(
  compensationId: string,
  dataSource: DataSource,
  setters: FormStateSetters,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accept any translation function
  t: (key: any) => string
): () => void {
  let cancelled = false

  const fetchData = async () => {
    setters.setIsLoading(true)
    setters.setFetchError(null)
    const apiClient = getApiClient(dataSource)

    try {
      const details = await apiClient.getCompensationDetails(compensationId)
      if (cancelled) return

      const distanceInMetres = details.convocationCompensation?.distanceInMetres
      if (distanceInMetres !== undefined && distanceInMetres > 0) {
        setters.setKilometers(formatDistanceKm(distanceInMetres))
      }

      const existingReason = details.convocationCompensation?.correctionReason
      if (existingReason) {
        setters.setReason(existingReason)
      }

      const hasFlexibleTravelExpenses = details.convocationCompensation?.hasFlexibleTravelExpenses
      setters.setIsDistanceEditable(hasFlexibleTravelExpenses !== false)

      logger.debug('[EditCompensationModal] Loaded compensation details:', details)
    } catch (error) {
      if (cancelled) return

      logger.error('[EditCompensationModal] Failed to fetch compensation details:', error)
      const errorMessage = error instanceof Error ? error.message : ''
      const knownErrorKeys = Object.values(COMPENSATION_ERROR_KEYS)
      const isKnownErrorKey = knownErrorKeys.includes(errorMessage as CompensationErrorKey)
      setters.setFetchError(
        isKnownErrorKey ? t(errorMessage) : errorMessage || t('assignments.failedToLoadData')
      )
    } finally {
      if (!cancelled) {
        setters.setIsLoading(false)
      }
    }
  }

  fetchData()
  return () => {
    cancelled = true
  }
}

interface UseCompensationDataProps {
  assignment?: Assignment
  compensation?: CompensationRecord
  isOpen: boolean
  isAssignmentEdit: boolean
  compensationId: string | undefined
}

interface CompensationDataState {
  kilometers: string
  setKilometers: (value: string) => void
  reason: string
  setReason: (value: string) => void
  isLoading: boolean
  fetchError: string | null
  isDistanceEditable: boolean
  otherCompensationsAtSameHall: CompensationRecord[]
  hallName: string | undefined
}

/**
 * Hook that manages compensation data fetching and cache lookups.
 * Handles loading compensation details from various sources (demo store,
 * eager-loaded assignment data, API by game number, or API by compensation ID).
 */
export function useCompensationData({
  assignment,
  compensation,
  isOpen,
  isAssignmentEdit,
  compensationId,
}: UseCompensationDataProps): CompensationDataState {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const dataSource = useAuthStore((state) => state.dataSource)
  const getAssignmentCompensation = useDemoStore((state) => state.getAssignmentCompensation)

  const [kilometers, setKilometers] = useState('')
  const [reason, setReason] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [isDistanceEditable, setIsDistanceEditable] = useState(true)

  // Get hall information for "apply to same hall" feature
  const hallId = compensation?.refereeGame?.game?.hall?.__identity
  const hallName = compensation?.refereeGame?.game?.hall?.name

  // Find other editable compensations at the same hall (only for compensation edits, not assignment edits)
  const otherCompensationsAtSameHall = useMemo(() => {
    if (isAssignmentEdit || !isOpen) return []
    const queries = queryClient.getQueriesData<{ items: CompensationRecord[] }>({
      queryKey: queryKeys.compensations.all,
    })
    return findOtherEditableCompensationsAtSameHall(compensationId, hallId, queries)
  }, [isAssignmentEdit, isOpen, compensationId, hallId, queryClient])

  // Fetch detailed compensation data when modal opens
  useEffect(() => {
    if (!isOpen) return

    const formSetters: FormStateSetters = {
      setKilometers,
      setReason,
      setIsDistanceEditable,
      setIsLoading,
      setFetchError,
    }

    // Strategy 1: Demo mode - load from stored assignment compensations
    if (isAssignmentEdit && dataSource === 'demo' && assignment) {
      const storedData = getAssignmentCompensation(assignment.__identity)
      const hasFlexibleTravelExpenses = (
        assignment.convocationCompensation as { hasFlexibleTravelExpenses?: boolean } | undefined
      )?.hasFlexibleTravelExpenses

      // Defer state updates to avoid cascading renders (satisfies react-hooks/set-state-in-effect)
      queueMicrotask(() => {
        if (storedData) {
          if (storedData.distanceInMetres !== undefined && storedData.distanceInMetres > 0) {
            setKilometers(formatDistanceKm(storedData.distanceInMetres))
          }
          if (storedData.correctionReason) {
            setReason(storedData.correctionReason)
          }
          logger.debug('[EditCompensationModal] Loaded from demo store:', storedData)
        }
        setIsDistanceEditable(hasFlexibleTravelExpenses !== false)
      })
      return
    }

    // Strategy 2: Eager-loaded data from assignment (production/calendar mode)
    if (isAssignmentEdit && dataSource !== 'demo' && assignment) {
      const eagerData = getEagerLoadedCompensationData(assignment)
      if (eagerData) {
        // Defer state updates to avoid cascading renders (satisfies react-hooks/set-state-in-effect)
        queueMicrotask(() => {
          if (eagerData.distanceKm) {
            setKilometers(eagerData.distanceKm)
          }
          setIsDistanceEditable(eagerData.isDistanceEditable)
        })
        logger.debug(
          '[EditCompensationModal] Using eager-loaded data:',
          assignment.convocationCompensation
        )

        // Fetch correctionReason separately (only available via showWithNestedObjects)
        if (eagerData.compensationId) {
          return fetchCorrectionReasonOnly(eagerData.compensationId, dataSource, { setReason })
        }
        return
      }

      // Strategy 3: Fallback fetch by game number when no eager-loaded data
      const gameNumber = assignment.refereeGame?.game?.number
      if (!gameNumber) {
        logger.debug('[EditCompensationModal] Assignment has no game number')
        return
      }
      const queries = queryClient.getQueriesData<{ items: CompensationRecord[] }>({
        queryKey: queryKeys.compensations.all,
      })
      return fetchCompensationByGameNumber(gameNumber, dataSource, queries, formSetters, t)
    }

    // Strategy 4: Compensation record edit - fetch directly by ID
    if (!compensationId) return
    return fetchCompensationDetailsById(compensationId, dataSource, formSetters, t)
  }, [
    isOpen,
    compensationId,
    dataSource,
    isAssignmentEdit,
    assignment,
    getAssignmentCompensation,
    queryClient,
    t,
  ])

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Defer state resets to avoid cascading renders (satisfies react-hooks/set-state-in-effect)
      queueMicrotask(() => {
        setKilometers('')
        setReason('')
        setFetchError(null)
        setIsDistanceEditable(true)
      })
    }
  }, [isOpen])

  return {
    kilometers,
    setKilometers,
    reason,
    setReason,
    isLoading,
    fetchError,
    isDistanceEditable,
    otherCompensationsAtSameHall,
    hallName,
  }
}
