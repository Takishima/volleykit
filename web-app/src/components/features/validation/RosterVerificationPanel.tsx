import { useState, useCallback } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import {
  useNominationList,
  type RosterPlayer,
  type RosterModifications,
} from "@/hooks/useNominationList";
import { PlayerListItem } from "./PlayerListItem";

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
  const { players, isLoading, isError, refetch } = useNominationList({
    gameId,
    team,
  });

  // Track locally added players (will integrate with AddPlayerSheet in issue #36)
  const [addedPlayers] = useState<RosterPlayer[]>([]);

  // Track IDs of players marked for removal
  const [removedPlayerIds, setRemovedPlayerIds] = useState<Set<string>>(
    new Set(),
  );

  const handleRemovePlayer = useCallback(
    (playerId: string) => {
      setRemovedPlayerIds((prev) => {
        const newSet = new Set(prev);
        newSet.add(playerId);
        return newSet;
      });

      // Notify parent of modifications
      onModificationsChange?.({
        added: addedPlayers,
        removed: [...removedPlayerIds, playerId],
      });
    },
    [addedPlayers, removedPlayerIds, onModificationsChange],
  );

  const handleUndoRemoval = useCallback(
    (playerId: string) => {
      setRemovedPlayerIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(playerId);
        return newSet;
      });

      // Notify parent of modifications
      const newRemovedIds = [...removedPlayerIds].filter(
        (id) => id !== playerId,
      );
      onModificationsChange?.({
        added: addedPlayers,
        removed: newRemovedIds,
      });
    },
    [addedPlayers, removedPlayerIds, onModificationsChange],
  );

  const handleAddPlayer = useCallback(() => {
    // Placeholder for AddPlayerSheet integration (issue #36)
  }, []);

  // Combine original players with added players
  const allPlayers = [...players, ...addedPlayers].sort(
    (a, b) => a.shirtNumber - b.shirtNumber,
  );

  // Calculate visible player count (excluding removed)
  const visiblePlayerCount = allPlayers.filter(
    (p) => !removedPlayerIds.has(p.id),
  ).length;

  // Loading state
  if (isLoading) {
    return (
      <div className="py-8 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400 mb-3" />
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
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
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
          onClick={handleAddPlayer}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg border border-blue-200 dark:border-blue-800 transition-colors"
        >
          <UserPlusIcon className="w-4 h-4" />
          {t("validation.roster.addPlayer")}
        </button>
      </div>
    </div>
  );
}
