import { useTranslation } from "@/hooks/useTranslation";
import type { RosterPlayer } from "@/hooks/useNominationList";

function TrashIcon({ className }: { className?: string }) {
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
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  );
}

function UndoIcon({ className }: { className?: string }) {
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
      <path d="M3 7v6h6" />
      <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
    </svg>
  );
}

interface PlayerListItemProps {
  player: RosterPlayer;
  isMarkedForRemoval: boolean;
  onRemove: () => void;
  onUndoRemoval: () => void;
}

export function PlayerListItem({
  player,
  isMarkedForRemoval,
  onRemove,
  onUndoRemoval,
}: PlayerListItemProps) {
  const { t } = useTranslation();

  return (
    <div
      className={`flex items-center justify-between py-3 px-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${
        isMarkedForRemoval ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Shirt number */}
        <span
          className={`font-mono text-sm font-medium w-8 text-center ${
            isMarkedForRemoval
              ? "text-gray-400 dark:text-gray-500"
              : "text-gray-700 dark:text-gray-300"
          }`}
        >
          #{player.shirtNumber}
        </span>

        {/* Player name */}
        <span
          className={`text-sm truncate ${
            isMarkedForRemoval
              ? "line-through text-gray-400 dark:text-gray-500"
              : "text-gray-900 dark:text-white"
          }`}
        >
          {player.displayName}
        </span>

        {/* Badges */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* License category badge */}
          {player.licenseCategory && !isMarkedForRemoval && (
            <span className="px-1.5 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
              {player.licenseCategory}
            </span>
          )}

          {/* Captain badge */}
          {player.isCaptain && !isMarkedForRemoval && (
            <span
              className="px-1.5 py-0.5 rounded text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
              title={t("validation.roster.captain")}
            >
              C
            </span>
          )}

          {/* Libero badge */}
          {player.isLibero && !isMarkedForRemoval && (
            <span
              className="px-1.5 py-0.5 rounded text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200"
              title={t("validation.roster.libero")}
            >
              L
            </span>
          )}

          {/* Newly added badge */}
          {player.isNewlyAdded && !isMarkedForRemoval && (
            <span className="px-1.5 py-0.5 rounded text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
              {t("validation.roster.newlyAdded")}
            </span>
          )}
        </div>
      </div>

      {/* Action button */}
      <div className="flex-shrink-0 ml-2">
        {isMarkedForRemoval ? (
          <button
            type="button"
            onClick={onUndoRemoval}
            className="p-1.5 rounded-full text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/50 transition-colors"
            aria-label={t("validation.roster.undoRemoval")}
            title={t("validation.roster.undoRemoval")}
          >
            <UndoIcon className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onRemove}
            className="p-1.5 rounded-full text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/50 transition-colors"
            aria-label={t("validation.roster.removePlayer")}
            title={t("validation.roster.removePlayer")}
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
