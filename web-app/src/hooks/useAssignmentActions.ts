import { useState, useCallback, useRef, useEffect } from "react";
import type { Assignment } from "@/api/client";
import { downloadPDF, type ReportData } from "@/utils/assignment-actions";
import { logger } from "@/utils/logger";
import {
  getTeamNames,
  isGameReportEligible,
  MODAL_CLEANUP_DELAY,
} from "@/utils/assignment-helpers";
import { useAuthStore } from "@/stores/auth";
import { useDemoStore } from "@/stores/demo";
import { useSettingsStore } from "@/stores/settings";
import { toast } from "@/stores/toast";
import { useTranslation } from "@/hooks/useTranslation";

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
  handleGenerateReport: (assignment: Assignment) => void;
  handleAddToExchange: (assignment: Assignment) => void;
}

export function useAssignmentActions(): UseAssignmentActionsResult {
  const { t } = useTranslation();
  const isDemoMode = useAuthStore((state) => state.isDemoMode);
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

  const editCompensationCleanupRef = useRef<number | null>(null);
  const validateGameCleanupRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (editCompensationCleanupRef.current) {
        clearTimeout(editCompensationCleanupRef.current);
      }
      if (validateGameCleanupRef.current) {
        clearTimeout(validateGameCleanupRef.current);
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

  const handleGenerateReport = useCallback(
    (assignment: Assignment) => {
      if (!isGameReportEligible(assignment)) {
        logger.debug(
          "[useAssignmentActions] Game report not available for this league",
        );
        toast.info(t("assignments.gameReportNotAvailable"));
        return;
      }

      const { homeTeam, awayTeam } = getTeamNames(assignment);
      const game = assignment.refereeGame?.game;
      const hallName = game?.hall?.name || "Location TBD";
      const date = game?.startingDateTime || new Date().toISOString();

      const reportData: ReportData = {
        title: "Sports Hall Report",
        homeTeam,
        awayTeam,
        venue: hallName,
        date: new Date(date).toLocaleDateString(),
        position: assignment.refereePosition || "Unknown",
      };

      downloadPDF(reportData, `sports-hall-report-${assignment.__identity}.pdf`);

      logger.debug(
        "[useAssignmentActions] Generated PDF report for:",
        assignment.__identity,
      );
      toast.success(t("assignments.reportGenerated"));
    },
    [t],
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
    handleGenerateReport,
    handleAddToExchange,
  };
}
