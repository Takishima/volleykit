import { useState, useMemo, useEffect, useRef } from "react";
import type { PossibleNomination } from "@/api/client";
import { useTranslation } from "@/hooks/useTranslation";
import { usePossiblePlayerNominations } from "@/hooks/usePlayerNominations";

// Delay before focusing search input to ensure the sheet animation has started
const FOCUS_DELAY_MS = 100;

interface AddPlayerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  nominationListId: string;
  excludePlayerIds: string[];
  onAddPlayer: (player: PossibleNomination) => void;
}

export function AddPlayerSheet({
  isOpen,
  onClose,
  nominationListId,
  excludePlayerIds,
  onAddPlayer,
}: AddPlayerSheetProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { data: players, isLoading, isError } = usePossiblePlayerNominations({
    nominationListId,
    enabled: isOpen && !!nominationListId,
  });

  const filteredPlayers = useMemo(() => {
    if (!players) return [];

    const query = searchQuery.toLowerCase();
    return players.filter((player) => {
      const playerId = player.indoorPlayer?.__identity ?? "";
      if (excludePlayerIds.includes(playerId)) {
        return false;
      }

      if (player.isAlreadyNominated) {
        return false;
      }

      const name =
        player.indoorPlayer?.person?.displayName?.toLowerCase() ?? "";
      return name.includes(query);
    });
  }, [players, searchQuery, excludePlayerIds]);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      const timeout = setTimeout(() => {
        searchInputRef.current?.focus();
      }, FOCUS_DELAY_MS);
      return () => clearTimeout(timeout);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop - non-interactive, Escape key handles closing */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity"
        aria-hidden="true"
      />

      {/* Sheet Container - bottom drawer on mobile, centered modal on desktop */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-player-title"
        className="
          fixed inset-x-0 bottom-0
          md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2
          max-h-[80vh] md:max-h-[70vh] md:max-w-lg md:w-full
          bg-white dark:bg-gray-800 rounded-t-xl md:rounded-lg
          shadow-xl flex flex-col
          animate-in slide-in-from-bottom md:slide-in-from-bottom-0 md:fade-in
          duration-200
        "
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2
            id="add-player-title"
            className="text-lg font-semibold text-gray-900 dark:text-white"
          >
            {t("validation.addPlayer")}
          </h2>
          <button
            onClick={onClose}
            aria-label={t("common.close")}
            className="
              p-2 -mr-2 rounded-lg
              text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200
              hover:bg-gray-100 dark:hover:bg-gray-700
              transition-colors
            "
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("validation.searchPlayers")}
            aria-label={t("validation.searchPlayers")}
            className="
              w-full px-4 py-2 rounded-lg
              bg-gray-100 dark:bg-gray-700
              text-gray-900 dark:text-white
              placeholder-gray-500 dark:placeholder-gray-400
              border border-transparent
              focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
              outline-none transition-colors
            "
          />
        </div>

        {/* Player List */}
        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
          ) : isError ? (
            <div className="text-center py-8 text-red-500 dark:text-red-400">
              {t("validation.loadPlayersError")}
            </div>
          ) : filteredPlayers.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              {t("validation.noPlayersFound")}
            </div>
          ) : (
            <ul className="space-y-1">
              {filteredPlayers.map((player) => (
                <li key={player.__identity}>
                  <button
                    onClick={() => onAddPlayer(player)}
                    className="
                      w-full flex items-center justify-between p-3 rounded-lg
                      text-left
                      hover:bg-gray-100 dark:hover:bg-gray-700
                      transition-colors
                    "
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 dark:text-white truncate">
                        {player.indoorPlayer?.person?.displayName ?? "Unknown"}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                        {player.licenseCategory && (
                          <span>
                            {t("validation.license")}: {player.licenseCategory}
                          </span>
                        )}
                      </div>
                    </div>
                    <svg
                      className="w-5 h-5 text-gray-400 flex-shrink-0 ml-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
