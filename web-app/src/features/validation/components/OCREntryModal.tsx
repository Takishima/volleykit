import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { useOCRScoresheet, compareRosters } from "@/features/ocr";
import type {
  ParsedGameSheet,
  PlayerComparisonResult,
  ParsedOfficial,
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
  SkipForward,
  X,
  ChevronDown,
  ChevronUp,
} from "@/shared/components/icons";

type OCREntryStep = "intro" | "capture" | "processing" | "results" | "error";

/** Coach info for comparison */
export interface CoachForComparison {
  id: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  role: "head" | "firstAssistant" | "secondAssistant";
}

/** Comparison result for a single team */
interface TeamComparison {
  teamName: string;
  ocrTeamName: string;
  playerResults: PlayerComparisonResult[];
  coachResults: PlayerComparisonResult[];
}

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
  /** Home roster coaches for comparison */
  homeRosterCoaches: CoachForComparison[];
  /** Away roster coaches for comparison */
  awayRosterCoaches: CoachForComparison[];
  /** Callback when user skips OCR */
  onSkip: () => void;
  /** Callback when user completes OCR */
  onComplete: () => void;
  /** Callback to close */
  onClose: () => void;
}

/**
 * Convert ParsedOfficial to a format compatible with compareRosters
 */
function officialsToPlayers(officials: ParsedOfficial[]) {
  return officials.map((official) => ({
    shirtNumber: null,
    lastName: official.lastName,
    firstName: official.firstName,
    displayName: official.displayName,
    rawName: official.rawName,
    licenseStatus: "",
  }));
}

/**
 * Convert CoachForComparison to RosterPlayerForComparison format
 */
function coachesToRosterFormat(coaches: CoachForComparison[]) {
  return coaches.map((coach) => ({
    id: coach.id,
    displayName: coach.displayName,
    firstName: coach.firstName,
    lastName: coach.lastName,
  }));
}

/**
 * Full-screen OCR entry modal that appears before the validation wizard.
 * Shows comparison results for both teams (players and coaches).
 */
