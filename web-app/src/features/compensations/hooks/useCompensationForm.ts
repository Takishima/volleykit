import { useState, useCallback, useEffect, useMemo } from 'react'

import { useQueryClient } from '@tanstack/react-query'

import { getApiClient } from '@/api/client'
import type { Assignment, CompensationRecord } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import { COMPENSATION_LOOKUP_LIMIT } from '@/shared/hooks/usePaginatedQuery'
import { useTranslation } from '@/shared/hooks/useTranslation'
import { useAuthStore, type DataSource } from '@/shared/stores/auth'
import { useDemoStore } from '@/shared/stores/demo'
import { toast } from '@/shared/stores/toast'
import { formatDistanceKm, kilometresToMetres, parseLocalizedNumber } from '@/shared/utils/distance'
import { logger } from '@/shared/utils/logger'

import {
  useBatchUpdateCompensations,
  useUpdateCompensation,
  useUpdateAssignmentCompensation,
  COMPENSATION_ERROR_KEYS,
  type CompensationErrorKey,
  type BatchUpdateResult,
} from './useCompensations'
import { isCompensationEditable } from '../utils/compensation-actions'

/** State setters interface for data fetching helpers */
interface FormStateSetters {
  setKilometers: (value: string) => void
  setReason: (value: string) => void
  setIsDistanceEditable: (value: boolean) => void
  setIsLoading: (value: boolean) => void
  setFetchError: (value: string | null) => void
}

/**
 * Searches cached compensation queries to find a compensation matching the game number.
 */
function findCompensationInCache(
  gameNumber: string | number,
  queryClient: ReturnType<typeof useQueryClient>
): CompensationRecord | null {
  const queries = queryClient.getQueriesData<{ items: CompensationRecord[] }>({
    queryKey: queryKeys.compensations.all,
  })

  for (const [, data] of queries) {
    // Compare as strings to handle both string and number game numbers from different sources
    const comp = data?.items?.find(
      (c) => String(c.refereeGame?.game?.number) === String(gameNumber)
    )
    if (comp) {
      return comp
    }
  }
  return null
}

/**
 * Finds all editable compensations in cache that are at the same hall.
 * Excludes the current compensation from the results.
 */
