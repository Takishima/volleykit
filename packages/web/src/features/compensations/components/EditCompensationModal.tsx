import { memo } from 'react'

import { getTeamNames, getTeamNamesFromCompensation } from '@volleykit/shared/utils'

import type { Assignment, CompensationRecord } from '@/api/client'
import { Button } from '@/shared/components/Button'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'
import { Modal } from '@/shared/components/Modal'
import { ModalErrorBoundary } from '@/shared/components/ModalErrorBoundary'
import { ModalHeader } from '@/shared/components/ModalHeader'
import { useTranslation } from '@/shared/hooks/useTranslation'
import { logger } from '@/shared/utils/logger'

import { CompensationForm } from './CompensationForm'
import { useCompensationForm } from '../hooks/useCompensationForm'

interface EditCompensationModalProps {
  assignment?: Assignment
  compensation?: CompensationRecord
  isOpen: boolean
  onClose: () => void
}

function EditCompensationModalComponent({
  assignment,
  compensation,
  isOpen,
  onClose,
}: EditCompensationModalProps) {
  const { t } = useTranslation()

  const form = useCompensationForm({
    assignment,
    compensation,
    isOpen,
    onClose,
  })

  // Type safety: Ensure at least one of assignment or compensation is provided
  if (isOpen && !assignment && !compensation) {
    logger.error('[EditCompensationModal] Modal opened without assignment or compensation')
    return null
  }

  let homeTeam = t('common.tbd')
  let awayTeam = t('common.tbd')

  if (assignment) {
    ;({ homeTeam, awayTeam } = getTeamNames(assignment))
  } else if (compensation) {
    ;({ homeTeam, awayTeam } = getTeamNamesFromCompensation(compensation))
  }

  const modalTitleId = 'edit-compensation-title'
  const subtitle = `${homeTeam} ${t('common.vs')} ${awayTeam}`

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      titleId={modalTitleId}
      size="md"
      isLoading={form.isLoading}
    >
      <ModalErrorBoundary modalName="EditCompensationModal" onClose={onClose}>
        <ModalHeader
          title={t('assignments.editCompensation')}
          titleId={modalTitleId}
          subtitle={subtitle}
        />

        {form.isLoading ? (
          <div className="flex items-center justify-center py-8" role="status" aria-live="polite">
            <LoadingSpinner size="md" />
          </div>
        ) : form.fetchError ? (
          <div className="py-6 text-center" role="alert">
            <p className="text-danger-600 dark:text-danger-400 mb-4">{form.fetchError}</p>
            <Button variant="secondary" onClick={onClose}>
              {t('common.close')}
            </Button>
          </div>
        ) : (
          <CompensationForm form={form} onClose={onClose} />
        )}
      </ModalErrorBoundary>
    </Modal>
  )
}

export const EditCompensationModal = memo(EditCompensationModalComponent)
