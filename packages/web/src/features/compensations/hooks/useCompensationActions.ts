import { useCallback } from 'react'

import type { CompensationRecord } from '@/api/client'
import { useModalState } from '@/common/hooks/useModalState'
import { useSafeMutation } from '@/common/hooks/useSafeMutation'
import { useTranslation } from '@/common/hooks/useTranslation'
import { useAuthStore } from '@/common/stores/auth'
import { toast } from '@/common/stores/toast'

import { useIndoorRefereeProfile } from './useIndoorRefereeProfile'
import { downloadCompensationPDF } from '../utils/compensation-actions'

interface UseCompensationActionsResult {
  editCompensationModal: {
    isOpen: boolean
    compensation: CompensationRecord | null
    open: (compensation: CompensationRecord) => void
    close: () => void
  }
  handleGeneratePDF: (compensation: CompensationRecord) => Promise<void>
  twintModal: {
    isOpen: boolean
    open: () => void
    close: () => void
  }
  twintProfile: {
    firstName: string
    lastName: string
    mobilePhone: string | null
  }
  showTwintAction: boolean
}

export function useCompensationActions(): UseCompensationActionsResult {
  const { t } = useTranslation()
  const isDemoMode = useAuthStore((state) => state.dataSource) === 'demo'
  const user = useAuthStore((state) => state.user)
  const editCompensationModal = useModalState<CompensationRecord>()
  const twintModalState = useModalState<true>()

  const { showTwintAction, mobilePhone } = useIndoorRefereeProfile()

  const pdfMutation = useSafeMutation(
    async (compensation: CompensationRecord, log) => {
      log.debug('Generating PDF for:', compensation.__identity)
      await downloadCompensationPDF(compensation.__identity)
      log.debug('PDF downloaded successfully:', compensation.__identity)
    },
    {
      logContext: 'useCompensationActions',
      errorMessage: 'compensations.pdfDownloadFailed',
    }
  )

  const openEditCompensation = useCallback(
    (compensation: CompensationRecord) => {
      editCompensationModal.open(compensation)
    },
    [editCompensationModal]
  )

  const handleGeneratePDF = useCallback(
    async (compensation: CompensationRecord) => {
      // Demo mode blocks PDF download (requires real API)
      if (isDemoMode) {
        toast.info(t('compensations.pdfNotAvailableDemo'))
        return
      }

      await pdfMutation.execute(compensation)
    },
    [isDemoMode, t, pdfMutation]
  )

  const openTwintModal = useCallback(() => {
    twintModalState.open(true)
  }, [twintModalState])

  return {
    editCompensationModal: {
      isOpen: editCompensationModal.isOpen,
      compensation: editCompensationModal.data,
      open: openEditCompensation,
      close: editCompensationModal.close,
    },
    handleGeneratePDF,
    twintModal: {
      isOpen: twintModalState.isOpen,
      open: openTwintModal,
      close: twintModalState.close,
    },
    twintProfile: {
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      mobilePhone,
    },
    showTwintAction,
  }
}