export function OCREntryModal({
  isOpen,
  homeTeamName,
  awayTeamName,
  homeRosterPlayers,
  awayRosterPlayers,
  homeRosterCoaches,
  awayRosterCoaches,
  onSkip,
  onComplete,
  onClose,
}: OCREntryModalProps) {
  const { t } = useTranslation();
  const { processImage, isProcessing, progress, error, reset } =
    useOCRScoresheet();

  const [step, setStep] = useState<OCREntryStep>("intro");
  const [showCaptureModal, setShowCaptureModal] = useState(false);

  // Comparison results for both teams
  const [homeComparison, setHomeComparison] = useState<TeamComparison | null>(
    null,
  );
  const [awayComparison, setAwayComparison] = useState<TeamComparison | null>(
    null,
  );

  // Expanded sections state
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["home-players", "away-players"]),
  );

  // Guard against rapid double-clicks
  const isProcessingRef = useRef(false);

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
      setHomeComparison(null);
      setAwayComparison(null);
      setExpandedSections(new Set(["home-players", "away-players"]));
      reset();
    }
  }, [isOpen, reset]);

  // Match OCR team to home/away based on team names
  const matchOCRTeams = useCallback(
    (parsed: ParsedGameSheet) => {
      const teamANameLower = parsed.teamA.name.toLowerCase();
      const teamBNameLower = parsed.teamB.name.toLowerCase();
      const homeNameLower = homeTeamName.toLowerCase();
      const awayNameLower = awayTeamName.toLowerCase();

      // Check if teamA matches home or away
      const teamAMatchesHome =
        teamANameLower.includes(homeNameLower) ||
        homeNameLower.includes(teamANameLower);
      const teamAMatchesAway =
        teamANameLower.includes(awayNameLower) ||
        awayNameLower.includes(teamANameLower);
      const teamBMatchesHome =
        teamBNameLower.includes(homeNameLower) ||
        homeNameLower.includes(teamBNameLower);
      const teamBMatchesAway =
        teamBNameLower.includes(awayNameLower) ||
        awayNameLower.includes(teamBNameLower);

      // Determine which OCR team is home and which is away
      if (teamAMatchesHome && !teamAMatchesAway) {
        return { homeOCR: parsed.teamA, awayOCR: parsed.teamB };
      }
      if (teamAMatchesAway && !teamAMatchesHome) {
        return { homeOCR: parsed.teamB, awayOCR: parsed.teamA };
      }
      if (teamBMatchesHome && !teamBMatchesAway) {
        return { homeOCR: parsed.teamB, awayOCR: parsed.teamA };
      }
      if (teamBMatchesAway && !teamBMatchesHome) {
        return { homeOCR: parsed.teamA, awayOCR: parsed.teamB };
      }

      // Default: teamA = home, teamB = away (column order on scoresheet)
      return { homeOCR: parsed.teamA, awayOCR: parsed.teamB };
    },
    [homeTeamName, awayTeamName],
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
          const { homeOCR, awayOCR } = matchOCRTeams(parsed);

          // Check if we have any players
          if (
            homeOCR.players.length === 0 &&
            awayOCR.players.length === 0
          ) {
            setStep("error");
            return;
          }

          // Compare home team players
          const homePlayerResults = compareRosters(
            homeOCR.players,
            homeRosterPlayers.map((p) => ({
              id: p.id,
              displayName: p.displayName,
              firstName: p.firstName,
              lastName: p.lastName,
            })),
          );

          // Compare home team coaches
          const homeCoachResults = compareRosters(
            officialsToPlayers(homeOCR.officials),
            coachesToRosterFormat(homeRosterCoaches),
          );

          // Compare away team players
          const awayPlayerResults = compareRosters(
            awayOCR.players,
            awayRosterPlayers.map((p) => ({
              id: p.id,
              displayName: p.displayName,
              firstName: p.firstName,
              lastName: p.lastName,
            })),
          );

          // Compare away team coaches
          const awayCoachResults = compareRosters(
            officialsToPlayers(awayOCR.officials),
            coachesToRosterFormat(awayRosterCoaches),
          );

          setHomeComparison({
            teamName: homeTeamName,
            ocrTeamName: homeOCR.name,
            playerResults: homePlayerResults,
            coachResults: homeCoachResults,
          });

          setAwayComparison({
            teamName: awayTeamName,
            ocrTeamName: awayOCR.name,
            playerResults: awayPlayerResults,
            coachResults: awayCoachResults,
          });

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
    [
      processImage,
      matchOCRTeams,
      homeTeamName,
      awayTeamName,
      homeRosterPlayers,
      awayRosterPlayers,
      homeRosterCoaches,
      awayRosterCoaches,
    ],
  );

  // Handle retry
  const handleRetry = useCallback(() => {
    reset();
    setHomeComparison(null);
    setAwayComparison(null);
    setStep("capture");
    setShowCaptureModal(true);
  }, [reset]);

  // Start scanning
  const handleStartScan = useCallback(() => {
    setStep("capture");
    setShowCaptureModal(true);
  }, []);

  // Toggle section expansion
  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  }, []);

  if (!isOpen) return null;

  // Count discrepancies for summary
  const countDiscrepancies = (results: PlayerComparisonResult[]) => {
    const ocrOnly = results.filter((r) => r.status === "ocr-only").length;
    const rosterOnly = results.filter((r) => r.status === "roster-only").length;
    return ocrOnly + rosterOnly;
  };

  const totalDiscrepancies =
    (homeComparison
      ? countDiscrepancies(homeComparison.playerResults) +
        countDiscrepancies(homeComparison.coachResults)
      : 0) +
    (awayComparison
      ? countDiscrepancies(awayComparison.playerResults) +
        countDiscrepancies(awayComparison.coachResults)
      : 0);

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
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-2 text-success-600 dark:text-success-400 mb-4">
              <CheckCircle className="w-6 h-6" aria-hidden="true" />
              <span className="text-lg font-medium">
                {t("validation.ocr.scanComplete")}
              </span>
            </div>

            {totalDiscrepancies > 0 && (
              <div className="mb-4 p-3 bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-lg">
                <p className="text-sm text-warning-700 dark:text-warning-400">
                  {totalDiscrepancies} discrepancies found
                </p>
              </div>
            )}

            {/* Home Team Section */}
            {homeComparison && (
              <div className="mb-6">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
                  {homeComparison.teamName}
                  {homeComparison.ocrTeamName &&
                    homeComparison.ocrTeamName !== homeComparison.teamName && (
                      <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">
                        (OCR: {homeComparison.ocrTeamName})
                      </span>
                    )}
                </h3>

                {/* Home Players */}
                <CollapsibleSection
                  title={t("validation.ocr.players")}
                  count={homeComparison.playerResults.length}
                  discrepancies={countDiscrepancies(
                    homeComparison.playerResults,
                  )}
                  expanded={expandedSections.has("home-players")}
                  onToggle={() => toggleSection("home-players")}
                  sectionId="home-players"
                >
                  <PlayerComparisonList
                    results={homeComparison.playerResults}
                    selectedPlayerIds={new Set()}
                    onTogglePlayer={() => {}}
                    readOnly
                  />
                </CollapsibleSection>

                {/* Home Coaches */}
                {homeComparison.coachResults.length > 0 && (
                  <CollapsibleSection
                    title={t("validation.ocr.coaches")}
                    count={homeComparison.coachResults.length}
                    discrepancies={countDiscrepancies(
                      homeComparison.coachResults,
                    )}
                    expanded={expandedSections.has("home-coaches")}
                    onToggle={() => toggleSection("home-coaches")}
                    sectionId="home-coaches"
                  >
                    <PlayerComparisonList
                      results={homeComparison.coachResults}
                      selectedPlayerIds={new Set()}
                      onTogglePlayer={() => {}}
                      readOnly
                    />
                  </CollapsibleSection>
                )}
              </div>
            )}

            {/* Away Team Section */}
            {awayComparison && (
              <div className="mb-6">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
                  {awayComparison.teamName}
                  {awayComparison.ocrTeamName &&
                    awayComparison.ocrTeamName !== awayComparison.teamName && (
                      <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">
                        (OCR: {awayComparison.ocrTeamName})
                      </span>
                    )}
                </h3>

                {/* Away Players */}
                <CollapsibleSection
                  title={t("validation.ocr.players")}
                  count={awayComparison.playerResults.length}
                  discrepancies={countDiscrepancies(
                    awayComparison.playerResults,
                  )}
                  expanded={expandedSections.has("away-players")}
                  onToggle={() => toggleSection("away-players")}
                  sectionId="away-players"
                >
                  <PlayerComparisonList
                    results={awayComparison.playerResults}
                    selectedPlayerIds={new Set()}
                    onTogglePlayer={() => {}}
                    readOnly
                  />
                </CollapsibleSection>

                {/* Away Coaches */}
                {awayComparison.coachResults.length > 0 && (
                  <CollapsibleSection
                    title={t("validation.ocr.coaches")}
                    count={awayComparison.coachResults.length}
                    discrepancies={countDiscrepancies(
                      awayComparison.coachResults,
                    )}
                    expanded={expandedSections.has("away-coaches")}
                    onToggle={() => toggleSection("away-coaches")}
                    sectionId="away-coaches"
                  >
                    <PlayerComparisonList
                      results={awayComparison.coachResults}
                      selectedPlayerIds={new Set()}
                      onTogglePlayer={() => {}}
                      readOnly
                    />
                  </CollapsibleSection>
                )}
              </div>
            )}
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
            onClick={onComplete}
            className="flex-1 px-4 py-3 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors"
          >
            {t("validation.ocr.continueToValidation")}
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

// Collapsible section component
interface CollapsibleSectionProps {
  title: string;
  count: number;
  discrepancies: number;
  expanded: boolean;
  onToggle: () => void;
  sectionId: string;
  children: React.ReactNode;
}

function CollapsibleSection({
  title,
  count,
  discrepancies,
  expanded,
  onToggle,
  sectionId,
  children,
}: CollapsibleSectionProps) {
  const Icon = expanded ? ChevronUp : ChevronDown;

  return (
    <div className="mb-3">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        aria-expanded={expanded}
        aria-controls={sectionId}
      >
        <div className="flex items-center gap-2">
          <Icon
            className="w-4 h-4 text-gray-500 dark:text-gray-400"
            aria-hidden="true"
          />
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {title}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            ({count})
          </span>
        </div>
        {discrepancies > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-400">
            {discrepancies} discrepancies
          </span>
        )}
      </button>
      {expanded && (
        <div id={sectionId} className="mt-2 pl-6">
          {children}
        </div>
      )}
    </div>
  );
}
