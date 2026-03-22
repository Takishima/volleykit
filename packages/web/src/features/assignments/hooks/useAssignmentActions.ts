import { useCallback } from 'react'

import { useQueryClient } from '@tanstack/react-query'

import type { Assignment } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import { useModalState } from '@/common/hooks/useModalState'
import { useSafeModeGuard } from '@/common/hooks/useSafeModeGuard'
import { useTranslation } from '@/common/hooks/useTranslation'
import { useDemoStore } from '@/common/stores/demo'
import { useLanguageStore } from '@/common/stores/language'
import { toast } from '@/common/stores/toast'
import { createLogger } from '@/common/utils/logger'
import { useAddToExchange } from '@/features/exchanges/hooks/useExchanges'

import {
  getTeamNames,
  isGameReportEligible,
  isGameAlreadyValidated,
} from '../utils/assignment-helpers'

const log = createLogger('useAssignmentActions')

type PdfLanguage = 'de' | 'fr'

function mapLocaleToPdfLanguage(appLocale: string): PdfLanguage {
  return appLocale === 'fr' || appLocale === 'it' ? 'fr' : 'de'
}

interface UseAssignmentActionsResult {
  editCompensationModal: {
    isOpen: boolean
    assignment: Assignment | null
    open: (assignment: Assignment) => void
    close: () => void
  }
  validateGameModal: {
    isOpen: boolean
    assignment: Assignment | null
    open: (assignment: Assignment) => void
    close: () => void
  }
  pdfReportModal: {
    isOpen: boolean
    assignment: Assignment | null
    defaultLanguage: PdfLanguage
    open: (assignment: Assignment) => void
    close: () => void
  }
  handleGenerateReport: (assignment: Assignment) => void
  handleAddToExchange: (assignment: Assignment) => void
}

export function useAssignmentActions(): UseAssignmentActionsResult {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { guard, isDemoMode } = useSafeModeGuard()
  const locale = useLanguageStore((state) => state.locale)
  const addAssignmentToExchange = useDemoStore((state) => state.addAssignmentToExchange)
  const addToExchangeMutation = useAddToExchange()

  const editCompensationModal = useModalState<Assignment>()
  const validateGameModal = useModalState<Assignment>()
  const pdfReportModal = useModalState<Assignment>()

  const openValidateGame = useCallback(
    (assignment: Assignment) => {
      // Safe mode no longer blocks opening the validation modal.
      // Instead, when in safe mode, the modal shows a "Dismiss" button
      // that closes without making any API calls, allowing users to
      // preview the validation workflow without modifying data.
      validateGameModal.open(assignment)
    },
    [validateGameModal]
  )

  const openPdfReport = useCallback(
    (assignment: Assignment) => {
      if (!isGameReportEligible(assignment)) {
        log.debug('Game report not available for this league')
        toast.info(t('assignments.gameReportNotAvailable'))
        return
      }

      pdfReportModal.open(assignment)
    },
    [t, pdfReportModal]
  )

  const handleGenerateReport = useCallback(
    (assignment: Assignment) => {
      openPdfReport(assignment)
    },
    [openPdfReport]
  )

  const handleAddToExchange = useCallback(
    (assignment: Assignment) => {
      const { homeTeam, awayTeam } = getTeamNames(assignment)

      // Prevent adding validated games to exchange
      if (isGameAlreadyValidated(assignment)) {
        log.debug('Cannot add validated game to exchange:', assignment.__identity)
        toast.error(t('exchange.cannotExchangeValidatedGame'))
        return
      }

      if (
        guard({
          context: 'useAssignmentActions',
          action: 'adding to exchange',
        })
      ) {
        return
      }

      if (isDemoMode) {
        addAssignmentToExchange(assignment.__identity)
        // Invalidate exchanges query so the new exchange appears immediately
        queryClient.invalidateQueries({ queryKey: queryKeys.exchanges.lists() })
        // Also invalidate assignments since isOpenEntryInRefereeGameExchange changes
        queryClient.invalidateQueries({ queryKey: queryKeys.assignments.lists() })
        log.debug('Demo mode: added assignment to exchange:', assignment.__identity)
        toast.success(t('exchange.addedToExchangeSuccess'))
        return
      }

      // Use real API to add assignment to exchange
      log.debug('Adding to exchange:', {
        assignmentId: assignment.__identity,
        game: `${homeTeam} vs ${awayTeam}`,
      })

      addToExchangeMutation
        .mutateAsync(assignment.__identity)
        .then(() => {
          log.debug('Successfully added to exchange:', assignment.__identity)
          if (addToExchangeMutation.wasQueued) {
            toast.success(t('exchange.addedToExchangeQueued'))
          } else {
            toast.success(t('exchange.addedToExchangeSuccess'))
          }
        })
        .catch((error: Error) => {
          log.error('Failed to add to exchange:', error)
          toast.error(t('exchange.addedToExchangeError'))
        })
    },
    [guard, isDemoMode, addAssignmentToExchange, queryClient, t, addToExchangeMutation]
  )

  return {
    editCompensationModal: {
      isOpen: editCompensationModal.isOpen,
      assignment: editCompensationModal.data,
      open: editCompensationModal.open,
      close: editCompensationModal.close,
    },
    validateGameModal: {
      isOpen: validateGameModal.isOpen,
      assignment: validateGameModal.data,
      open: openValidateGame,
      close: validateGameModal.close,
    },
    pdfReportModal: {
      isOpen: pdfReportModal.isOpen,
      assignment: pdfReportModal.data,
      defaultLanguage: mapLocaleToPdfLanguage(locale),
      open: openPdfReport,
      close: pdfReportModal.close,
    },
    handleGenerateReport,
    handleAddToExchange,
  }
}
