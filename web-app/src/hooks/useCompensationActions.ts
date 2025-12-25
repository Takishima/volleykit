import { useCallback, useRef } from "react";
import type { CompensationRecord } from "@/api/client";
import { downloadCompensationPDF } from "@/utils/compensation-actions";
import { createLogger } from "@/utils/logger";
import { toast } from "@/stores/toast";
import { useTranslation } from "@/hooks/useTranslation";
import { useModalState } from "./useModalState";
import { useSafeModeGuard } from "./useSafeModeGuard";

const log = createLogger("useCompensationActions");

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
  const { guard, isDemoMode } = useSafeModeGuard();
  const editCompensationModal = useModalState<CompensationRecord>();
  const isDownloadingRef = useRef(false);

  const openEditCompensation = useCallback(
    (compensation: CompensationRecord) => {
      if (
        guard({
          context: "useCompensationActions",
          action: "editing compensation",
        })
      ) {
        return;
      }

      editCompensationModal.open(compensation);
    },
    [guard, editCompensationModal],
  );

  const handleGeneratePDF = useCallback(
    async (compensation: CompensationRecord) => {
      if (isDemoMode) {
        log.debug("Demo mode: PDF download disabled");
        toast.info(t("compensations.pdfNotAvailableDemo"));
        return;
      }

      if (isDownloadingRef.current) {
        log.debug("PDF download already in progress, ignoring");
        return;
      }

      isDownloadingRef.current = true;
      try {
        log.debug("Generating PDF for:", compensation.__identity);
        await downloadCompensationPDF(compensation.__identity);
        log.debug("PDF downloaded successfully:", compensation.__identity);
      } catch (error) {
        log.error("Failed to generate PDF:", error);
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
