import { useState, useCallback, useRef, useEffect } from "react";
import type { CompensationRecord } from "@/api/client";
import { downloadCompensationPDF } from "@/utils/compensation-actions";
import { logger } from "@/utils/logger";
import { MODAL_CLEANUP_DELAY } from "@/utils/assignment-helpers";
import { useAuthStore } from "@/stores/auth";

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
  const isDemoMode = useAuthStore((state) => state.isDemoMode);
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
      setEditCompensationRecord(compensation);
      setEditCompensationOpen(true);
    },
    [],
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
        // TODO(#77): Replace alert with toast notification when notification system is implemented
        alert("PDF downloads are not available in demo mode");
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
        // TODO(#77): Replace alert with toast notification when notification system is implemented
        alert("Failed to download compensation PDF. Please try again later.");
      } finally {
        isDownloadingRef.current = false;
      }
    },
    [isDemoMode],
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
