import { Badge } from "@/shared/components/Badge";
import type { RosterPlayer } from "@/features/validation/hooks/useNominationList";
import { Trash2, Undo2 } from "@/shared/components/icons";
import { useTranslation } from "@/shared/hooks/useTranslation";

/** Structured player display data for aligned columns */
export interface PlayerDisplayData {
  lastName: string;
  firstInitial: string;
  dob: string;
}

interface PlayerListItemProps {
  player: RosterPlayer;
  /** Structured display data for column alignment */
  displayData: PlayerDisplayData;
  /** Maximum last name width in the list (for alignment) */
  maxLastNameWidth: number;
  isMarkedForRemoval: boolean;
  onRemove?: () => void;
  onUndoRemoval?: () => void;
  /** When true, hides action buttons */
  readOnly?: boolean;
}

export function PlayerListItem({
  player,
  displayData,
  maxLastNameWidth,
  isMarkedForRemoval,
  onRemove,
  onUndoRemoval,
  readOnly = false,
}: PlayerListItemProps) {
  const { t } = useTranslation();

  const textColorClass = isMarkedForRemoval
    ? "line-through text-text-subtle dark:text-text-subtle-dark"
    : "text-text-primary dark:text-text-primary-dark";

  return (
    <div
      className={`flex items-center justify-between py-3 px-2 border-b border-border-subtle dark:border-border-subtle-dark last:border-b-0 ${
        isMarkedForRemoval ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Player name and DOB in aligned columns using tabular numbers */}
        <div className="flex items-baseline text-sm font-mono">
          <span
            className={textColorClass}
            style={{ minWidth: `${maxLastNameWidth}ch` }}
          >
            {displayData.lastName}
          </span>
          <span className={`ml-2 w-[3ch] ${textColorClass}`}>
            {displayData.firstInitial}
          </span>
          <span
            className={`ml-2 text-text-muted dark:text-text-muted-dark tabular-nums ${
              isMarkedForRemoval ? "line-through" : ""
            }`}
          >
            {displayData.dob}
          </span>
        </div>

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
