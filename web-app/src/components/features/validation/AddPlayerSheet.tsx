import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import type { PossibleNomination } from "@/api/client";
import { useTranslation } from "@/hooks/useTranslation";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { usePossiblePlayerNominations } from "@/hooks/usePlayerNominations";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ResponsiveSheet } from "@/components/ui/ResponsiveSheet";
import { Check, X, Plus } from "@/components/ui/icons";
import { formatRosterEntries } from "@/utils/date-helpers";

// Delay before focusing search input to ensure the sheet animation has started
const FOCUS_DELAY_MS = 100;

// Debounce delay for search input to avoid filtering on every keystroke
const SEARCH_DEBOUNCE_MS = 200;

interface AddPlayerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  nominationListId: string;
  excludePlayerIds: string[];
  onAddPlayer: (player: PossibleNomination) => void;
  onRemovePlayer: (playerId: string) => void;
}

export function AddPlayerSheet({
  isOpen,
  onClose,
  nominationListId,
  excludePlayerIds,
  onAddPlayer,
  onRemovePlayer,
}: AddPlayerSheetProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebouncedValue(searchQuery, SEARCH_DEBOUNCE_MS);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Track players added during this session (allows adding multiple before closing)
  const [sessionAddedIds, setSessionAddedIds] = useState<Set<string>>(new Set());

  const { data: players, isLoading, isError } = usePossiblePlayerNominations({
    nominationListId,
    enabled: isOpen && !!nominationListId,
  });

  const filteredPlayers = useMemo(() => {
    if (!players) return [];

    const query = debouncedQuery.toLowerCase();
    return players.filter((player) => {
      const playerId = player.indoorPlayer?.__identity ?? "";

      // Exclude players that were already on the roster before opening the sheet
      // But keep session-added players visible (they'll show with checkmarks)
      if (excludePlayerIds.includes(playerId) && !sessionAddedIds.has(playerId)) {
        return false;
      }

      if (player.isAlreadyNominated) {
        return false;
      }

      const lastName = player.indoorPlayer?.person?.lastName?.toLowerCase() ?? "";
      const firstName = player.indoorPlayer?.person?.firstName?.toLowerCase() ?? "";
      const fullName = `${lastName} ${firstName}`;
      return fullName.includes(query) || firstName.includes(query) || lastName.includes(query);
    });
  }, [players, debouncedQuery, excludePlayerIds, sessionAddedIds]);

  // Compute formatted display strings for filtered players (handles duplicate detection)
  const formattedEntries = useMemo(() => {
    const playersData = filteredPlayers.map((player) => ({
      id: player.indoorPlayer?.__identity ?? "",
      firstName: player.indoorPlayer?.person?.firstName,
      lastName: player.indoorPlayer?.person?.lastName,
      birthday: player.indoorPlayer?.person?.birthday,
    }));
    return formatRosterEntries(playersData);
  }, [filteredPlayers]);

  const handleClose = useCallback(() => {
    setSearchQuery("");
    setSessionAddedIds(new Set());
    onClose();
  }, [onClose]);

  const handlePlayerClick = useCallback(
    (player: PossibleNomination) => {
      const playerId = player.indoorPlayer?.__identity ?? "";

      // Toggle: if already added, remove; otherwise add
      if (sessionAddedIds.has(playerId)) {
        setSessionAddedIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(playerId);
          return newSet;
        });
        onRemovePlayer(playerId);
      } else {
        setSessionAddedIds((prev) => {
          const newSet = new Set(prev);
          newSet.add(playerId);
          return newSet;
        });
        onAddPlayer(player);
      }
    },
    [sessionAddedIds, onAddPlayer, onRemovePlayer],
  );

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      const timeout = setTimeout(() => {
        searchInputRef.current?.focus();
      }, FOCUS_DELAY_MS);
      return () => clearTimeout(timeout);
    }
  }, [isOpen]);

  return (
    <ResponsiveSheet isOpen={isOpen} onClose={handleClose} titleId="add-player-title">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-border-default dark:border-border-default-dark">
          <div className="flex items-center gap-2">
            <h2
              id="add-player-title"
              className="text-lg font-semibold text-text-primary dark:text-text-primary-dark"
            >
              {t("validation.addPlayer")}
            </h2>
            {sessionAddedIds.size > 0 && (
              <span className="px-2 py-0.5 text-sm font-medium text-success-700 dark:text-success-400 bg-success-100 dark:bg-success-900/30 rounded-full">
                {sessionAddedIds.size} {t("validation.roster.added")}
              </span>
            )}
          </div>
          <button
            onClick={handleClose}
            aria-label={t("common.close")}
            className="
              p-2 -mr-2 rounded-lg
              text-text-muted hover:text-text-secondary dark:text-text-muted-dark dark:hover:text-text-secondary-dark
              hover:bg-surface-subtle dark:hover:bg-surface-subtle-dark
              transition-colors
            "
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Search Input */}
        <div className="flex-shrink-0 p-4 border-b border-border-default dark:border-border-default-dark">
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("validation.searchPlayers")}
            aria-label={t("validation.searchPlayers")}
            className="
              w-full px-4 py-2 rounded-lg
              bg-surface-subtle dark:bg-surface-subtle-dark
              text-text-primary dark:text-text-primary-dark
              placeholder-text-muted dark:placeholder-text-muted-dark
              border border-transparent
              focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20
              outline-none transition-colors
            "
          />
        </div>

        {/* Player List */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-2 py-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="md" />
            </div>
          ) : isError ? (
            <div
              role="alert"
              className="text-center py-8 text-danger-500 dark:text-danger-400"
            >
              {t("validation.loadPlayersError")}
            </div>
          ) : filteredPlayers.length === 0 ? (
            <div className="text-center py-8 text-text-muted dark:text-text-muted-dark">
              {t("validation.noPlayersFound")}
            </div>
          ) : (
            <ul>
              {filteredPlayers.map((player) => {
                const playerId = player.indoorPlayer?.__identity ?? "";
                const isAdded = sessionAddedIds.has(playerId);

                return (
                  <li key={player.__identity}>
                    <button
                      onClick={() => handlePlayerClick(player)}
                      aria-pressed={isAdded}
                      className={`
                        group w-full flex items-center justify-between py-2 px-3 rounded-lg
                        text-left transition-colors
                        ${
                          isAdded
                            ? "bg-success-50 dark:bg-success-900/20 hover:bg-danger-50 dark:hover:bg-danger-900/20"
                            : "hover:bg-surface-subtle dark:hover:bg-surface-subtle-dark"
                        }
                      `}
                    >
                      <div className="flex-1 min-w-0">
                        <span
                          className={`font-medium truncate ${
                            isAdded
                              ? "text-success-700 dark:text-success-400"
                              : "text-text-primary dark:text-text-primary-dark"
                          }`}
                        >
                          {formattedEntries.get(playerId)?.displayString ||
                            `${player.indoorPlayer?.person?.lastName ?? ""} ${player.indoorPlayer?.person?.firstName ?? ""}`}
                        </span>
                      </div>
                      {isAdded ? (
                        <span className="relative flex-shrink-0 ml-2 w-5 h-5">
                          {/* Checkmark shown by default, hidden on hover */}
                          <Check
                            className="w-5 h-5 text-success-600 dark:text-success-400 absolute inset-0 group-hover:opacity-0 transition-opacity"
                            aria-hidden="true"
                          />
                          {/* X icon shown on hover */}
                          <X
                            className="w-5 h-5 text-danger-500 dark:text-danger-400 absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            aria-hidden="true"
                          />
                          <span className="sr-only">{t("validation.roster.added")}</span>
                        </span>
                      ) : (
                        <Plus
                          className="w-5 h-5 text-text-subtle flex-shrink-0 ml-2"
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer with Done button */}
        <div className="flex-shrink-0 p-4 border-t border-border-default dark:border-border-default-dark">
          <button
            type="button"
            onClick={handleClose}
            className="
              w-full py-3 px-4 rounded-lg
              text-sm font-medium
              text-white bg-primary-500 hover:bg-primary-600
              dark:bg-primary-600 dark:hover:bg-primary-700
              transition-colors
              focus:outline-none focus:ring-2 focus:ring-primary-500/50
            "
          >
            {t("common.done")}
          </button>
        </div>
    </ResponsiveSheet>
  );
}
