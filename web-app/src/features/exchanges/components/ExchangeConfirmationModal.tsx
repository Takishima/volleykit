import { memo, useActionState } from 'react'

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

  const [, submitAction, isPending] = useActionState(async (_previousState: string | null) => {
    try {
      await onConfirm()
      onClose()
      return null
    } catch (err) {
      logger.error('[ExchangeConfirmationModal] Failed to confirm action:', err)
      return 'error'
    }
  }, null)

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

          <form action={submitAction}>
            <ModalFooter>
              <Button
                variant="secondary"
                className="flex-1"
                type="button"
                onClick={onClose}
                disabled={isPending}
              >
                {t('common.cancel')}
              </Button>
              <Button
                variant={confirmVariant}
                className="flex-1"
                type="submit"
                disabled={isPending}
                aria-busy={isPending}
              >
                {isPending ? t('common.loading') : t(buttonKey)}
              </Button>
            </ModalFooter>
          </form>
        </div>
      </ModalErrorBoundary>
    </Modal>
  )
}

export const ExchangeConfirmationModal = memo(ExchangeConfirmationModalComponent)
