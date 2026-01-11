import { useCallback, useEffect, useRef, useState, memo } from 'react'

import type { GameExchange } from '@/api/client'
import { Button } from '@/shared/components/Button'
import { Modal } from '@/shared/components/Modal'
import { ModalErrorBoundary } from '@/shared/components/ModalErrorBoundary'
import { ModalFooter } from '@/shared/components/ModalFooter'
import { ModalHeader } from '@/shared/components/ModalHeader'
import { useTranslation } from '@/shared/hooks/useTranslation'
import { formatDateTime } from '@/shared/utils/date-helpers'
import { logger } from '@/shared/utils/logger'

interface ExchangeConfirmationModalProps {
  exchange: GameExchange
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  variant: 'takeOver' | 'remove'
}

function ExchangeConfirmationModalComponent({
  exchange,
  isOpen,
  onClose,
  onConfirm,
  variant,
}: ExchangeConfirmationModalProps) {
  const { t } = useTranslation()

  const isSubmittingRef = useRef(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const ignoreRef = useRef(false)

  useEffect(() => {
    ignoreRef.current = false
    return () => {
      ignoreRef.current = true
    }
  }, [])

  const handleConfirm = useCallback(async () => {
    if (isSubmittingRef.current) return
    isSubmittingRef.current = true
    setIsSubmitting(true)

    try {
      await onConfirm()
    } catch (error) {
      logger.error('[ExchangeConfirmationModal] Failed to confirm action:', error)
      if (!ignoreRef.current) {
        isSubmittingRef.current = false
        setIsSubmitting(false)
      }
      return
    }

    if (!ignoreRef.current) {
      isSubmittingRef.current = false
      setIsSubmitting(false)
      onClose()
    }
  }, [onConfirm, onClose])

  const game = exchange.refereeGame?.game
  const homeTeam = game?.encounter?.teamHome?.name || t('common.tbd')
  const awayTeam = game?.encounter?.teamAway?.name || t('common.tbd')
  const position = exchange.refereePosition
  const level = exchange.requiredRefereeLevel
  const location = game?.hall?.name || game?.hall?.primaryPostalAddress?.city
  const dateTime = game?.startingDateTime

  const titleKey = variant === 'takeOver' ? 'exchange.takeOverTitle' : 'exchange.removeTitle'
  const confirmKey = variant === 'takeOver' ? 'exchange.takeOverConfirm' : 'exchange.removeConfirm'
  const buttonKey = variant === 'takeOver' ? 'exchange.takeOverButton' : 'exchange.removeButton'
  const confirmVariant = variant === 'takeOver' ? 'success' : 'danger'
  const modalTitleId = `${variant}-exchange-title`

  return (
    <Modal isOpen={isOpen} onClose={onClose} titleId={modalTitleId} size="md">
      <ModalErrorBoundary modalName="ExchangeConfirmationModal" onClose={onClose}>
        <ModalHeader title={t(titleKey)} titleId={modalTitleId} />

        <div className="mb-6 space-y-3">
          <div>
            <div className="text-sm font-medium text-text-muted dark:text-text-muted-dark">
              {t('common.match')}
            </div>
            <div className="text-base text-text-primary dark:text-text-primary-dark font-medium">
              {homeTeam} {t('common.vs')} {awayTeam}
            </div>
          </div>

          {dateTime && (
            <div>
              <div className="text-sm font-medium text-text-muted dark:text-text-muted-dark">
                {t('common.dateTime')}
              </div>
              <div className="text-base text-text-primary dark:text-text-primary-dark">
                {formatDateTime(dateTime)}
              </div>
            </div>
          )}

          {location && (
            <div>
              <div className="text-sm font-medium text-text-muted dark:text-text-muted-dark">
                {t('common.location')}
              </div>
              <div className="text-base text-text-primary dark:text-text-primary-dark">
                {location}
              </div>
            </div>
          )}

          {position && (
            <div>
              <div className="text-sm font-medium text-text-muted dark:text-text-muted-dark">
                {t('common.position')}
              </div>
              <div className="text-base text-text-primary dark:text-text-primary-dark">
                {position}
              </div>
            </div>
          )}

          {level && (
            <div>
              <div className="text-sm font-medium text-text-muted dark:text-text-muted-dark">
                {t('common.requiredLevel')}
              </div>
              <div className="text-base text-text-primary dark:text-text-primary-dark">{level}</div>
            </div>
          )}
        </div>

        <div className="border-t border-border-default dark:border-border-default-dark pt-4">
          <p className="text-sm text-text-muted dark:text-text-muted-dark mb-4">{t(confirmKey)}</p>

          <ModalFooter>
            <Button
              variant="secondary"
              className="flex-1"
              onClick={onClose}
              disabled={isSubmitting}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant={confirmVariant}
              className="flex-1"
              onClick={handleConfirm}
              disabled={isSubmitting}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? t('common.loading') : t(buttonKey)}
            </Button>
          </ModalFooter>
        </div>
      </ModalErrorBoundary>
    </Modal>
  )
}

export const ExchangeConfirmationModal = memo(ExchangeConfirmationModalComponent)
