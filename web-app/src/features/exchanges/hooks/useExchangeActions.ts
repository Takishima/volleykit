import { useCallback } from 'react'

import { useQueryClient } from '@tanstack/react-query'

import { getApiClient, type GameExchange } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import { useModalState } from '@/shared/hooks/useModalState'
import { useOfflineMutation } from '@/shared/hooks/useOfflineMutation'
import { useAuthStore } from '@/shared/stores/auth'

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
  const queryClient = useQueryClient()
  const dataSource = useAuthStore((state) => state.dataSource)
  const apiClient = getApiClient(dataSource)

  const takeOverMutation = useOfflineMutation(
    async (exchange: GameExchange, log) => {
      await apiClient.applyForExchange(exchange.__identity)
      log.debug('Successfully applied for exchange:', exchange.__identity)
      queryClient.invalidateQueries({ queryKey: queryKeys.exchanges.lists() })
    },
    {
      logContext: 'useExchangeActions',
      mutationType: 'applyForExchange',
      getEntityId: (exchange) => exchange.__identity,
      getDisplayLabel: (exchange) =>
        exchange.refereeGame?.game?.encounter?.teamHome?.name
          ? `${exchange.refereeGame.game.encounter.teamHome.name} vs ${exchange.refereeGame.game.encounter?.teamAway?.name ?? '?'}`
          : 'Take over game',
      getEntityLabel: (exchange) => exchange.refereeGame?.game?.startingDateTime,
      successMessage: 'exchange.applySuccess',
      errorMessage: 'exchange.applyError',
      queuedMessage: 'sync.savedOffline',
      safeGuard: { context: 'useExchangeActions', action: 'taking exchange' },
      skipSuccessToastInDemoMode: true,
      onSuccess: () => takeOverModal.close(),
    }
  )

  const withdrawMutation = useOfflineMutation(
    async (exchange: GameExchange, log) => {
      await apiClient.withdrawFromExchange(exchange.__identity)
      log.debug('Successfully withdrawn from exchange:', exchange.__identity)
      queryClient.invalidateQueries({ queryKey: queryKeys.exchanges.lists() })
    },
    {
      logContext: 'useExchangeActions',
      mutationType: 'withdrawFromExchange',
      getEntityId: (exchange) => exchange.__identity,
      getDisplayLabel: (exchange) =>
        exchange.refereeGame?.game?.encounter?.teamHome?.name
          ? `${exchange.refereeGame.game.encounter.teamHome.name} vs ${exchange.refereeGame.game.encounter?.teamAway?.name ?? '?'}`
          : 'Withdraw from exchange',
      getEntityLabel: (exchange) => exchange.refereeGame?.game?.startingDateTime,
      successMessage: 'exchange.withdrawSuccess',
      errorMessage: 'exchange.withdrawError',
      queuedMessage: 'sync.savedOffline',
      safeGuard: {
        context: 'useExchangeActions',
        action: 'withdrawing from exchange',
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
      await withdrawMutation.execute(exchange)
    },
    [withdrawMutation]
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
