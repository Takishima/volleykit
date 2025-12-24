import { useCallback, useRef } from "react";
import type { CompensationRecord } from "@/api/client";
import { downloadCompensationPDF } from "@/utils/compensation-actions";
import { logger } from "@/utils/logger";
import { useAuthStore } from "@/stores/auth";
import { useSettingsStore } from "@/stores/settings";
import { toast } from "@/stores/toast";
import { useTranslation } from "@/hooks/useTranslation";
import { useModalState } from "./useModalState";

interface UseCompensationActionsResult {
  editCompensationModal: {
    isOpen: boolean;
    compensation: CompensationRecord | null;
    open: (compensation: CompensationRecord) => void;
    close: () => void;
  };
  handleGeneratePDF: (compensation: CompensationRecord) => Promise<void>;
}

export function useCompensationActions(): UseCompensationActionsResult {
  const { t } = useTranslation();
  const isDemoMode = useAuthStore((state) => state.isDemoMode);
  const isSafeModeEnabled = useSettingsStore(
    (state) => state.isSafeModeEnabled,
  );
  const editCompensationModal = useModalState<CompensationRecord>();
  const isDownloadingRef = useRef(false);

  const openEditCompensation = useCallback(
    (compensation: CompensationRecord) => {
      // Safe mode blocks dangerous operations; demo mode bypasses since it's local-only
      if (!isDemoMode && isSafeModeEnabled) {
        logger.debug(
          "[useCompensationActions] Safe mode: editing compensation blocked",
        );
        toast.warning(t("settings.safeModeBlocked"));
        return;
      }

      editCompensationModal.open(compensation);
    },
    [isDemoMode, isSafeModeEnabled, t, editCompensationModal],
  );

  const handleGeneratePDF = useCallback(
    async (compensation: CompensationRecord) => {
      if (isDemoMode) {
        logger.debug(
          "[useCompensationActions] Demo mode: PDF download disabled",
        );
        toast.info(t("compensations.pdfNotAvailableDemo"));
        return;
      }

      if (isDownloadingRef.current) {
        logger.debug(
          "[useCompensationActions] PDF download already in progress, ignoring",
        );
        return;
      }

      isDownloadingRef.current = true;
      try {
        logger.debug(
          "[useCompensationActions] Generating PDF for:",
          compensation.__identity,
        );
        await downloadCompensationPDF(compensation.__identity);
        logger.debug(
          "[useCompensationActions] PDF downloaded successfully:",
          compensation.__identity,
        );
      } catch (error) {
        logger.error("[useCompensationActions] Failed to generate PDF:", error);
        toast.error(t("compensations.pdfDownloadFailed"));
      } finally {
        isDownloadingRef.current = false;
      }
    },
    [isDemoMode, t],
  );

  return {
    editCompensationModal: {
      isOpen: editCompensationModal.isOpen,
      compensation: editCompensationModal.data,
      open: openEditCompensation,
      close: editCompensationModal.close,
    },
    handleGeneratePDF,
  };
}
