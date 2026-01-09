import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useTranslation } from "@/shared/hooks/useTranslation";
import {
  useOCRScoresheet,
  compareRosters,
  useEasterEggDetection,
  EasterEggModal,
} from "@/features/ocr";
import type {
  ParsedGameSheet,
  PlayerComparisonResult,
  ParsedOfficial,
  OCRResult,
} from "@/features/ocr";
import type { ScoresheetType } from "@/features/ocr/utils/scoresheet-detector";
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
  FileText,
  PenTool,
  Image,
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
  const {
    processImage,
    progress,
    error,
    reset,
    ocrResult: hookOcrResult,
  } = useOCRScoresheet();
  const { easterEgg, checkForEasterEggs, dismissEasterEgg } =
    useEasterEggDetection();

  const [step, setStep] = useState<OCREntryStep>("intro");
  const [showCaptureModal, setShowCaptureModal] = useState(false);
  const [scoresheetType, setScoresheetType] =
    useState<ScoresheetType>("electronic");

  // Comparison results for both teams
  const [homeComparison, setHomeComparison] = useState<TeamComparison | null>(
    null,
  );
  const [awayComparison, setAwayComparison] = useState<TeamComparison | null>(
    null,
  );

  // Raw OCR data for debugging/transparency
  const [rawOcrData, setRawOcrData] = useState<ParsedGameSheet | null>(null);

  // Stored OCR result with bounding boxes
  const [storedOcrResult, setStoredOcrResult] = useState<OCRResult | null>(
    null,
  );

  // Image URL for displaying the captured scoresheet
  const [capturedImageUrl, setCapturedImageUrl] = useState<string | null>(null);

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
      setScoresheetType("electronic");
      setHomeComparison(null);
      setAwayComparison(null);
      setRawOcrData(null);
      setStoredOcrResult(null);
      // Revoke previous image URL to prevent memory leaks
      if (capturedImageUrl) {
        URL.revokeObjectURL(capturedImageUrl);
      }
      setCapturedImageUrl(null);
      setExpandedSections(new Set(["home-players", "away-players"]));
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- capturedImageUrl changes during reset
  }, [isOpen, reset]);

  // Clean up image URL on unmount
  useEffect(() => {
    return () => {
      if (capturedImageUrl) {
        URL.revokeObjectURL(capturedImageUrl);
      }
    };
  }, [capturedImageUrl]);

  // Sync OCR result from hook when it updates
  useEffect(() => {
    if (hookOcrResult) {
      setStoredOcrResult(hookOcrResult);
    }
  }, [hookOcrResult]);

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

      // Create object URL for displaying the image with bounding boxes
      const imageUrl = URL.createObjectURL(blob);
      setCapturedImageUrl(imageUrl);

      try {
        const parsed = await processImage(blob, scoresheetType);
        if (parsed) {
          // Store raw OCR data for debugging/transparency
          setRawOcrData(parsed);

          // Store OCR result with bounding boxes (from hook state)
          // Note: We'll get this from the hook after processing completes

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

          // Check for Easter egg conditions
          checkForEasterEggs(parsed);

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
      scoresheetType,
      matchOCRTeams,
      homeTeamName,
      awayTeamName,
      homeRosterPlayers,
      awayRosterPlayers,
      homeRosterCoaches,
      awayRosterCoaches,
      checkForEasterEggs,
    ],
  );

  // Handle retry
  const handleRetry = useCallback(() => {
    reset();
    setHomeComparison(null);
    setAwayComparison(null);
    setRawOcrData(null);
    setStoredOcrResult(null);
    if (capturedImageUrl) {
      URL.revokeObjectURL(capturedImageUrl);
    }
    setCapturedImageUrl(null);
    setStep("capture");
    setShowCaptureModal(true);
  }, [reset, capturedImageUrl]);

  // Start scanning with a specific type
  const handleStartScan = useCallback((type: ScoresheetType) => {
    setScoresheetType(type);
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
        {/* Intro step - type selection */}
        {step === "intro" && (
          <div className="flex flex-col items-center justify-center min-h-[50vh]">
            <Camera
              className="w-16 h-16 text-primary-400 dark:text-primary-500 mb-4"
              aria-hidden="true"
            />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {t("validation.ocr.scanScoresheet")}
            </h2>
            <p className="text-center text-gray-600 dark:text-gray-300 max-w-md mb-6">
              {t("validation.ocr.scoresheetType.title")}
            </p>

            {/* Scoresheet type selection buttons */}
            <div className="flex flex-col gap-3 w-full max-w-sm mb-6">
              <button
                type="button"
                onClick={() => handleStartScan("electronic")}
                className="w-full flex items-start gap-4 p-4 bg-white dark:bg-gray-800 border-2 border-primary-500 rounded-xl hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors text-left"
              >
                <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-900/30">
                  <FileText
                    className="w-6 h-6 text-primary-600 dark:text-primary-400"
                    aria-hidden="true"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="block text-base font-semibold text-gray-900 dark:text-white">
                    {t("validation.ocr.scoresheetType.electronic")}
                  </span>
                  <span className="block text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    {t("validation.ocr.scoresheetType.electronicDescription")}
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleStartScan("manuscript")}
                className="w-full flex items-start gap-4 p-4 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-xl hover:border-primary-300 dark:hover:border-primary-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
              >
                <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
                  <PenTool
                    className="w-6 h-6 text-gray-600 dark:text-gray-400"
                    aria-hidden="true"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="block text-base font-semibold text-gray-900 dark:text-white">
                    {t("validation.ocr.scoresheetType.manuscript")}
                  </span>
                  <span className="block text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    {t("validation.ocr.scoresheetType.manuscriptDescription")}
                  </span>
                </div>
              </button>
            </div>

            {/* Skip button */}
            <button
              type="button"
              onClick={onSkip}
              className="flex items-center justify-center gap-2 px-6 py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <SkipForward className="w-4 h-4" aria-hidden="true" />
              {t("tour.actions.skip")}
            </button>
          </div>
        )}

        {/* Processing step */}
        {step === "processing" && (
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

            {/* Raw OCR Data Panel */}
            {rawOcrData && (
              <RawOcrDataPanel
                data={rawOcrData}
                ocrResult={storedOcrResult}
                imageUrl={capturedImageUrl}
                expanded={expandedSections.has("raw-ocr-data")}
                onToggle={() => toggleSection("raw-ocr-data")}
              />
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
        scoresheetType={scoresheetType}
        onClose={() => {
          setShowCaptureModal(false);
          if (step === "capture") {
            setStep("intro");
          }
        }}
        onImageSelected={handleImageSelected}
      />

      {/* Easter egg modal */}
      {easterEgg.type && (
        <EasterEggModal
          isOpen={easterEgg.isOpen}
          type={easterEgg.type}
          onClose={dismissEasterEgg}
        />
      )}
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

// Raw OCR data panel for debugging/transparency
interface RawOcrDataPanelProps {
  data: ParsedGameSheet;
  ocrResult: OCRResult | null;
  imageUrl: string | null;
  expanded: boolean;
  onToggle: () => void;
}

function RawOcrDataPanel({
  data,
  ocrResult,
  imageUrl,
  expanded,
  onToggle,
}: RawOcrDataPanelProps) {
  const { t } = useTranslation();
  const Icon = expanded ? ChevronUp : ChevronDown;

  return (
    <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between py-2 px-3 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        aria-expanded={expanded}
        aria-controls="raw-ocr-data"
      >
        <div className="flex items-center gap-2">
          <Icon
            className="w-4 h-4 text-gray-500 dark:text-gray-400"
            aria-hidden="true"
          />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t("validation.ocr.rawData.title")}
          </span>
        </div>
      </button>
      {expanded && (
        <div id="raw-ocr-data" className="mt-3 space-y-4">
          {/* Image with bounding box overlay */}
          {imageUrl && ocrResult && (
            <OCRImageOverlay
              imageUrl={imageUrl}
              ocrResult={ocrResult}
              parsedData={data}
            />
          )}
          {/* Team A */}
          <RawTeamData team={data.teamA} label={t("validation.ocr.rawData.teamA")} />
          {/* Team B */}
          <RawTeamData team={data.teamB} label={t("validation.ocr.rawData.teamB")} />
        </div>
      )}
    </div>
  );
}

// Raw team data display
interface RawTeamDataProps {
  team: ParsedGameSheet["teamA"];
  label: string;
}

function RawTeamData({ team, label }: RawTeamDataProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
      <div className="mb-2">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
          {label}
        </span>
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          {team.name || "-"}
        </p>
      </div>

      {/* Players */}
      {team.players.length > 0 && (
        <div className="mb-3">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {t("validation.ocr.rawData.players")} ({team.players.length})
          </span>
          <div className="mt-1 overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="text-gray-500 dark:text-gray-400">
                  <th scope="col" className="text-left pr-2 font-medium">
                    {t("validation.ocr.rawData.shirtNumber")}
                  </th>
                  <th scope="col" className="text-left pr-2 font-medium">
                    {t("validation.ocr.rawData.name")}
                  </th>
                  <th scope="col" className="text-left font-medium">
                    {t("validation.ocr.rawData.licenseStatus")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {team.players.map((player) => (
                  <tr
                    key={`${player.shirtNumber}-${player.rawName || player.displayName}`}
                    className="text-gray-700 dark:text-gray-300 border-t border-gray-200 dark:border-gray-700"
                  >
                    <td className="pr-2 py-0.5">
                      {player.shirtNumber ?? "-"}
                    </td>
                    <td className="pr-2 py-0.5 font-mono">
                      {player.rawName || player.displayName}
                    </td>
                    <td className="py-0.5">{player.licenseStatus || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Officials */}
      {team.officials.length > 0 && (
        <div>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {t("validation.ocr.rawData.officials")} ({team.officials.length})
          </span>
          <div className="mt-1 overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="text-gray-500 dark:text-gray-400">
                  <th scope="col" className="text-left pr-2 font-medium">
                    {t("validation.ocr.rawData.role")}
                  </th>
                  <th scope="col" className="text-left font-medium">
                    {t("validation.ocr.rawData.name")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {team.officials.map((official) => (
                  <tr
                    key={`${official.role}-${official.rawName || official.displayName}`}
                    className="text-gray-700 dark:text-gray-300 border-t border-gray-200 dark:border-gray-700"
                  >
                    <td className="pr-2 py-0.5">{official.role}</td>
                    <td className="py-0.5 font-mono">
                      {official.rawName || official.displayName}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// OCR Image overlay component showing bounding boxes
interface OCRImageOverlayProps {
  imageUrl: string;
  ocrResult: OCRResult;
  parsedData: ParsedGameSheet;
}

function OCRImageOverlay({
  imageUrl,
  ocrResult,
  parsedData,
}: OCRImageOverlayProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageSize, setImageSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [showOverlay, setShowOverlay] = useState(true);

  // Get all parsed names for highlighting
  const parsedNames = useMemo(() => {
    const names = new Set<string>();
    [...parsedData.teamA.players, ...parsedData.teamB.players].forEach((p) => {
      if (p.rawName) names.add(p.rawName.toLowerCase());
      if (p.displayName) names.add(p.displayName.toLowerCase());
      if (p.lastName) names.add(p.lastName.toLowerCase());
    });
    [...parsedData.teamA.officials, ...parsedData.teamB.officials].forEach(
      (o) => {
        if (o.rawName) names.add(o.rawName.toLowerCase());
        if (o.displayName) names.add(o.displayName.toLowerCase());
        if (o.lastName) names.add(o.lastName.toLowerCase());
      },
    );
    return names;
  }, [parsedData]);

  // Check if a word matches any parsed name
  const isMatchedWord = useCallback(
    (word: string) => {
      const lower = word.toLowerCase();
      return parsedNames.has(lower);
    },
    [parsedNames],
  );

  // Handle image load to get dimensions and container width
  const handleImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget;
      setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
      // Get container width after image loads
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    },
    [],
  );

  // Calculate scale factor based on container width
  const scale = useMemo(() => {
    if (!imageSize || containerWidth === 0) return 1;
    return containerWidth / imageSize.width;
  }, [imageSize, containerWidth]);

  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Image
            className="w-4 h-4 text-gray-500 dark:text-gray-400"
            aria-hidden="true"
          />
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {t("validation.ocr.rawData.imageOverlay")}
          </span>
        </div>
        {ocrResult.hasPreciseBoundingBoxes && (
          <button
            type="button"
            onClick={() => setShowOverlay(!showOverlay)}
            className="text-xs px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            {showOverlay
              ? t("validation.ocr.rawData.hideOverlay")
              : t("validation.ocr.rawData.showOverlay")}
          </button>
        )}
      </div>

      {/* Legend - only show when we have precise bounding boxes */}
      {ocrResult.hasPreciseBoundingBoxes && (
        <div className="flex items-center gap-4 mb-2 text-xs">
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded border-2 border-success-500 bg-success-500/20" />
            <span className="text-gray-600 dark:text-gray-400">
              {t("validation.ocr.rawData.matchedWords")}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded border-2 border-gray-400 bg-gray-400/20" />
            <span className="text-gray-600 dark:text-gray-400">
              {t("validation.ocr.rawData.otherWords")}
            </span>
          </div>
        </div>
      )}

      {/* Image container */}
      <div
        ref={containerRef}
        className="relative overflow-auto max-h-96 rounded border border-gray-200 dark:border-gray-700"
      >
        <img
          src={imageUrl}
          alt={t("validation.ocr.rawData.capturedImage")}
          onLoad={handleImageLoad}
          className="w-full h-auto"
        />

        {/* Bounding box overlay - only show when we have precise bounding boxes */}
        {ocrResult.hasPreciseBoundingBoxes && showOverlay && imageSize && (
          <svg
            className="absolute top-0 left-0 pointer-events-none"
            style={{
              width: imageSize.width * scale,
              height: imageSize.height * scale,
            }}
            viewBox={`0 0 ${imageSize.width} ${imageSize.height}`}
            preserveAspectRatio="none"
          >
            {ocrResult.words.map((word) => {
              const isMatched = isMatchedWord(word.text);
              return (
                <g key={`${word.bbox.x0}-${word.bbox.y0}-${word.bbox.x1}-${word.bbox.y1}`}>
                  <rect
                    x={word.bbox.x0}
                    y={word.bbox.y0}
                    width={word.bbox.x1 - word.bbox.x0}
                    height={word.bbox.y1 - word.bbox.y0}
                    fill={isMatched ? "rgba(34, 197, 94, 0.2)" : "rgba(156, 163, 175, 0.15)"}
                    stroke={isMatched ? "#22c55e" : "#9ca3af"}
                    strokeWidth={isMatched ? 2 : 1}
                    rx={2}
                  />
                </g>
              );
            })}
          </svg>
        )}
      </div>

      {/* Word count info */}
      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        {ocrResult.words.length} {t("validation.ocr.rawData.wordsDetected")}
        {" • "}
        {ocrResult.words.filter((w) => isMatchedWord(w.text)).length}{" "}
        {t("validation.ocr.rawData.wordsMatched")}
      </div>

      {/* Raw OCR text - shown when bounding boxes are not precise */}
      {!ocrResult.hasPreciseBoundingBoxes && ocrResult.fullText && (
        <div className="mt-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {t("validation.ocr.rawData.rawText")}
            </span>
          </div>
          <pre className="text-xs text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 p-3 rounded border border-gray-200 dark:border-gray-700 overflow-auto max-h-64 whitespace-pre-wrap break-words">
            {ocrResult.fullText}
          </pre>
        </div>
      )}
    </div>
  );
}
