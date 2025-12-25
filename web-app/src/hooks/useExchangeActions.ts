import { useCallback, useRef } from "react";
import type { GameExchange } from "@/api/client";
import {
  useApplyForExchange,
  useWithdrawFromExchange,
} from "./useConvocations";
import { createLogger } from "@/utils/logger";
import { toast } from "@/stores/toast";
import { useTranslation } from "@/hooks/useTranslation";
import { useModalState } from "./useModalState";
import { useSafeModeGuard } from "./useSafeModeGuard";

const log = createLogger("useExchangeActions");

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
  const { t } = useTranslation();
  const { guard, isDemoMode } = useSafeModeGuard();

  const takeOverModal = useModalState<GameExchange>();
  const removeFromExchangeModal = useModalState<GameExchange>();

  const applyMutation = useApplyForExchange();
  const withdrawMutation = useWithdrawFromExchange();

  // Race condition protection refs for async operations
  const isTakingOverRef = useRef(false);
  const isRemovingRef = useRef(false);

  const handleTakeOver = useCallback(
    async (exchange: GameExchange) => {
      if (
        guard({
          context: "useExchangeActions",
          action: "taking exchange",
        })
      ) {
        return;
      }

      if (isTakingOverRef.current) return;
      isTakingOverRef.current = true;

      try {
        await applyMutation.mutateAsync(exchange.__identity);
        takeOverModal.close();

        log.debug("Successfully applied for exchange:", exchange.__identity);

        if (!isDemoMode) {
          toast.success(t("exchange.applySuccess"));
        }
      } catch (error) {
        log.error("Failed to apply for exchange:", error);

        toast.error(t("exchange.applyError"));
      } finally {
        isTakingOverRef.current = false;
      }
    },
    [guard, isDemoMode, applyMutation, takeOverModal, t],
  );

  const handleRemoveFromExchange = useCallback(
    async (exchange: GameExchange) => {
      if (
        guard({
          context: "useExchangeActions",
          action: "withdrawing from exchange",
        })
      ) {
        return;
      }

      if (isRemovingRef.current) return;
      isRemovingRef.current = true;

      try {
        await withdrawMutation.mutateAsync(exchange.__identity);
        removeFromExchangeModal.close();

        log.debug("Successfully withdrawn from exchange:", exchange.__identity);

        if (!isDemoMode) {
          toast.success(t("exchange.withdrawSuccess"));
        }
      } catch (error) {
        log.error("Failed to withdraw from exchange:", error);

        toast.error(t("exchange.withdrawError"));
      } finally {
        isRemovingRef.current = false;
      }
    },
    [guard, isDemoMode, withdrawMutation, removeFromExchangeModal, t],
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
