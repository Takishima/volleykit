import { useCallback } from "react";
import type { CompensationRecord } from "@/api/client";
import { downloadCompensationPDF } from "../utils/compensation-actions";
import { toast } from "@/shared/stores/toast";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { useModalState } from "@/shared/hooks/useModalState";
import { useSafeModeGuard } from "@/shared/hooks/useSafeModeGuard";
import { useSafeMutation } from "@/shared/hooks/useSafeMutation";

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

  const pdfMutation = useSafeMutation(
    async (compensation: CompensationRecord, log) => {
      log.debug("Generating PDF for:", compensation.__identity);
      await downloadCompensationPDF(compensation.__identity);
      log.debug("PDF downloaded successfully:", compensation.__identity);
    },
    {
      logContext: "useCompensationActions",
      errorMessage: "compensations.pdfDownloadFailed",
    },
  );

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
      // Demo mode blocks PDF download (requires real API)
      if (isDemoMode) {
        toast.info(t("compensations.pdfNotAvailableDemo"));
        return;
      }

      await pdfMutation.execute(compensation);
    },
    [isDemoMode, t, pdfMutation],
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
