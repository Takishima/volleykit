import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { useOCRScoresheet, compareRosters } from "@/features/ocr";
import type {
  ParsedGameSheet,
  ParsedTeam,
  PlayerComparisonResult,
} from "@/features/ocr";
import type { RosterPlayer } from "@/features/validation/hooks/useNominationList";
import { OCRCaptureModal } from "./OCRCaptureModal";
import { PlayerComparisonList } from "./PlayerComparisonList";
import { LoadingSpinner } from "@/shared/components/LoadingSpinner";
import {
  Camera,
  AlertCircle,
  CheckCircle,
  RefreshCw,
} from "@/shared/components/icons";

type OCRPanelStep = "capture" | "processing" | "results" | "error";

interface OCRPanelProps {
  /** Team being processed (home or away) */
  team: "home" | "away";
  /** Team name for display */
  teamName: string;
  /** Current roster players to compare against */
  rosterPlayers: RosterPlayer[];
  /** Callback when user confirms OCR results */
  onApplyResults: (matchedPlayerIds: string[]) => void;
  /** Callback to close the panel */
  onClose: () => void;
  /** Whether the panel is open */
  isOpen: boolean;
}

/**
 * Panel for OCR scanning and player comparison workflow.
 * Handles image capture, OCR processing, and player matching.
 */
