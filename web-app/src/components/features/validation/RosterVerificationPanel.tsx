import { useState, useCallback, useEffect, useRef } from "react";
import type { PossibleNomination } from "@/api/client";
import { useTranslation } from "@/hooks/useTranslation";
import {
  useNominationList,
  type RosterPlayer,
  type RosterModifications,
} from "@/hooks/useNominationList";
import { PlayerListItem } from "./PlayerListItem";
import { AddPlayerSheet } from "./AddPlayerSheet";

function UserPlusIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  );
}

function AlertCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M21 2v6h-6" />
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M3 22v-6h6" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
    </svg>
  );
}

interface RosterVerificationPanelProps {
  team: "home" | "away";
  teamName: string;
  gameId: string;
  onModificationsChange?: (modifications: RosterModifications) => void;
}

export function RosterVerificationPanel({
  team,
  teamName,
  gameId,
  onModificationsChange,
}: RosterVerificationPanelProps) {
  const { t } = useTranslation();
  const { nominationList, players, isLoading, isError, refetch } =
    useNominationList({
      gameId,
      team,
    });

  // Track locally added players
  const [addedPlayers, setAddedPlayers] = useState<RosterPlayer[]>([]);

  // Track AddPlayerSheet open state
  const [isAddPlayerSheetOpen, setIsAddPlayerSheetOpen] = useState(false);

  // Track IDs of players marked for removal
  const [removedPlayerIds, setRemovedPlayerIds] = useState<Set<string>>(
    new Set(),
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

    const newPlayer: RosterPlayer = {
      id: playerId,
      shirtNumber: 0, // New players don't have a shirt number yet
      displayName:
        nomination.indoorPlayer?.person?.displayName ??
        `${nomination.indoorPlayer?.person?.firstName ?? ""} ${nomination.indoorPlayer?.person?.lastName ?? ""}`.trim(),
      licenseCategory: nomination.licenseCategory,
      isNewlyAdded: true,
    };

    setAddedPlayers((prev) => [...prev, newPlayer]);
    setIsAddPlayerSheetOpen(false);
  }, []);

  const allPlayers = [...players, ...addedPlayers].sort((a, b) => {
    if (a.isNewlyAdded && !b.isNewlyAdded) return 1;
    if (!a.isNewlyAdded && b.isNewlyAdded) return -1;
    return a.shirtNumber - b.shirtNumber;
  });

  // Calculate visible player count (excluding removed)
  const visiblePlayerCount = allPlayers.filter(
    (p) => !removedPlayerIds.has(p.id),
  ).length;

  // Loading state
  if (isLoading) {
    return (
      <div className="py-8 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 dark:border-primary-400 mb-3" />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("validation.roster.loadingRoster")}
        </p>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="py-8 flex flex-col items-center justify-center">
        <AlertCircleIcon className="w-10 h-10 text-red-500 mb-3" />
        <p className="text-sm text-red-600 dark:text-red-400 mb-4">
          {t("validation.roster.errorLoading")}
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors"
        >
          <RefreshIcon className="w-4 h-4" />
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
              onRemove={() => handleRemovePlayer(player.id)}
              onUndoRemoval={() => handleUndoRemoval(player.id)}
            />
          ))}
        </div>
      )}

      {/* Add Player button */}
      <div className="mt-4">
        <button
          type="button"
          onClick={() => setIsAddPlayerSheetOpen(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 hover:bg-primary-100 dark:hover:bg-primary-900/50 rounded-lg border border-primary-200 dark:border-primary-800 transition-colors"
        >
          <UserPlusIcon className="w-4 h-4" />
          {t("validation.roster.addPlayer")}
        </button>
      </div>

      {/* AddPlayerSheet */}
      <AddPlayerSheet
        isOpen={isAddPlayerSheetOpen}
        onClose={() => setIsAddPlayerSheetOpen(false)}
        nominationListId={nominationList?.__identity ?? ""}
        excludePlayerIds={[
          ...players.map((p) => p.id),
          ...addedPlayers.map((p) => p.id),
        ]}
        onAddPlayer={handleAddPlayer}
      />
    </div>
  );
}
