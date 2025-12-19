import { useState, useCallback, useRef, useEffect } from "react";
import type { Assignment } from "@/api/client";
import { logger } from "@/utils/logger";
import {
  getTeamNames,
  isGameReportEligible,
  MODAL_CLEANUP_DELAY,
} from "@/utils/assignment-helpers";
import { useAuthStore } from "@/stores/auth";
import { useDemoStore } from "@/stores/demo";
import { useLanguageStore } from "@/stores/language";
import { useSettingsStore } from "@/stores/settings";
import { toast } from "@/stores/toast";
import { useTranslation } from "@/hooks/useTranslation";

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

  const [editCompensationOpen, setEditCompensationOpen] = useState(false);
  const [editCompensationAssignment, setEditCompensationAssignment] =
    useState<Assignment | null>(null);

  const [validateGameOpen, setValidateGameOpen] = useState(false);
  const [validateGameAssignment, setValidateGameAssignment] =
    useState<Assignment | null>(null);

  const [pdfReportOpen, setPdfReportOpen] = useState(false);
  const [pdfReportAssignment, setPdfReportAssignment] =
    useState<Assignment | null>(null);
  const [pdfReportLoading, setPdfReportLoading] = useState(false);

  const editCompensationCleanupRef = useRef<number | null>(null);
  const validateGameCleanupRef = useRef<number | null>(null);
  const pdfReportCleanupRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (editCompensationCleanupRef.current) {
        clearTimeout(editCompensationCleanupRef.current);
      }
      if (validateGameCleanupRef.current) {
        clearTimeout(validateGameCleanupRef.current);
      }
      if (pdfReportCleanupRef.current) {
        clearTimeout(pdfReportCleanupRef.current);
      }
    };
  }, []);

  const openEditCompensation = useCallback((assignment: Assignment) => {
    setEditCompensationAssignment(assignment);
    setEditCompensationOpen(true);
  }, []);

  const closeEditCompensation = useCallback(() => {
    setEditCompensationOpen(false);
    if (editCompensationCleanupRef.current) {
      clearTimeout(editCompensationCleanupRef.current);
    }
    editCompensationCleanupRef.current = setTimeout(
      () => setEditCompensationAssignment(null),
      MODAL_CLEANUP_DELAY,
    );
  }, []);

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

      setValidateGameAssignment(assignment);
      setValidateGameOpen(true);
    },
    [isDemoMode, isSafeModeEnabled, t],
  );

  const closeValidateGame = useCallback(() => {
    setValidateGameOpen(false);
    if (validateGameCleanupRef.current) {
      clearTimeout(validateGameCleanupRef.current);
    }
    validateGameCleanupRef.current = setTimeout(
      () => setValidateGameAssignment(null),
      MODAL_CLEANUP_DELAY,
    );
  }, []);

  const openPdfReport = useCallback(
    (assignment: Assignment) => {
      if (!isGameReportEligible(assignment)) {
        logger.debug(
          "[useAssignmentActions] Game report not available for this league",
        );
        toast.info(t("assignments.gameReportNotAvailable"));
        return;
      }

      setPdfReportAssignment(assignment);
      setPdfReportOpen(true);
    },
    [t],
  );

  const closePdfReport = useCallback(() => {
    if (pdfReportLoading) return;
    setPdfReportOpen(false);
    if (pdfReportCleanupRef.current) {
      clearTimeout(pdfReportCleanupRef.current);
    }
    pdfReportCleanupRef.current = setTimeout(
      () => setPdfReportAssignment(null),
      MODAL_CLEANUP_DELAY,
    );
  }, [pdfReportLoading]);

  const handleConfirmPdfLanguage = useCallback(
    async (language: PdfLanguage) => {
      if (!pdfReportAssignment) return;

      setPdfReportLoading(true);
      try {
        // Dynamic import to keep PDF utilities out of the main bundle
        const {
          extractSportsHallReportData,
          getLeagueCategoryFromAssignment,
          generateAndDownloadSportsHallReport,
        } = await import("@/utils/pdf-form-filler");

        const reportData = extractSportsHallReportData(pdfReportAssignment);
        const leagueCategory =
          getLeagueCategoryFromAssignment(pdfReportAssignment);

        if (!reportData || !leagueCategory) {
          logger.error(
            "[useAssignmentActions] Failed to extract report data for:",
            pdfReportAssignment.__identity,
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
          pdfReportAssignment.__identity,
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
    [pdfReportAssignment, closePdfReport, t],
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
      isOpen: editCompensationOpen,
      assignment: editCompensationAssignment,
      open: openEditCompensation,
      close: closeEditCompensation,
    },
    validateGameModal: {
      isOpen: validateGameOpen,
      assignment: validateGameAssignment,
      open: openValidateGame,
      close: closeValidateGame,
    },
    pdfReportModal: {
      isOpen: pdfReportOpen,
      assignment: pdfReportAssignment,
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
