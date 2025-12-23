import { useTranslation } from "@/hooks/useTranslation";
import { Badge } from "@/components/ui/Badge";
import type { RosterPlayer } from "@/hooks/useNominationList";
import { Trash2, Undo2 } from "@/components/ui/icons";
import { formatDOB } from "@/utils/date-helpers";

/** Format player name as "LastName FirstName" */
function formatPlayerName(player: RosterPlayer): string {
  if (player.lastName && player.firstName) {
    return `${player.lastName} ${player.firstName}`;
  }
  return player.displayName;
}

interface PlayerListItemProps {
  player: RosterPlayer;
  isMarkedForRemoval: boolean;
  onRemove?: () => void;
  onUndoRemoval?: () => void;
  /** When true, hides action buttons */
  readOnly?: boolean;
}

export function PlayerListItem({
  player,
  isMarkedForRemoval,
  onRemove,
  onUndoRemoval,
  readOnly = false,
}: PlayerListItemProps) {
  const { t } = useTranslation();

  return (
    <div
      className={`flex items-center justify-between py-3 px-2 border-b border-border-subtle dark:border-border-subtle-dark last:border-b-0 ${
        isMarkedForRemoval ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Shirt number */}
        <span
          className={`font-mono text-sm font-medium w-8 text-center ${
            isMarkedForRemoval
              ? "text-text-subtle dark:text-text-subtle-dark"
              : "text-text-secondary dark:text-text-secondary-dark"
          }`}
        >
          #{player.shirtNumber}
        </span>

        {/* Player name and DOB */}
        <span
          className={`text-sm truncate ${
            isMarkedForRemoval
              ? "line-through text-text-subtle dark:text-text-subtle-dark"
              : "text-text-primary dark:text-text-primary-dark"
          }`}
        >
          {formatPlayerName(player)}
        </span>
        {player.birthday && !isMarkedForRemoval && (
          <span className="text-xs text-text-muted dark:text-text-muted-dark flex-shrink-0">
            {formatDOB(player.birthday)}
          </span>
        )}

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

      {/* Action button - hidden in read-only mode */}
      {!readOnly && (
        <div className="flex-shrink-0 ml-2">
          {isMarkedForRemoval ? (
            <button
              type="button"
              onClick={onUndoRemoval}
              className="p-1.5 rounded-full text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-900/50 transition-colors"
              aria-label={t("validation.roster.undoRemoval")}
              title={t("validation.roster.undoRemoval")}
            >
              <Undo2 className="w-4 h-4" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onRemove}
              className="p-1.5 rounded-full text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/50 transition-colors"
              aria-label={t("validation.roster.removePlayer")}
              title={t("validation.roster.removePlayer")}
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
