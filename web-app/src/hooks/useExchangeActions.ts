import { useState, useCallback, useRef, useEffect } from "react";
import type { GameExchange } from "@/api/client";
import {
  useApplyForExchange,
  useWithdrawFromExchange,
} from "./useConvocations";
import { logger } from "@/utils/logger";
import { MODAL_CLEANUP_DELAY } from "@/utils/assignment-helpers";
import { useAuthStore } from "@/stores/auth";
import { toast } from "@/stores/toast";
import { useSettingsStore } from "@/stores/settings";
import { useTranslation } from "@/hooks/useTranslation";

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

  const [takeOverOpen, setTakeOverOpen] = useState(false);
  const [takeOverExchange, setTakeOverExchange] = useState<GameExchange | null>(
    null,
  );

  const [removeFromExchangeOpen, setRemoveFromExchangeOpen] = useState(false);
  const [removeFromExchangeExchange, setRemoveFromExchangeExchange] =
    useState<GameExchange | null>(null);

  const applyMutation = useApplyForExchange();
  const withdrawMutation = useWithdrawFromExchange();

  // Race condition protection refs for async operations
  const isTakingOverRef = useRef(false);
  const isRemovingRef = useRef(false);

  // Cleanup timeout refs to prevent memory leaks
  const takeOverCleanupRef = useRef<number | null>(null);
  const removeFromExchangeCleanupRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (takeOverCleanupRef.current) {
        clearTimeout(takeOverCleanupRef.current);
      }
      if (removeFromExchangeCleanupRef.current) {
        clearTimeout(removeFromExchangeCleanupRef.current);
      }
    };
  }, []);

  const openTakeOver = useCallback((exchange: GameExchange) => {
    setTakeOverExchange(exchange);
    setTakeOverOpen(true);
  }, []);

  const closeTakeOver = useCallback(() => {
    setTakeOverOpen(false);
    if (takeOverCleanupRef.current) {
      clearTimeout(takeOverCleanupRef.current);
    }
    takeOverCleanupRef.current = setTimeout(
      () => setTakeOverExchange(null),
      MODAL_CLEANUP_DELAY,
    );
  }, []);

  const openRemoveFromExchange = useCallback((exchange: GameExchange) => {
    setRemoveFromExchangeExchange(exchange);
    setRemoveFromExchangeOpen(true);
  }, []);

  const closeRemoveFromExchange = useCallback(() => {
    setRemoveFromExchangeOpen(false);
    if (removeFromExchangeCleanupRef.current) {
      clearTimeout(removeFromExchangeCleanupRef.current);
    }
    removeFromExchangeCleanupRef.current = setTimeout(
      () => setRemoveFromExchangeExchange(null),
      MODAL_CLEANUP_DELAY,
    );
  }, []);

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
        closeTakeOver();

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
    [isDemoMode, isSafeModeEnabled, applyMutation, closeTakeOver, t],
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
        closeRemoveFromExchange();

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
    [isDemoMode, isSafeModeEnabled, withdrawMutation, closeRemoveFromExchange, t],
  );

  return {
    takeOverModal: {
      isOpen: takeOverOpen,
      exchange: takeOverExchange,
      open: openTakeOver,
      close: closeTakeOver,
    },
    removeFromExchangeModal: {
      isOpen: removeFromExchangeOpen,
      exchange: removeFromExchangeExchange,
      open: openRemoveFromExchange,
      close: closeRemoveFromExchange,
    },
    handleTakeOver,
    handleRemoveFromExchange,
  };
}
