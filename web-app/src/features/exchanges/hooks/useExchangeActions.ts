import { useCallback } from 'react'

import type { GameExchange } from '@/api/client'
import { getConvocationIdFromExchange } from '@/features/exchanges/utils/exchange-actions'
import {
  useApplyForExchange,
  useRemoveOwnExchange,
} from '@/features/validation/hooks/useConvocations'
import { useModalState } from '@/shared/hooks/useModalState'
import { useSafeMutation } from '@/shared/hooks/useSafeMutation'

interface UseExchangeActionsResult {
  takeOverModal: {
    isOpen: boolean
    exchange: GameExchange | null
    open: (exchange: GameExchange) => void
    close: () => void
  }
  removeFromExchangeModal: {
    isOpen: boolean
    exchange: GameExchange | null
    open: (exchange: GameExchange) => void
    close: () => void
  }
  handleTakeOver: (exchange: GameExchange) => Promise<void>
  handleRemoveFromExchange: (exchange: GameExchange) => Promise<void>
}

export function useExchangeActions(): UseExchangeActionsResult {
  const takeOverModal = useModalState<GameExchange>()
  const removeFromExchangeModal = useModalState<GameExchange>()

  const applyMutation = useApplyForExchange()
  const removeOwnMutation = useRemoveOwnExchange()

  const takeOverMutation = useSafeMutation(
    async (exchange: GameExchange, log) => {
      await applyMutation.mutateAsync(exchange.__identity)
      log.debug('Successfully applied for exchange:', exchange.__identity)
    },
    {
      logContext: 'useExchangeActions',
      successMessage: 'exchange.applySuccess',
      errorMessage: 'exchange.applyError',
      safeGuard: { context: 'useExchangeActions', action: 'taking exchange' },
      skipSuccessToastInDemoMode: true,
      onSuccess: () => takeOverModal.close(),
    }
  )

  const removeOwnSafeMutation = useSafeMutation(
    async (exchange: GameExchange, log) => {
      const convocationId = getConvocationIdFromExchange(exchange)
      if (!convocationId) {
        throw new Error('Could not find convocation ID for this exchange')
      }
      await removeOwnMutation.mutateAsync(convocationId)
      log.debug('Successfully removed own exchange, convocation:', convocationId)
    },
    {
      logContext: 'useExchangeActions',
      successMessage: 'exchange.removeSuccess',
      errorMessage: 'exchange.removeError',
      safeGuard: {
        context: 'useExchangeActions',
        action: 'removing own exchange',
      },
      skipSuccessToastInDemoMode: true,
      onSuccess: () => removeFromExchangeModal.close(),
    }
  )

  const handleTakeOver = useCallback(
    async (exchange: GameExchange) => {
      await takeOverMutation.execute(exchange)
    },
    [takeOverMutation]
  )

  const handleRemoveFromExchange = useCallback(
    async (exchange: GameExchange) => {
      // Remove own exchange using deleteFromRefereeGameExchange with convocation ID
      await removeOwnSafeMutation.execute(exchange)
    },
    [removeOwnSafeMutation]
  )

  return {
    takeOverModal: {
      isOpen: takeOverModal.isOpen,
      exchange: takeOverModal.data,
      open: takeOverModal.open,
      close: takeOverModal.close,
    },
    removeFromExchangeModal: {
      isOpen: removeFromExchangeModal.isOpen,
      exchange: removeFromExchangeModal.data,
      open: removeFromExchangeModal.open,
      close: removeFromExchangeModal.close,
    },
    handleTakeOver,
    handleRemoveFromExchange,
  }
}
