import { useCallback, useRef } from "react";
import type { GameExchange } from "@/api/client";
import {
  useApplyForExchange,
  useWithdrawFromExchange,
} from "./useConvocations";
import { logger } from "@/utils/logger";
import { useAuthStore } from "@/stores/auth";
import { toast } from "@/stores/toast";
import { useSettingsStore } from "@/stores/settings";
import { useTranslation } from "@/hooks/useTranslation";
import { useModalState } from "./useModalState";

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
  const isDemoMode = useAuthStore((state) => state.isDemoMode);
  const isSafeModeEnabled = useSettingsStore(
    (state) => state.isSafeModeEnabled,
  );

  const takeOverModal = useModalState<GameExchange>();
  const removeFromExchangeModal = useModalState<GameExchange>();

  const applyMutation = useApplyForExchange();
  const withdrawMutation = useWithdrawFromExchange();

  // Race condition protection refs for async operations
  const isTakingOverRef = useRef(false);
  const isRemovingRef = useRef(false);

  const handleTakeOver = useCallback(
    async (exchange: GameExchange) => {
      // Safe mode blocks dangerous operations; demo mode bypasses since it's local-only
      if (!isDemoMode && isSafeModeEnabled) {
        logger.debug(
          "[useExchangeActions] Safe mode: taking exchange blocked",
        );
        toast.warning(t("settings.safeModeBlocked"));
        return;
      }

      if (isTakingOverRef.current) return;
      isTakingOverRef.current = true;

      try {
        await applyMutation.mutateAsync(exchange.__identity);
        takeOverModal.close();

        logger.debug(
          "[useExchangeActions] Successfully applied for exchange:",
          exchange.__identity,
        );

        if (!isDemoMode) {
          toast.success(t("exchange.applySuccess"));
        }
      } catch (error) {
        logger.error(
          "[useExchangeActions] Failed to apply for exchange:",
          error,
        );

        toast.error(t("exchange.applyError"));
      } finally {
        isTakingOverRef.current = false;
      }
    },
    [isDemoMode, isSafeModeEnabled, applyMutation, takeOverModal, t],
  );

  const handleRemoveFromExchange = useCallback(
    async (exchange: GameExchange) => {
      // Safe mode blocks dangerous operations; demo mode bypasses since it's local-only
      if (!isDemoMode && isSafeModeEnabled) {
        logger.debug(
          "[useExchangeActions] Safe mode: withdrawing from exchange blocked",
        );
        toast.warning(t("settings.safeModeBlocked"));
        return;
      }

      if (isRemovingRef.current) return;
      isRemovingRef.current = true;

      try {
        await withdrawMutation.mutateAsync(exchange.__identity);
        removeFromExchangeModal.close();

        logger.debug(
          "[useExchangeActions] Successfully withdrawn from exchange:",
          exchange.__identity,
        );

        if (!isDemoMode) {
          toast.success(t("exchange.withdrawSuccess"));
        }
      } catch (error) {
        logger.error(
          "[useExchangeActions] Failed to withdraw from exchange:",
          error,
        );

        toast.error(t("exchange.withdrawError"));
      } finally {
        isRemovingRef.current = false;
      }
    },
    [isDemoMode, isSafeModeEnabled, withdrawMutation, removeFromExchangeModal, t],
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
