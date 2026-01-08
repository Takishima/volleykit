import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Assignment } from "@/api/client";
import { queryKeys } from "@/api/queryKeys";
import { createLogger } from "@/shared/utils/logger";
import {
  getTeamNames,
  isGameReportEligible,
  isGameAlreadyValidated,
} from "../utils/assignment-helpers";
import { useDemoStore } from "@/shared/stores/demo";
import { useLanguageStore } from "@/shared/stores/language";
import { toast } from "@/shared/stores/toast";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { useModalState } from "@/shared/hooks/useModalState";
import { useSafeModeGuard } from "@/shared/hooks/useSafeModeGuard";

const log = createLogger("useAssignmentActions");

type PdfLanguage = "de" | "fr";

function mapLocaleToPdfLanguage(appLocale: string): PdfLanguage {
  return appLocale === "fr" || appLocale === "it" ? "fr" : "de";
}

interface UseAssignmentActionsResult {
  editCompensationModal: {
    isOpen: boolean;
    assignment: Assignment | null;
    open: (assignment: Assignment) => void;
    close: () => void;
  };
  validateGameModal: {
    isOpen: boolean;
    assignment: Assignment | null;
    open: (assignment: Assignment) => void;
    close: () => void;
  };
  pdfReportModal: {
    isOpen: boolean;
    assignment: Assignment | null;
    isLoading: boolean;
    defaultLanguage: PdfLanguage;
    open: (assignment: Assignment) => void;
    close: () => void;
    onConfirm: (language: PdfLanguage) => void;
  };
  handleGenerateReport: (assignment: Assignment) => void;
  handleAddToExchange: (assignment: Assignment) => void;
}

export function useAssignmentActions(): UseAssignmentActionsResult {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { guard, isDemoMode } = useSafeModeGuard();
  const locale = useLanguageStore((state) => state.locale);
  const addAssignmentToExchange = useDemoStore(
    (state) => state.addAssignmentToExchange,
  );

  const editCompensationModal = useModalState<Assignment>();
  const validateGameModal = useModalState<Assignment>();
  const pdfReportModal = useModalState<Assignment>();
  const [pdfReportLoading, setPdfReportLoading] = useState(false);

  const openValidateGame = useCallback(
    (assignment: Assignment) => {
      // Safe mode no longer blocks opening the validation modal.
      // Instead, when in safe mode, the modal shows a "Dismiss" button
      // that closes without making any API calls, allowing users to
      // preview the validation workflow without modifying data.
      validateGameModal.open(assignment);
    },
    [validateGameModal],
  );

  const openPdfReport = useCallback(
    (assignment: Assignment) => {
      if (!isGameReportEligible(assignment)) {
        log.debug("Game report not available for this league");
        toast.info(t("assignments.gameReportNotAvailable"));
        return;
      }

      pdfReportModal.open(assignment);
    },
    [t, pdfReportModal],
  );

  const closePdfReport = useCallback(() => {
    if (pdfReportLoading) return;
    pdfReportModal.close();
  }, [pdfReportLoading, pdfReportModal]);

  const handleConfirmPdfLanguage = useCallback(
    async (language: PdfLanguage) => {
      if (!pdfReportModal.data) return;

      setPdfReportLoading(true);
      try {
        // Dynamic import to keep PDF utilities out of the main bundle
        const {
          extractSportsHallReportData,
          getLeagueCategoryFromAssignment,
          generateAndDownloadSportsHallReport,
        } = await import("@/shared/utils/pdf-form-filler");

        const reportData = extractSportsHallReportData(pdfReportModal.data);
        const leagueCategory = getLeagueCategoryFromAssignment(
          pdfReportModal.data,
        );

        if (!reportData || !leagueCategory) {
          log.error(
            "Failed to extract report data for:",
            pdfReportModal.data.__identity,
          );
          toast.error(t("pdf.exportError"));
          return;
        }

        await generateAndDownloadSportsHallReport(
          reportData,
          leagueCategory,
          language,
        );
        log.debug("Generated PDF report for:", pdfReportModal.data.__identity);
        toast.success(t("assignments.reportGenerated"));
        closePdfReport();
      } catch (error) {
        log.error("PDF generation failed:", error);
        toast.error(t("pdf.exportError"));
      } finally {
        setPdfReportLoading(false);
      }
    },
    [pdfReportModal.data, closePdfReport, t],
  );

  const handleGenerateReport = useCallback(
    (assignment: Assignment) => {
      openPdfReport(assignment);
    },
    [openPdfReport],
  );

  const handleAddToExchange = useCallback(
    (assignment: Assignment) => {
      const { homeTeam, awayTeam } = getTeamNames(assignment);

      // Prevent adding validated games to exchange
      if (isGameAlreadyValidated(assignment)) {
        log.debug("Cannot add validated game to exchange:", assignment.__identity);
        toast.error(t("exchange.cannotExchangeValidatedGame"));
        return;
      }

      if (
        guard({
          context: "useAssignmentActions",
          action: "adding to exchange",
        })
      ) {
        return;
      }

      if (isDemoMode) {
        addAssignmentToExchange(assignment.__identity);
        // Invalidate exchanges query so the new exchange appears immediately
        queryClient.invalidateQueries({ queryKey: queryKeys.exchanges.lists() });
        // Also invalidate assignments since isOpenEntryInRefereeGameExchange changes
        queryClient.invalidateQueries({ queryKey: queryKeys.assignments.lists() });
        log.debug(
          "Demo mode: added assignment to exchange:",
          assignment.__identity,
        );
        toast.success(t("exchange.addedToExchangeSuccess"));
        return;
      }

      log.debug("Mock add to exchange:", {
        assignmentId: assignment.__identity,
        game: `${homeTeam} vs ${awayTeam}`,
      });

      toast.success(t("exchange.addedToExchangeSuccess"));
    },
    [guard, isDemoMode, addAssignmentToExchange, queryClient, t],
  );

  return {
    editCompensationModal: {
      isOpen: editCompensationModal.isOpen,
      assignment: editCompensationModal.data,
      open: editCompensationModal.open,
      close: editCompensationModal.close,
    },
    validateGameModal: {
      isOpen: validateGameModal.isOpen,
      assignment: validateGameModal.data,
      open: openValidateGame,
      close: validateGameModal.close,
    },
    pdfReportModal: {
      isOpen: pdfReportModal.isOpen,
      assignment: pdfReportModal.data,
      isLoading: pdfReportLoading,
      defaultLanguage: mapLocaleToPdfLanguage(locale),
      open: openPdfReport,
      close: closePdfReport,
      onConfirm: handleConfirmPdfLanguage,
    },
    handleGenerateReport,
    handleAddToExchange,
  };
}
