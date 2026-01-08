import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { useOCRScoresheet, compareRosters } from "@/features/ocr";
import type { ParsedGameSheet, PlayerComparisonResult } from "@/features/ocr";
import type { RosterPlayer } from "@/features/validation/hooks/useNominationList";
import { OCRCaptureModal } from "./OCRCaptureModal";
import { PlayerComparisonList } from "./PlayerComparisonList";
import { LoadingSpinner } from "@/shared/components/LoadingSpinner";
import {
  Camera,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  SkipForward,
  X,
} from "@/shared/components/icons";

type OCREntryStep = "intro" | "capture" | "processing" | "results" | "error";

interface OCREntryModalProps {
  isOpen: boolean;
  /** Home team name for display */
  homeTeamName: string;
  /** Away team name for display */
  awayTeamName: string;
  /** Home roster players for comparison */
  homeRosterPlayers: RosterPlayer[];
  /** Away roster players for comparison */
  awayRosterPlayers: RosterPlayer[];
  /** Which team is currently being scanned */
  currentTeam: "home" | "away";
  /** Callback when user confirms OCR results for a team */
  onApplyResults: (team: "home" | "away", matchedPlayerIds: string[]) => void;
  /** Callback when user skips OCR */
  onSkip: () => void;
  /** Callback when user completes OCR for both teams or decides to proceed */
  onComplete: () => void;
  /** Callback to close */
  onClose: () => void;
}

/**
 * Full-screen OCR entry modal that appears before the validation wizard.
 * Allows scanning both home and away team rosters.
 */
