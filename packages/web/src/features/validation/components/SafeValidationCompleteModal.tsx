import { useCallback, useRef } from 'react'

import { Button } from '@/shared/components/Button'
import { Modal } from '@/shared/components/Modal'
import { ModalFooter } from '@/shared/components/ModalFooter'
import { ModalHeader } from '@/shared/components/ModalHeader'
import { useTranslation } from '@/shared/hooks/useTranslation'

const MODAL_TITLE_ID = 'safe-validation-complete-title'
const VOLLEYMANAGER_URL = 'https://volleymanager.volleyball.ch'

interface SafeValidationCompleteModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SafeValidationCompleteModal({ isOpen, onClose }: SafeValidationCompleteModalProps) {
  const { t } = useTranslation()
  const isOpeningRef = useRef(false)

  const handleOpenVolleyManager = useCallback(() => {
    if (isOpeningRef.current) return
    isOpeningRef.current = true
    try {
      window.open(VOLLEYMANAGER_URL, '_blank', 'noopener,noreferrer')
      onClose()
    } finally {
      isOpeningRef.current = false
    }
  }, [onClose])

  const successIcon = (
    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-success-100 dark:bg-success-900 flex items-center justify-center">
      <svg
        className="w-6 h-6 text-success-600 dark:text-success-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    </div>
  )

  return (
    <Modal isOpen={isOpen} onClose={onClose} titleId={MODAL_TITLE_ID} size="md">
      <ModalHeader
        title={t('settings.safeValidationCompleteTitle')}
        titleId={MODAL_TITLE_ID}
        icon={successIcon}
      />

      <div className="mb-6">
        <p className="text-sm text-text-secondary dark:text-text-secondary-dark">
          {t('settings.safeValidationCompleteMessage')}
        </p>
      </div>

      <ModalFooter divider>
        <Button variant="secondary" className="flex-1 rounded-md" onClick={onClose}>
          {t('common.close')}
        </Button>
        <Button variant="primary" className="flex-1 rounded-md" onClick={handleOpenVolleyManager}>
          {t('settings.safeValidationCompleteButton')}
        </Button>
      </ModalFooter>
    </Modal>
  )
}
