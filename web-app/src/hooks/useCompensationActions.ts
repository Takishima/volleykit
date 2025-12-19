import { useState, useCallback, useRef, useEffect } from "react";
import type { CompensationRecord } from "@/api/client";
import { downloadCompensationPDF } from "@/utils/compensation-actions";
import { logger } from "@/utils/logger";
import { MODAL_CLEANUP_DELAY } from "@/utils/assignment-helpers";
import { useAuthStore } from "@/stores/auth";
import { useSettingsStore } from "@/stores/settings";
import { toast } from "@/stores/toast";
import { useTranslation } from "@/hooks/useTranslation";

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
  const [editCompensationOpen, setEditCompensationOpen] = useState(false);
  const [editCompensationRecord, setEditCompensationRecord] =
    useState<CompensationRecord | null>(null);
  const cleanupTimeoutRef = useRef<number | null>(null);
  const isDownloadingRef = useRef(false);

  useEffect(() => {
    return () => {
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
      }
    };
  }, []);

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

      setEditCompensationRecord(compensation);
      setEditCompensationOpen(true);
    },
    [isDemoMode, isSafeModeEnabled, t],
  );

  const closeEditCompensation = useCallback(() => {
    setEditCompensationOpen(false);
    if (cleanupTimeoutRef.current) {
      clearTimeout(cleanupTimeoutRef.current);
    }
    cleanupTimeoutRef.current = setTimeout(
      () => setEditCompensationRecord(null),
      MODAL_CLEANUP_DELAY,
    );
  }, []);

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
      isOpen: editCompensationOpen,
      compensation: editCompensationRecord,
      open: openEditCompensation,
      close: closeEditCompensation,
    },
    handleGeneratePDF,
  };
}