export function OCREntryModal({
  isOpen,
  homeTeamName,
  awayTeamName,
  homeRosterPlayers,
  awayRosterPlayers,
  currentTeam,
  onApplyResults,
  onSkip,
  onComplete,
  onClose,
}: OCREntryModalProps) {
  const { t } = useTranslation();
  const { processImage, isProcessing, progress, error, reset } =
    useOCRScoresheet();

  const [step, setStep] = useState<OCREntryStep>("intro");
  const [showCaptureModal, setShowCaptureModal] = useState(false);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(
    new Set(),
  );
  const [comparisonResults, setComparisonResults] = useState<
    PlayerComparisonResult[]
  >([]);

  // Guard against rapid double-clicks
  const isProcessingRef = useRef(false);

  // Get current team data
  const teamName = currentTeam === "home" ? homeTeamName : awayTeamName;
  const rosterPlayers =
    currentTeam === "home" ? homeRosterPlayers : awayRosterPlayers;

  // Handle Escape key
  useEffect(() => {
    if (!isOpen || showCaptureModal) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, showCaptureModal, onClose]);

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep("intro");
      setSelectedPlayerIds(new Set());
      setComparisonResults([]);
      reset();
    }
  }, [isOpen, reset]);

  // Initialize selection with all matched players
  const initializeSelection = useCallback(
    (results: PlayerComparisonResult[]) => {
      const matchedIds = results
        .filter((r) => r.status === "match" && r.rosterPlayerId)
        .map((r) => r.rosterPlayerId as string);
      setSelectedPlayerIds(new Set(matchedIds));
    },
    [],
  );

  // Determine which team's data from OCR results
  const getOCRTeam = useCallback(
    (parsed: ParsedGameSheet) => {
      const homeMatch =
        parsed.teamA.name.toLowerCase().includes(teamName.toLowerCase()) ||
        teamName.toLowerCase().includes(parsed.teamA.name.toLowerCase());
      const awayMatch =
        parsed.teamB.name.toLowerCase().includes(teamName.toLowerCase()) ||
        teamName.toLowerCase().includes(parsed.teamB.name.toLowerCase());

      if (homeMatch && !awayMatch) return parsed.teamA;
      if (awayMatch && !homeMatch) return parsed.teamB;
      return currentTeam === "home" ? parsed.teamA : parsed.teamB;
    },
    [currentTeam, teamName],
  );

  // Handle image selection
  const handleImageSelected = useCallback(
    async (blob: Blob) => {
      if (isProcessingRef.current) return;
      isProcessingRef.current = true;

      setShowCaptureModal(false);
      setStep("processing");

      try {
        const parsed = await processImage(blob);
        if (parsed) {
          const ocrTeam = getOCRTeam(parsed);
          if (!ocrTeam || ocrTeam.players.length === 0) {
            setStep("error");
            return;
          }

          const rosterForComparison = rosterPlayers.map((p) => ({
            id: p.id,
            displayName: p.displayName,
            firstName: p.firstName,
            lastName: p.lastName,
          }));
          const results = compareRosters(ocrTeam.players, rosterForComparison);
          setComparisonResults(results);
          initializeSelection(results);
          setStep("results");
        } else {
          setStep("error");
        }
      } catch {
        setStep("error");
      } finally {
        isProcessingRef.current = false;
      }
    },
    [processImage, getOCRTeam, rosterPlayers, initializeSelection],
  );

  // Handle player toggle
  const handleTogglePlayer = useCallback((playerId: string) => {
    setSelectedPlayerIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(playerId)) {
        newSet.delete(playerId);
      } else {
        newSet.add(playerId);
      }
      return newSet;
    });
  }, []);

  // Handle select/deselect all
  const handleSelectAll = useCallback(() => {
    const matchedIds = comparisonResults
      .filter((r) => r.status === "match" && r.rosterPlayerId)
      .map((r) => r.rosterPlayerId as string);
    setSelectedPlayerIds(new Set(matchedIds));
  }, [comparisonResults]);

  const handleDeselectAll = useCallback(() => {
    setSelectedPlayerIds(new Set());
  }, []);

  // Handle apply and continue
  const handleApplyAndContinue = useCallback(() => {
    onApplyResults(currentTeam, Array.from(selectedPlayerIds));
    onComplete();
  }, [onApplyResults, currentTeam, selectedPlayerIds, onComplete]);

  // Handle retry
  const handleRetry = useCallback(() => {
    reset();
    setSelectedPlayerIds(new Set());
    setComparisonResults([]);
    setStep("capture");
    setShowCaptureModal(true);
  }, [reset]);

  // Start scanning
  const handleStartScan = useCallback(() => {
    setStep("capture");
    setShowCaptureModal(true);
  }, []);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-white dark:bg-gray-900"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ocr-entry-title"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h1
            id="ocr-entry-title"
            className="text-lg font-semibold text-gray-900 dark:text-white"
          >
            {t("validation.ocr.scanScoresheet")}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{teamName}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label={t("common.close")}
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Intro step */}
        {step === "intro" && (
          <div className="flex flex-col items-center justify-center min-h-[50vh]">
            <Camera
              className="w-20 h-20 text-primary-400 dark:text-primary-500 mb-6"
              aria-hidden="true"
            />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              {t("validation.ocr.scanScoresheet")}
            </h2>
            <p className="text-center text-gray-600 dark:text-gray-300 max-w-md mb-8">
              {t("validation.ocr.scanScoresheetDescription")}
            </p>
            <div className="flex flex-col gap-3 w-full max-w-xs">
              <button
                type="button"
                onClick={handleStartScan}
                className="w-full px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors"
              >
                {t("validation.ocr.scanScoresheet")}
              </button>
              <button
                type="button"
                onClick={onSkip}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <SkipForward className="w-4 h-4" aria-hidden="true" />
                {t("tour.actions.skip")}
              </button>
            </div>
          </div>
        )}

        {/* Processing step */}
        {step === "processing" && isProcessing && (
          <div
            className="flex flex-col items-center justify-center min-h-[50vh]"
            role="status"
            aria-live="polite"
          >
            <LoadingSpinner size="lg" className="mb-6" />
            <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {t("validation.ocr.processing")}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {progress?.status ?? t("validation.ocr.processingDescription")}
            </p>
            {progress && progress.progress > 0 && (
              <div className="w-64 h-2 bg-gray-200 dark:bg-gray-700 rounded-full mt-6 overflow-hidden">
                <div
                  className="h-full bg-primary-500 rounded-full transition-all duration-300"
                  style={{ width: `${progress.progress}%` }}
                />
              </div>
            )}
          </div>
        )}

        {/* Results step */}
        {step === "results" && (
          <div className="max-w-lg mx-auto">
            <div className="flex items-center gap-2 text-success-600 dark:text-success-400 mb-4">
              <CheckCircle className="w-6 h-6" aria-hidden="true" />
              <span className="text-lg font-medium">
                {t("validation.ocr.scanComplete")}
              </span>
            </div>

            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
              {t("validation.ocr.comparison.title")}
            </h3>

            <PlayerComparisonList
              results={comparisonResults}
              selectedPlayerIds={selectedPlayerIds}
              onTogglePlayer={handleTogglePlayer}
              onSelectAll={handleSelectAll}
              onDeselectAll={handleDeselectAll}
            />
          </div>
        )}

        {/* Error step */}
        {step === "error" && (
          <div
            className="flex flex-col items-center justify-center min-h-[50vh]"
            role="alert"
          >
            <AlertCircle
              className="w-16 h-16 text-danger-500 mb-6"
              aria-hidden="true"
            />
            <p className="text-lg font-medium text-danger-700 dark:text-danger-400 mb-2">
              {t("validation.ocr.scanFailed")}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-md mb-6">
              {error?.message ?? t("validation.ocr.errors.processingFailed")}
            </p>
            <button
              type="button"
              onClick={handleRetry}
              className="flex items-center gap-2 px-6 py-3 text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors font-medium"
            >
              <RefreshCw className="w-5 h-5" aria-hidden="true" />
              {t("validation.ocr.retryCapture")}
            </button>
          </div>
        )}
      </div>

      {/* Footer - only in results step */}
      {step === "results" && (
        <div className="flex gap-3 px-4 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={handleRetry}
            className="flex-1 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            {t("validation.ocr.retryCapture")}
          </button>
          <button
            type="button"
            onClick={handleApplyAndContinue}
            className="flex-1 px-4 py-3 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors"
          >
            {t("validation.ocr.useResults")}
          </button>
        </div>
      )}

      {/* Capture modal */}
      <OCRCaptureModal
        isOpen={showCaptureModal}
        onClose={() => {
          setShowCaptureModal(false);
          if (step === "capture") {
            setStep("intro");
          }
        }}
        onImageSelected={handleImageSelected}
      />
    </div>
  );
}