function findOtherEditableCompensationsAtSameHall(
  currentCompensationId: string | undefined,
  hallId: string | undefined,
  queryClient: ReturnType<typeof useQueryClient>
): CompensationRecord[] {
  if (!hallId || !currentCompensationId) return []

  const queries = queryClient.getQueriesData<{ items: CompensationRecord[] }>({
    queryKey: queryKeys.compensations.all,
  })

  const results: CompensationRecord[] = []
  const seenIds = new Set<string>()

  for (const [, data] of queries) {
    if (!data?.items) continue
    for (const comp of data.items) {
      const compId = comp.convocationCompensation?.__identity
      const compHallId = comp.refereeGame?.game?.hall?.__identity

      // Skip current compensation, already seen, or different hall
      if (!compId || compId === currentCompensationId || seenIds.has(compId)) continue
      if (compHallId !== hallId) continue

      // Only include if editable
      if (isCompensationEditable(comp)) {
        seenIds.add(compId)
        results.push(comp)
      }
    }
  }

  return results
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
  queryClient: ReturnType<typeof useQueryClient>,
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
      let foundCompensationId = findCompensationInCache(gameNumber, queryClient)
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

interface UseCompensationFormProps {
  assignment?: Assignment
  compensation?: CompensationRecord
  isOpen: boolean
  onClose: () => void
}

export interface CompensationFormState {
  kilometers: string
  setKilometers: (value: string) => void
  reason: string
  setReason: (value: string) => void
  errors: { kilometers?: string }
  isLoading: boolean
  fetchError: string | null
  isDistanceEditable: boolean
  isSaving: boolean
  isAssignmentEdit: boolean
  applyToSameHall: boolean
  setApplyToSameHall: (value: boolean) => void
  otherCompensationsAtSameHall: CompensationRecord[]
  hallName: string | undefined
  handleSubmit: (e: React.FormEvent) => void
}

/**
 * Hook that encapsulates all form state management, validation, data fetching,
 * and mutation logic for the EditCompensationModal.
 */
export function useCompensationForm({
  assignment,
  compensation,
  isOpen,
  onClose,
}: UseCompensationFormProps): CompensationFormState {
  const { t, tInterpolate } = useTranslation()
  const queryClient = useQueryClient()
  const dataSource = useAuthStore((state) => state.dataSource)
  const getAssignmentCompensation = useDemoStore((state) => state.getAssignmentCompensation)
  const updateCompensationMutation = useUpdateCompensation()
  const updateAssignmentCompensationMutation = useUpdateAssignmentCompensation()
  const batchUpdateMutation = useBatchUpdateCompensations()

  const [kilometers, setKilometers] = useState('')
  const [reason, setReason] = useState('')
  const [errors, setErrors] = useState<{ kilometers?: string }>({})
  const [isLoading, setIsLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [isDistanceEditable, setIsDistanceEditable] = useState(true)
  const [applyToSameHall, setApplyToSameHall] = useState(false)

  // Determine if we're editing an assignment or a compensation record
  const isAssignmentEdit = !!assignment && !compensation

  // Track saving state to disable buttons during save
  const isSaving =
    updateCompensationMutation.isPending ||
    updateAssignmentCompensationMutation.isPending ||
    batchUpdateMutation.isPending

  // Get the compensation ID from the compensation record or assignment
  // Assignments now include eager-loaded convocationCompensation data
  const compensationId =
    compensation?.convocationCompensation?.__identity ||
    assignment?.convocationCompensation?.__identity

  // Get hall information for "apply to same hall" feature
  const hallId = compensation?.refereeGame?.game?.hall?.__identity
  const hallName = compensation?.refereeGame?.game?.hall?.name

  // Find other editable compensations at the same hall (only for compensation edits, not assignment edits)
  const otherCompensationsAtSameHall = useMemo(() => {
    if (isAssignmentEdit || !isOpen) return []
    return findOtherEditableCompensationsAtSameHall(compensationId, hallId, queryClient)
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
      return fetchCompensationByGameNumber(gameNumber, dataSource, queryClient, formSetters, t)
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
        setErrors({})
        setFetchError(null)
        setIsDistanceEditable(true)
        setApplyToSameHall(false)
      })
    }
  }, [isOpen])

  /**
   * Shows appropriate toast message based on batch update result.
   */
  const showBatchUpdateToast = useCallback(
    (result: BatchUpdateResult) => {
      const totalUpdated = 1 + result.successCount
      if (result.failedCount === 0) {
        toast.success(
          tInterpolate('compensations.batchUpdateSuccess', { count: String(totalUpdated) })
        )
      } else {
        toast.warning(
          tInterpolate('compensations.batchUpdatePartialSuccess', {
            success: String(totalUpdated),
            total: String(1 + result.totalCount),
            failed: String(result.failedCount),
          })
        )
      }
    },
    [tInterpolate]
  )

  /**
   * Triggers batch update for other compensations at the same hall.
   */
  const triggerBatchUpdate = useCallback(
    (distanceInMetres: number) => {
      const otherIds = otherCompensationsAtSameHall
        .map((c) => c.convocationCompensation?.__identity)
        .filter((id): id is string => !!id)

      batchUpdateMutation.mutate(
        { compensationIds: otherIds, data: { distanceInMetres } },
        {
          onSuccess: (result) => {
            showBatchUpdateToast(result)
            onClose()
          },
          onError: (error) => {
            logger.error('[EditCompensationModal] Batch update failed:', error)
            toast.warning(
              tInterpolate('compensations.batchUpdatePartialSuccess', {
                success: '1',
                total: String(1 + otherIds.length),
                failed: String(otherIds.length),
              })
            )
            onClose()
          },
        }
      )
    },
    [batchUpdateMutation, otherCompensationsAtSameHall, showBatchUpdateToast, onClose, tInterpolate]
  )

  /**
   * Handles successful compensation update, optionally triggering batch update.
   */
  const handleCompensationSuccess = useCallback(
    (updateData: { distanceInMetres?: number }) => {
      if (
        applyToSameHall &&
        updateData.distanceInMetres &&
        otherCompensationsAtSameHall.length > 0
      ) {
        triggerBatchUpdate(updateData.distanceInMetres)
      } else {
        toast.success(t('compensations.saveSuccess'))
        onClose()
      }
    },
    [applyToSameHall, otherCompensationsAtSameHall.length, triggerBatchUpdate, onClose, t]
  )

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      setErrors({})

      const km = parseLocalizedNumber(kilometers)
      if (kilometers && (isNaN(km) || km < 0)) {
        setErrors({ kilometers: t('assignments.invalidKilometers') })
        return
      }

      const updateData: { distanceInMetres?: number; correctionReason?: string } = {}
      if (kilometers) updateData.distanceInMetres = kilometresToMetres(km)
      if (reason) updateData.correctionReason = reason

      if (Object.keys(updateData).length === 0) {
        onClose()
        return
      }

      if (isAssignmentEdit && assignment) {
        updateAssignmentCompensationMutation.mutate(
          { assignmentId: assignment.__identity, data: updateData },
          {
            onSuccess: () => {
              logger.debug('[EditCompensationModal] Updated assignment compensation')
              toast.success(t('compensations.saveSuccess'))
              onClose()
            },
            onError: (error) => {
              logger.error(
                '[EditCompensationModal] Failed to update assignment compensation:',
                error
              )
              toast.error(t('compensations.saveError'))
            },
          }
        )
      } else if (compensationId) {
        updateCompensationMutation.mutate(
          { compensationId, data: updateData },
          {
            onSuccess: () => {
              logger.debug('[EditCompensationModal] Updated compensation')
              handleCompensationSuccess(updateData)
            },
            onError: (error) => {
              logger.error('[EditCompensationModal] Failed to update compensation:', error)
              toast.error(t('compensations.saveError'))
            },
          }
        )
      }
    },
    [
      assignment,
      compensationId,
      kilometers,
      reason,
      isAssignmentEdit,
      updateAssignmentCompensationMutation,
      updateCompensationMutation,
      handleCompensationSuccess,
      onClose,
      t,
    ]
  )

  return {
    kilometers,
    setKilometers,
    reason,
    setReason,
    errors,
    isLoading,
    fetchError,
    isDistanceEditable,
    isSaving,
    isAssignmentEdit,
    applyToSameHall,
    setApplyToSameHall,
    otherCompensationsAtSameHall,
    hallName,
    handleSubmit,
  }
}
