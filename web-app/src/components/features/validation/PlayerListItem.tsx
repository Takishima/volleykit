import { useTranslation } from "@/hooks/useTranslation";
import { Badge } from "@/components/ui/Badge";
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
            <Badge variant="neutral">{player.licenseCategory}</Badge>
          )}

          {/* Captain badge */}
          {player.isCaptain && !isMarkedForRemoval && (
            <Badge variant="neutral" title={t("validation.roster.captain")}>
              C
            </Badge>
          )}

          {/* Libero badge */}
          {player.isLibero && !isMarkedForRemoval && (
            <Badge variant="neutral" title={t("validation.roster.libero")}>
              L
            </Badge>
          )}

          {/* Newly added badge */}
          {player.isNewlyAdded && !isMarkedForRemoval && (
            <Badge variant="success">
              {t("validation.roster.newlyAdded")}
            </Badge>
          )}
        </div>
      </div>

      {/* Action button */}
      <div className="flex-shrink-0 ml-2">
        {isMarkedForRemoval ? (
          <button
            type="button"
            onClick={onUndoRemoval}
            className="p-1.5 rounded-full text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-900/50 transition-colors"
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
