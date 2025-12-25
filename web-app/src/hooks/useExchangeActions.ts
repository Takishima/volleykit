import { useCallback } from "react";
import type { GameExchange } from "@/api/client";
import {
  useApplyForExchange,
  useWithdrawFromExchange,
} from "./useConvocations";
import { useModalState } from "./useModalState";
import { useSafeMutation } from "./useSafeMutation";

interface UseExchangeActionsResult {
  takeOverModal: {
    isOpen: boolean;
    exchange: GameExchange | null;
    open: (exchange: GameExchange) => void;
    close: () => void;
  };
  removeFromExchangeModal: {
    isOpen: boolean;
    exchange: GameExchange | null;
    open: (exchange: GameExchange) => void;
    close: () => void;
  };
  handleTakeOver: (exchange: GameExchange) => Promise<void>;
  handleRemoveFromExchange: (exchange: GameExchange) => Promise<void>;
}

export function useExchangeActions(): UseExchangeActionsResult {
  const takeOverModal = useModalState<GameExchange>();
  const removeFromExchangeModal = useModalState<GameExchange>();

  const applyMutation = useApplyForExchange();
  const withdrawMutation = useWithdrawFromExchange();

  const takeOverMutation = useSafeMutation(
    async (exchange: GameExchange, log) => {
      await applyMutation.mutateAsync(exchange.__identity);
      log.debug("Successfully applied for exchange:", exchange.__identity);
    },
    {
      logContext: "useExchangeActions",
      successMessage: "exchange.applySuccess",
      errorMessage: "exchange.applyError",
      safeGuard: { context: "useExchangeActions", action: "taking exchange" },
      skipSuccessToastInDemoMode: true,
      onSuccess: () => takeOverModal.close(),
    },
  );

  const withdrawMutation2 = useSafeMutation(
    async (exchange: GameExchange, log) => {
      await withdrawMutation.mutateAsync(exchange.__identity);
      log.debug("Successfully withdrawn from exchange:", exchange.__identity);
    },
    {
      logContext: "useExchangeActions",
      successMessage: "exchange.withdrawSuccess",
      errorMessage: "exchange.withdrawError",
      safeGuard: {
        context: "useExchangeActions",
        action: "withdrawing from exchange",
      },
      skipSuccessToastInDemoMode: true,
      onSuccess: () => removeFromExchangeModal.close(),
    },
  );

  const handleTakeOver = useCallback(
    async (exchange: GameExchange) => {
      await takeOverMutation.execute(exchange);
    },
    [takeOverMutation],
  );

  const handleRemoveFromExchange = useCallback(
    async (exchange: GameExchange) => {
      await withdrawMutation2.execute(exchange);
    },
    [withdrawMutation2],
  );

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
  };
}
