import { useState, useCallback, useEffect, useRef } from "react";
import type { PossibleNomination, NominationList } from "@/api/client";
import { useTranslation } from "@/hooks/useTranslation";
import {
  useNominationList,
  type RosterPlayer,
  type RosterModifications,
} from "@/hooks/useNominationList";
import { PlayerListItem } from "./PlayerListItem";
import { AddPlayerSheet } from "./AddPlayerSheet";
import { UserPlus, AlertCircle, RefreshCw } from "@/components/ui/icons";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

interface RosterVerificationPanelProps {
  team: "home" | "away";
  teamName: string;
  gameId: string;
  onModificationsChange?: (modifications: RosterModifications) => void;
  onAddPlayerSheetOpenChange?: (isOpen: boolean) => void;
  /** When true, shows roster in view-only mode without edit controls */
  readOnly?: boolean;
  /** Initial modifications to restore state when remounting */
  initialModifications?: RosterModifications;
  /** Pre-fetched nomination list data to avoid duplicate API calls */
  prefetchedNominationList?: NominationList | null;
}

export function RosterVerificationPanel({
  team,
  teamName,
  gameId,
  onModificationsChange,
  onAddPlayerSheetOpenChange,
  readOnly = false,
  initialModifications,
  prefetchedNominationList,
}: RosterVerificationPanelProps) {
  const { t } = useTranslation();
  const { nominationList, players, isLoading, isError, refetch } =
    useNominationList({
      gameId,
      team,
      prefetchedData: prefetchedNominationList,
    });

  // Track locally added players - initialize from props to restore state when remounting
  const [addedPlayers, setAddedPlayers] = useState<RosterPlayer[]>(
    () => initialModifications?.added ?? [],
  );

  // Track AddPlayerSheet open state
  const [isAddPlayerSheetOpen, setIsAddPlayerSheetOpen] = useState(false);

  // Track IDs of players marked for removal - initialize from props
  const [removedPlayerIds, setRemovedPlayerIds] = useState<Set<string>>(
    () => new Set(initialModifications?.removed ?? []),
  );

  // Use ref to avoid stale closure when callback isn't memoized by parent
  const onModificationsChangeRef = useRef(onModificationsChange);
  useEffect(() => {
    onModificationsChangeRef.current = onModificationsChange;
  }, [onModificationsChange]);

  // Notify parent when modifications change
  useEffect(() => {
    onModificationsChangeRef.current?.({
      added: addedPlayers,
      removed: [...removedPlayerIds],
    });
  }, [addedPlayers, removedPlayerIds]);

  // Notify parent when AddPlayerSheet open state changes
  useEffect(() => {
    onAddPlayerSheetOpenChange?.(isAddPlayerSheetOpen);
  }, [isAddPlayerSheetOpen, onAddPlayerSheetOpenChange]);

  const handleRemovePlayer = useCallback((playerId: string) => {
    setRemovedPlayerIds((prev) => {
      const newSet = new Set(prev);
      newSet.add(playerId);
      return newSet;
    });
  }, []);

  const handleUndoRemoval = useCallback((playerId: string) => {
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
    // Sheet stays open to allow adding multiple players
  }, []);

  const handleRemoveAddedPlayer = useCallback((playerId: string) => {
    setAddedPlayers((prev) => prev.filter((p) => p.id !== playerId));
  }, []);

  const allPlayers = [...players, ...addedPlayers].sort((a, b) => {
    if (a.isNewlyAdded && !b.isNewlyAdded) return 1;
    if (!a.isNewlyAdded && b.isNewlyAdded) return -1;
    return a.displayName.localeCompare(b.displayName);
  });

  // Calculate visible player count (excluding removed)
  const visiblePlayerCount = allPlayers.filter(
    (p) => !removedPlayerIds.has(p.id),
  ).length;

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
      <div className="py-8 flex flex-col items-center justify-center" role="alert">
        <AlertCircle className="w-10 h-10 text-danger-500 mb-3" aria-hidden="true" />
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
      {/* Header with team name and player count */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
          {teamName}
        </h3>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {t("validation.roster.playerCount").replace(
            "{count}",
            String(visiblePlayerCount),
          )}
        </span>
      </div>

      {/* Player list */}
      {allPlayers.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("validation.roster.emptyRoster")}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          {allPlayers.map((player) => (
            <PlayerListItem
              key={player.id}
              player={player}
              isMarkedForRemoval={removedPlayerIds.has(player.id)}
              onRemove={readOnly ? undefined : () => handleRemovePlayer(player.id)}
              onUndoRemoval={readOnly ? undefined : () => handleUndoRemoval(player.id)}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}

      {/* Add Player button - hidden in read-only mode */}
      {!readOnly && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setIsAddPlayerSheetOpen(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 hover:bg-primary-100 dark:hover:bg-primary-900/50 rounded-lg border border-primary-200 dark:border-primary-800 transition-colors"
          >
            <UserPlus className="w-4 h-4" aria-hidden="true" />
            {t("validation.roster.addPlayer")}
          </button>
        </div>
      )}

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
    </div>
  );
}