export function OCRPanel({
  team,
  teamName,
  rosterPlayers,
  onApplyResults,
  onClose,
  isOpen,
}: OCRPanelProps) {
  const { t } = useTranslation();
  const { processImage, isProcessing, progress, error, reset } =
    useOCRScoresheet();

  const [step, setStep] = useState<OCRPanelStep>("capture");
  const [showCaptureModal, setShowCaptureModal] = useState(false);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(
    new Set(),
  );
  const [processedResult, setProcessedResult] =
    useState<ParsedGameSheet | null>(null);

  // Guard against rapid double-clicks triggering duplicate processing
  const isProcessingRef = useRef(false);

  // Handle Escape key to close panel (when capture modal is not open)
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

  // Determine which team's data to use from OCR results
  const getOCRTeam = useCallback(
    (parsed: ParsedGameSheet): ParsedTeam | null => {
      // Try to match by team name first
      const homeMatch =
        parsed.teamA.name.toLowerCase().includes(teamName.toLowerCase()) ||
        teamName.toLowerCase().includes(parsed.teamA.name.toLowerCase());
      const awayMatch =
        parsed.teamB.name.toLowerCase().includes(teamName.toLowerCase()) ||
        teamName.toLowerCase().includes(parsed.teamB.name.toLowerCase());

      if (homeMatch && !awayMatch) return parsed.teamA;
      if (awayMatch && !homeMatch) return parsed.teamB;

      // Fall back to position (teamA = home, teamB = away)
      return team === "home" ? parsed.teamA : parsed.teamB;
    },
    [team, teamName],
  );

  // Compare OCR results with roster
  const comparisonResults = useMemo<PlayerComparisonResult[]>(() => {
    if (!processedResult) return [];

    const ocrTeam = getOCRTeam(processedResult);
    if (!ocrTeam) return [];

    const rosterForComparison = rosterPlayers.map((p) => ({
      id: p.id,
      displayName: p.displayName,
      firstName: p.firstName,
      lastName: p.lastName,
    }));

    return compareRosters(ocrTeam.players, rosterForComparison);
  }, [processedResult, rosterPlayers, getOCRTeam]);

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

  // Handle image selection from capture modal
  const handleImageSelected = useCallback(
    async (blob: Blob) => {
      // Guard against duplicate processing from rapid clicks
      if (isProcessingRef.current) return;
      isProcessingRef.current = true;

      setShowCaptureModal(false);
      setStep("processing");

      try {
        const parsed = await processImage(blob);
        if (parsed) {
          setProcessedResult(parsed);

          // Check if we found any players
          const ocrTeam = getOCRTeam(parsed);
          if (!ocrTeam || ocrTeam.players.length === 0) {
            setStep("error");
            return;
          }

          // Calculate comparison and initialize selection
          const rosterForComparison = rosterPlayers.map((p) => ({
            id: p.id,
            displayName: p.displayName,
            firstName: p.firstName,
            lastName: p.lastName,
          }));
          const results = compareRosters(ocrTeam.players, rosterForComparison);
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

  // Handle player selection toggle
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

  // Handle select all
  const handleSelectAll = useCallback(() => {
    const matchedIds = comparisonResults
      .filter((r) => r.status === "match" && r.rosterPlayerId)
      .map((r) => r.rosterPlayerId as string);
    setSelectedPlayerIds(new Set(matchedIds));
  }, [comparisonResults]);

  // Handle deselect all
  const handleDeselectAll = useCallback(() => {
    setSelectedPlayerIds(new Set());
  }, []);

  // Handle apply results
  const handleApplyResults = useCallback(() => {
    onApplyResults(Array.from(selectedPlayerIds));
    onClose();
  }, [onApplyResults, onClose, selectedPlayerIds]);

  // Handle retry
  const handleRetry = useCallback(() => {
    reset();
    setProcessedResult(null);
    setSelectedPlayerIds(new Set());
    setStep("capture");
    setShowCaptureModal(true);
  }, [reset]);

  // Open capture modal when panel opens
  const handleOpenCapture = useCallback(() => {
    setShowCaptureModal(true);
  }, []);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ocr-panel-title"
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2
            id="ocr-panel-title"
            className="text-lg font-semibold text-gray-900 dark:text-white"
          >
            {t("validation.ocr.scanScoresheet")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            {t("validation.ocr.cancel")}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Capture step - show prompt to open capture modal */}
          {step === "capture" && !showCaptureModal && (
            <div className="py-8 flex flex-col items-center justify-center">
              <Camera
                className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4"
                aria-hidden="true"
              />
              <p className="text-sm text-gray-600 dark:text-gray-300 text-center mb-4">
                {t("validation.ocr.scanScoresheetDescription")}
              </p>
              <button
                type="button"
                onClick={handleOpenCapture}
                className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors"
              >
                {t("validation.ocr.scanScoresheet")}
              </button>
            </div>
          )}

          {/* Processing step */}
          {step === "processing" && isProcessing && (
            <div
              className="py-8 flex flex-col items-center justify-center"
              role="status"
              aria-live="polite"
            >
              <LoadingSpinner size="lg" className="mb-4" />
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                {t("validation.ocr.processing")}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {progress?.status ?? t("validation.ocr.processingDescription")}
              </p>
              {progress && progress.progress > 0 && (
                <div className="w-48 h-2 bg-gray-200 dark:bg-gray-700 rounded-full mt-4 overflow-hidden">
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
            <div className="space-y-4">
              {/* Success header */}
              <div className="flex items-center gap-2 text-success-600 dark:text-success-400">
                <CheckCircle className="w-5 h-5" aria-hidden="true" />
                <span className="font-medium">
                  {t("validation.ocr.scanComplete")}
                </span>
              </div>

              {/* Team name from OCR */}
              {processedResult && (
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {teamName}
                </p>
              )}

              {/* Comparison title */}
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                {t("validation.ocr.comparison.title")}
              </h3>

              {/* Comparison list */}
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
              className="py-8 flex flex-col items-center justify-center"
              role="alert"
            >
              <AlertCircle
                className="w-12 h-12 text-danger-500 mb-4"
                aria-hidden="true"
              />
              <p className="text-sm font-medium text-danger-700 dark:text-danger-400 mb-2">
                {t("validation.ocr.scanFailed")}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center mb-4">
                {error?.message ?? t("validation.ocr.errors.processingFailed")}
              </p>
              <button
                type="button"
                onClick={handleRetry}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" aria-hidden="true" />
                {t("validation.ocr.retryCapture")}
              </button>
            </div>
          )}
        </div>

        {/* Footer - only show in results step */}
        {step === "results" && (
          <div className="flex gap-3 p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
            <button
              type="button"
              onClick={handleRetry}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              {t("validation.ocr.retryCapture")}
            </button>
            <button
              type="button"
              onClick={handleApplyResults}
              disabled={selectedPlayerIds.size === 0}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              {t("validation.ocr.useResults")}
            </button>
          </div>
        )}
      </div>

      {/* Capture modal */}
      <OCRCaptureModal
        isOpen={showCaptureModal}
        onClose={() => setShowCaptureModal(false)}
        onImageSelected={handleImageSelected}
      />
    </div>
  );
}
