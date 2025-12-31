import { Badge } from "@/components/ui/Badge";
import type { RosterPlayer } from "@/hooks/useNominationList";
import { Trash2, Undo2 } from "@/components/ui/icons";
import { useTranslation } from "@/hooks/useTranslation";

interface PlayerListItemProps {
  player: RosterPlayer;
  /** Pre-formatted display string (e.g., "Müller M. 01.01.90") */
  formattedDisplay: string;
  isMarkedForRemoval: boolean;
  onRemove?: () => void;
  onUndoRemoval?: () => void;
  /** When true, hides action buttons */
  readOnly?: boolean;
}

export function PlayerListItem({
  player,
  formattedDisplay,
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
        {/* Player name and DOB in aligned format */}
        <span
          className={`text-sm truncate ${
            isMarkedForRemoval
              ? "line-through text-text-subtle dark:text-text-subtle-dark"
              : "text-text-primary dark:text-text-primary-dark"
          }`}
        >
          {formattedDisplay}
        </span>

        {/* Badges */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* License category badge */}
          {player.licenseCategory && !isMarkedForRemoval && (
            <Badge variant="neutral">{player.licenseCategory}</Badge>
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
