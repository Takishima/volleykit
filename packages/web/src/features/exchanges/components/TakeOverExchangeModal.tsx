import type { GameExchange } from '@/api/client'

import { ExchangeConfirmationModal } from './ExchangeConfirmationModal'

interface TakeOverExchangeModalProps {
  exchange: GameExchange
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
}

export function TakeOverExchangeModal(props: TakeOverExchangeModalProps) {
  return <ExchangeConfirmationModal {...props} variant="takeOver" />
}
