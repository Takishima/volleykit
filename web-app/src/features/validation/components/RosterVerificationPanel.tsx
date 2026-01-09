import { useState, useCallback, useEffect, useRef, useMemo, lazy, Suspense } from "react";
import type { PossibleNomination, NominationList, Schemas } from "@/api/client";
import type { ValidatedPersonSearchResult } from "@/api/validation";
import { useTranslation } from "@/shared/hooks/useTranslation";
import {
  useNominationList,
  type RosterPlayer,
  type RosterModifications,
  type CoachRole,
  type CoachInfo,
  type CoachModifications,
} from "@/features/validation/hooks/useNominationList";
import { PlayerListItem } from "./PlayerListItem";
import { AddPlayerSheet } from "./AddPlayerSheet";
import { CoachesSection } from "./CoachesSection";
import { AddCoachSheet } from "./AddCoachSheet";
import {
  UserPlus,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Camera,
} from "@/shared/components/icons";
import { LoadingSpinner } from "@/shared/components/LoadingSpinner";
import { useSettingsStore } from "@/shared/stores/settings";
import { formatRosterEntries, getMaxLastNameWidth } from "@/shared/utils/date-helpers";

// Lazy load OCR panel to reduce initial bundle size
const OCRPanel = lazy(() => import("./OCRPanel").then(m => ({ default: m.OCRPanel })));

type PersonSummary = Schemas["PersonSummary"];

type ExpandedSection = "coaches" | "players";

export interface RosterPanelModifications {
  players: RosterModifications;
  coaches: CoachModifications;
}

interface RosterVerificationPanelProps {
  team: "home" | "away";
  teamName: string;
  gameId: string;
  onModificationsChange?: (modifications: RosterPanelModifications) => void;
  onAddPlayerSheetOpenChange?: (isOpen: boolean) => void;
  /** When true, shows roster in view-only mode without edit controls */
  readOnly?: boolean;
  /** Initial player modifications to restore state when remounting */
  initialModifications?: RosterModifications;
  /** Initial coach modifications to restore state when remounting */
  initialCoachModifications?: CoachModifications;
  /** Pre-fetched nomination list data to avoid duplicate API calls */
  prefetchedNominationList?: NominationList | null;
}

interface CollapsibleHeaderProps {
  title: string;
  count: number;
  countLabel: string;
  expanded: boolean;
  onToggle: () => void;
  /** ID of the section this header controls, for aria-controls */
  sectionId: string;
}

function CollapsibleHeader({
  title,
  count,
  countLabel,
  expanded,
  onToggle,
  sectionId,
}: CollapsibleHeaderProps) {
  const Icon = expanded ? ChevronUp : ChevronDown;

  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between py-3 px-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-lg"
      aria-expanded={expanded}
      aria-controls={sectionId}
    >
      <div className="flex items-center gap-2">
        <Icon
          className="w-5 h-5 text-text-muted dark:text-text-muted-dark"
          aria-hidden="true"
        />
        <span className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
          {title}
        </span>
      </div>
      <span className="text-xs text-text-muted dark:text-text-muted-dark">
        {countLabel.replace("{count}", String(count))}
      </span>
    </button>
  );
}

