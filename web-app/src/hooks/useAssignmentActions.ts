import { useState, useCallback } from "react";
import type { Assignment } from "@/api/client";
import { logger } from "@/utils/logger";
import { getTeamNames, isGameReportEligible } from "@/utils/assignment-helpers";
import { useAuthStore } from "@/stores/auth";
import { useDemoStore } from "@/stores/demo";
import { useLanguageStore } from "@/stores/language";
import { useSettingsStore } from "@/stores/settings";
import { toast } from "@/stores/toast";
import { useTranslation } from "@/hooks/useTranslation";
import { useModalState } from "./useModalState";

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
  const isDemoMode = useAuthStore((state) => state.isDemoMode);
  const locale = useLanguageStore((state) => state.locale);
  const isSafeModeEnabled = useSettingsStore(
    (state) => state.isSafeModeEnabled,
  );
  const addAssignmentToExchange = useDemoStore(
    (state) => state.addAssignmentToExchange,
  );

  const editCompensationModal = useModalState<Assignment>();
  const validateGameModal = useModalState<Assignment>();
  const pdfReportModal = useModalState<Assignment>();
  const [pdfReportLoading, setPdfReportLoading] = useState(false);

  const openValidateGame = useCallback(
    (assignment: Assignment) => {
      // Safe mode only applies to real API calls; demo mode is local-only and poses no risk
      if (!isDemoMode && isSafeModeEnabled) {
        logger.debug(
          "[useAssignmentActions] Safe mode: game validation blocked",
        );
        toast.warning(t("settings.safeModeBlocked"));
        return;
      }

      validateGameModal.open(assignment);
    },
    [isDemoMode, isSafeModeEnabled, t, validateGameModal],
  );

  const openPdfReport = useCallback(
    (assignment: Assignment) => {
      if (!isGameReportEligible(assignment)) {
        logger.debug(
          "[useAssignmentActions] Game report not available for this league",
        );
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
        } = await import("@/utils/pdf-form-filler");

        const reportData = extractSportsHallReportData(pdfReportModal.data);
        const leagueCategory = getLeagueCategoryFromAssignment(
          pdfReportModal.data,
        );

        if (!reportData || !leagueCategory) {
          logger.error(
            "[useAssignmentActions] Failed to extract report data for:",
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
        logger.debug(
          "[useAssignmentActions] Generated PDF report for:",
          pdfReportModal.data.__identity,
        );
        toast.success(t("assignments.reportGenerated"));
        closePdfReport();
      } catch (error) {
        logger.error("[useAssignmentActions] PDF generation failed:", error);
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

      // Safe mode only applies to real API calls; demo mode is local-only and poses no risk
      if (!isDemoMode && isSafeModeEnabled) {
        logger.debug(
          "[useAssignmentActions] Safe mode: adding to exchange blocked",
        );
        toast.warning(t("settings.safeModeBlocked"));
        return;
      }

      if (isDemoMode) {
        addAssignmentToExchange(assignment.__identity);
        logger.debug(
          "[useAssignmentActions] Demo mode: added assignment to exchange:",
          assignment.__identity,
        );
        toast.success(t("exchange.addedToExchangeSuccess"));
        return;
      }

      logger.debug("[useAssignmentActions] Mock add to exchange:", {
        assignmentId: assignment.__identity,
        game: `${homeTeam} vs ${awayTeam}`,
      });

      toast.success(t("exchange.addedToExchangeSuccess"));
    },
    [isDemoMode, isSafeModeEnabled, addAssignmentToExchange, t],
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
