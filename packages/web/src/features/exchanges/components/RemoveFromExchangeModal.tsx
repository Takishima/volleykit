import type { GameExchange } from '@/api/client'

import { ExchangeConfirmationModal } from './ExchangeConfirmationModal'

interface RemoveFromExchangeModalProps {
  exchange: GameExchange
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
}

export function RemoveFromExchangeModal(props: RemoveFromExchangeModalProps) {
  return <ExchangeConfirmationModal {...props} variant="remove" />
}