export function RosterVerificationPanel({
  team,
  teamName,
  gameId,
  onModificationsChange,
  onAddPlayerSheetOpenChange,
  readOnly = false,
  initialModifications,
  initialCoachModifications,
  prefetchedNominationList,
}: RosterVerificationPanelProps) {
  const { t } = useTranslation();
  const { nominationList, players, isLoading, isError, refetch } =
    useNominationList({
      gameId,
      team,
      prefetchedData: prefetchedNominationList,
    });
  const { isOCREnabled } = useSettingsStore();

  // Accordion state - players expanded by default as per user request
  const [expandedSection, setExpandedSection] =
    useState<ExpandedSection>("players");

  // Player modifications state
  const [addedPlayers, setAddedPlayers] = useState<RosterPlayer[]>(
    () => initialModifications?.added ?? [],
  );
  const [removedPlayerIds, setRemovedPlayerIds] = useState<Set<string>>(
    () => new Set(initialModifications?.removed ?? []),
  );

  // Coach modifications state
  const [coachAdditions, setCoachAdditions] = useState<Map<CoachRole, CoachInfo>>(
    () => initialCoachModifications?.added ?? new Map(),
  );
  const [coachRemovals, setCoachRemovals] = useState<Set<CoachRole>>(
    () => initialCoachModifications?.removed ?? new Set(),
  );

  // Sheet states
  const [isAddPlayerSheetOpen, setIsAddPlayerSheetOpen] = useState(false);
  const [isAddCoachSheetOpen, setIsAddCoachSheetOpen] = useState(false);
  const [addingCoachRole, setAddingCoachRole] = useState<CoachRole>("head");

  // OCR panel state
  const [isOCRPanelOpen, setIsOCRPanelOpen] = useState(false);

  // Ref for stable callback
  const onModificationsChangeRef = useRef(onModificationsChange);
  useEffect(() => {
    onModificationsChangeRef.current = onModificationsChange;
  }, [onModificationsChange]);

  // Notify parent when any modifications change
  useEffect(() => {
    onModificationsChangeRef.current?.({
      players: {
        added: addedPlayers,
        removed: [...removedPlayerIds],
      },
      coaches: {
        added: coachAdditions,
        removed: coachRemovals,
      },
    });
  }, [addedPlayers, removedPlayerIds, coachAdditions, coachRemovals]);

  // Notify parent when AddPlayerSheet open state changes
  useEffect(() => {
    onAddPlayerSheetOpenChange?.(isAddPlayerSheetOpen);
  }, [isAddPlayerSheetOpen, onAddPlayerSheetOpenChange]);

  // Player handlers
  const handleRemovePlayer = useCallback((playerId: string) => {
    setRemovedPlayerIds((prev) => {
      const newSet = new Set(prev);
      newSet.add(playerId);
      return newSet;
    });
  }, []);

  const handleUndoPlayerRemoval = useCallback((playerId: string) => {
    setRemovedPlayerIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(playerId);
      return newSet;
    });
  }, []);

  const handleAddPlayer = useCallback((nomination: PossibleNomination) => {
    const playerId = nomination.indoorPlayer?.__identity;
    if (!playerId) return;

    const person = nomination.indoorPlayer?.person;
    const newPlayer: RosterPlayer = {
      id: playerId,
      displayName:
        person?.displayName ??
        `${person?.firstName ?? ""} ${person?.lastName ?? ""}`.trim(),
      firstName: person?.firstName,
      lastName: person?.lastName,
      birthday: person?.birthday,
      licenseCategory: nomination.licenseCategory,
      isNewlyAdded: true,
    };

    setAddedPlayers((prev) => [...prev, newPlayer]);
  }, []);

  const handleRemoveAddedPlayer = useCallback((playerId: string) => {
    setAddedPlayers((prev) => prev.filter((p) => p.id !== playerId));
  }, []);

  // Coach handlers
  const handleAddCoach = useCallback((role: CoachRole) => {
    setAddingCoachRole(role);
    setIsAddCoachSheetOpen(true);
  }, []);

  const handleRemoveCoach = useCallback((role: CoachRole) => {
    // If there's a pending addition for this role, just remove it
    if (coachAdditions.has(role)) {
      setCoachAdditions((prev) => {
        const newMap = new Map(prev);
        newMap.delete(role);
        return newMap;
      });
      return;
    }

    // Toggle removal state for existing coaches
    setCoachRemovals((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(role)) {
        newSet.delete(role);
      } else {
        newSet.add(role);
      }
      return newSet;
    });
  }, [coachAdditions]);

  const handleSelectCoach = useCallback(
    (coach: ValidatedPersonSearchResult, role: CoachRole) => {
      const coachInfo: CoachInfo = {
        id: coach.__identity,
        displayName: coach.displayName ?? "",
        firstName: coach.firstName,
        lastName: coach.lastName,
        birthday: coach.birthday,
      };

      setCoachAdditions((prev) => {
        const newMap = new Map(prev);
        newMap.set(role, coachInfo);
        return newMap;
      });

      // Clear any pending removal for this role
      setCoachRemovals((prev) => {
        const newSet = new Set(prev);
        newSet.delete(role);
        return newSet;
      });
    },
    [],
  );

  // OCR handlers
  const handleOCRApplyResults = useCallback(
    (matchedPlayerIds: string[]) => {
      // Clear any removed flags for matched players
      setRemovedPlayerIds((prev) => {
        const newSet = new Set(prev);
        matchedPlayerIds.forEach((id) => newSet.delete(id));
        return newSet;
      });
      setIsOCRPanelOpen(false);
    },
    [],
  );

  // Compute player data
  const allPlayers = [...players, ...addedPlayers].sort((a, b) => {
    if (a.isNewlyAdded && !b.isNewlyAdded) return 1;
    if (!a.isNewlyAdded && b.isNewlyAdded) return -1;
    const lastNameA = a.lastName ?? a.displayName;
    const lastNameB = b.lastName ?? b.displayName;
    return lastNameA.localeCompare(lastNameB);
  });

  const formattedEntries = useMemo(
    () => formatRosterEntries(allPlayers),
    [allPlayers],
  );

  const maxLastNameWidth = useMemo(
    () => getMaxLastNameWidth(formattedEntries),
    [formattedEntries],
  );

  const visiblePlayerCount = allPlayers.filter(
    (p) => !removedPlayerIds.has(p.id),
  ).length;

  // Compute coach data
  const headCoach = nominationList?.coachPerson;
  const firstAssistant = nominationList?.firstAssistantCoachPerson;
  const secondAssistant = nominationList?.secondAssistantCoachPerson;

  // Convert CoachInfo to PersonSummary for display
  const coachAdditionsAsPersonSummary = useMemo(() => {
    const map = new Map<CoachRole, PersonSummary>();
    coachAdditions.forEach((info, role) => {
      map.set(role, {
        __identity: info.id,
        displayName: info.displayName,
        firstName: info.firstName,
        lastName: info.lastName,
        birthday: info.birthday,
      });
    });
    return map;
  }, [coachAdditions]);

  // Count coaches (including pending additions, excluding pending removals)
  const coachCount = useMemo(() => {
    let count = 0;
    const roles: CoachRole[] = ["head", "firstAssistant", "secondAssistant"];
    const existingCoaches = { head: headCoach, firstAssistant, secondAssistant };

    for (const role of roles) {
      const hasPendingAddition = coachAdditions.has(role);
      const hasExistingCoach = existingCoaches[role] && !coachRemovals.has(role);
      if (hasPendingAddition || hasExistingCoach) {
        count++;
      }
    }
    return count;
  }, [headCoach, firstAssistant, secondAssistant, coachAdditions, coachRemovals]);

  // Loading state
  if (isLoading) {
    return (
      <div
        className="py-8 flex flex-col items-center justify-center"
        role="status"
        aria-live="polite"
      >
        <LoadingSpinner size="md" className="mb-3" />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("validation.roster.loadingRoster")}
        </p>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div
        className="py-8 flex flex-col items-center justify-center"
        role="alert"
      >
        <AlertCircle
          className="w-10 h-10 text-danger-500 mb-3"
          aria-hidden="true"
        />
        <p className="text-sm text-danger-600 dark:text-danger-400 mb-4">
          {t("validation.roster.errorLoading")}
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" aria-hidden="true" />
          {t("common.retry")}
        </button>
      </div>
    );
  }

  return (
    <div className="py-4">
      {/* Team name header */}
      <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
        {teamName}
      </h3>

      {/* Coaches Section */}
      <div className="mb-2">
        <CollapsibleHeader
          title={t("validation.roster.coaches")}
          count={coachCount}
          countLabel={t("validation.roster.coachCount")}
          expanded={expandedSection === "coaches"}
          onToggle={() => setExpandedSection("coaches")}
          sectionId={`coaches-section-${team}`}
        />
        {expandedSection === "coaches" && (
          <div id={`coaches-section-${team}`} className="mt-2">
            <CoachesSection
              headCoach={headCoach}
              firstAssistant={firstAssistant}
              secondAssistant={secondAssistant}
              readOnly={readOnly}
              onAddCoach={handleAddCoach}
              onRemoveCoach={handleRemoveCoach}
              pendingAdditions={coachAdditionsAsPersonSummary}
              pendingRemovals={coachRemovals}
            />
          </div>
        )}
      </div>

      {/* Players Section */}
      <div>
        <CollapsibleHeader
          title={t("validation.roster.players")}
          count={visiblePlayerCount}
          countLabel={t("validation.roster.playerCount")}
          expanded={expandedSection === "players"}
          onToggle={() => setExpandedSection("players")}
          sectionId={`players-section-${team}`}
        />
        {expandedSection === "players" && (
          <div id={`players-section-${team}`} className="mt-2">
            {allPlayers.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t("validation.roster.emptyRoster")}
                </p>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                {allPlayers.map((player) => {
                  const entry = formattedEntries.get(player.id);
                  return (
                    <PlayerListItem
                      key={player.id}
                      player={player}
                      displayData={{
                        lastName:
                          entry?.lastName || player.lastName || player.displayName,
                        firstInitial: entry?.firstInitial || "",
                        dob: entry?.dob || "",
                      }}
                      maxLastNameWidth={maxLastNameWidth}
                      isMarkedForRemoval={removedPlayerIds.has(player.id)}
                      onRemove={
                        readOnly
                          ? undefined
                          : () => handleRemovePlayer(player.id)
                      }
                      onUndoRemoval={
                        readOnly
                          ? undefined
                          : () => handleUndoPlayerRemoval(player.id)
                      }
                      readOnly={readOnly}
                    />
                  );
                })}
              </div>
            )}

            {/* Action buttons */}
            {(!readOnly || isOCREnabled) && (
              <div className="mt-4 flex gap-2">
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => setIsAddPlayerSheetOpen(true)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 hover:bg-primary-100 dark:hover:bg-primary-900/50 rounded-lg border border-primary-200 dark:border-primary-800 transition-colors"
                  >
                    <UserPlus className="w-4 h-4" aria-hidden="true" />
                    {t("validation.roster.addPlayer")}
                  </button>
                )}
                {/* OCR button available in read-only mode for debugging/re-verification */}
                {isOCREnabled && (
                  <button
                    type="button"
                    onClick={() => setIsOCRPanelOpen(true)}
                    className={`flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/30 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 transition-colors ${readOnly ? "flex-1" : ""}`}
                    title={t("validation.ocr.scanScoresheet")}
                  >
                    <Camera className="w-4 h-4" aria-hidden="true" />
                    <span className="sr-only">
                      {t("validation.ocr.scanScoresheet")}
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* AddPlayerSheet - only available in edit mode */}
      {!readOnly && (
        <AddPlayerSheet
          isOpen={isAddPlayerSheetOpen}
          onClose={() => setIsAddPlayerSheetOpen(false)}
          nominationListId={nominationList?.__identity ?? ""}
          excludePlayerIds={players.map((p) => p.id)}
          onAddPlayer={handleAddPlayer}
          onRemovePlayer={handleRemoveAddedPlayer}
        />
      )}

      {/* AddCoachSheet - only available in edit mode */}
      {!readOnly && (
        <AddCoachSheet
          isOpen={isAddCoachSheetOpen}
          onClose={() => setIsAddCoachSheetOpen(false)}
          role={addingCoachRole}
          onSelectCoach={handleSelectCoach}
        />
      )}

      {/* OCR Panel - available in read-only mode for debugging/re-verification */}
      {isOCREnabled && (
        <Suspense fallback={null}>
          <OCRPanel
            isOpen={isOCRPanelOpen}
            onClose={() => setIsOCRPanelOpen(false)}
            team={team}
            teamName={teamName}
            rosterPlayers={allPlayers}
            onApplyResults={handleOCRApplyResults}
          />
        </Suspense>
      )}
    </div>
  );
}
