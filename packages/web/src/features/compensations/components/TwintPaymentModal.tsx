import { Smartphone } from '@/common/components/icons'
import { Modal } from '@/common/components/Modal'
import { ModalHeader } from '@/common/components/ModalHeader'
import { useTranslation } from '@/common/hooks/useTranslation'

import { formatPhoneNumber } from '../utils/phone-formatter'

interface TwintPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  firstName: string
  lastName: string
  mobilePhone: string | null
}

export function TwintPaymentModal({
  isOpen,
  onClose,
  firstName,
  lastName,
  mobilePhone,
}: TwintPaymentModalProps) {
  const { t } = useTranslation()

  return (
    <Modal isOpen={isOpen} onClose={onClose} titleId="twint-payment-title" size="sm">
      <ModalHeader
        title={t('compensations.twintModalTitle')}
        titleId="twint-payment-title"
        icon={
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-pink-100 dark:bg-pink-900 flex items-center justify-center">
            <Smartphone className="w-5 h-5 text-pink-600 dark:text-pink-400" aria-hidden="true" />
          </div>
        }
        onClose={onClose}
      />

      <div className="space-y-4">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-text-muted dark:text-text-muted-dark mb-1">
            {t('compensations.twintModalName')}
          </div>
          <div className="text-base font-semibold text-text-primary dark:text-text-primary-dark">
            {firstName} {lastName}
          </div>
        </div>

        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-text-muted dark:text-text-muted-dark mb-1">
            {t('compensations.twintModalPhone')}
          </div>
          {mobilePhone ? (
            <div className="text-base font-semibold text-text-primary dark:text-text-primary-dark">
              {formatPhoneNumber(mobilePhone)}
            </div>
          ) : (
            <div className="text-sm text-text-muted dark:text-text-muted-dark italic">
              {t('compensations.twintNoPhone')}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

