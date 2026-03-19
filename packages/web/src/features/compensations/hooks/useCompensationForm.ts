import { useState, useCallback, useEffect } from 'react'

import type { Assignment, CompensationRecord } from '@/api/client'
import { useTranslation } from '@/shared/hooks/useTranslation'
import { toast } from '@/shared/stores/toast'
import { kilometresToMetres, parseLocalizedNumber } from '@/shared/utils/distance'
import { logger } from '@/shared/utils/logger'

import { useCompensationData } from './useCompensationData'
import {
  useBatchUpdateCompensations,
  useUpdateCompensation,
  useUpdateAssignmentCompensation,
  type BatchUpdateResult,
} from './useCompensations'

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
  const updateCompensationMutation = useUpdateCompensation()
  const updateAssignmentCompensationMutation = useUpdateAssignmentCompensation()
  const batchUpdateMutation = useBatchUpdateCompensations()

  // Determine if we're editing an assignment or a compensation record
  const isAssignmentEdit = !!assignment && !compensation

  // Get the compensation ID from the compensation record or assignment
  // Assignments now include eager-loaded convocationCompensation data
  const compensationId =
    compensation?.convocationCompensation?.__identity ||
    assignment?.convocationCompensation?.__identity

  // Delegate data fetching and cache lookups to the data hook
  const {
    kilometers,
    setKilometers,
    reason,
    setReason,
    isLoading,
    fetchError,
    isDistanceEditable,
    otherCompensationsAtSameHall,
    hallName,
  } = useCompensationData({
    assignment,
    compensation,
    isOpen,
    isAssignmentEdit,
    compensationId,
  })

  const [errors, setErrors] = useState<{ kilometers?: string }>({})
  const [applyToSameHall, setApplyToSameHall] = useState(false)

  // Track saving state to disable buttons during save
  const isSaving =
    updateCompensationMutation.isPending ||
    updateAssignmentCompensationMutation.isPending ||
    batchUpdateMutation.isPending

  // Reset form-only state when modal closes
  useEffect(() => {
    if (!isOpen) {
      queueMicrotask(() => {
        setErrors({})
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
