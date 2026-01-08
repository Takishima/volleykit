import { useMemo } from "react";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Check, AlertTriangle, XCircle, User } from "@/shared/components/icons";
import type { PlayerComparisonResult, ComparisonStatus } from "@/features/ocr";

interface PlayerComparisonListProps {
  results: PlayerComparisonResult[];
  selectedPlayerIds: Set<string>;
  onTogglePlayer: (playerId: string) => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
  /** If true, hide selection UI and show read-only comparison */
  readOnly?: boolean;
}

interface StatusConfig {
  icon: typeof Check;
  iconColor: string;
  bgColor: string;
  borderColor: string;
  label: string;
}

function getStatusConfig(
  status: ComparisonStatus,
  t: ReturnType<typeof useTranslation>["t"],
): StatusConfig {
  switch (status) {
    case "match":
      return {
        icon: Check,
        iconColor: "text-success-500",
        bgColor: "bg-success-50 dark:bg-success-900/20",
        borderColor: "border-success-200 dark:border-success-800",
        label: t("validation.ocr.comparison.matched"),
      };
    case "ocr-only":
      return {
        icon: AlertTriangle,
        iconColor: "text-warning-500",
        bgColor: "bg-warning-50 dark:bg-warning-900/20",
        borderColor: "border-warning-200 dark:border-warning-800",
        label: t("validation.ocr.comparison.ocrOnly"),
      };
    case "roster-only":
      return {
        icon: XCircle,
        iconColor: "text-danger-500",
        bgColor: "bg-danger-50 dark:bg-danger-900/20",
        borderColor: "border-danger-200 dark:border-danger-800",
        label: t("validation.ocr.comparison.rosterOnly"),
      };
  }
}

interface ComparisonItemProps {
  result: PlayerComparisonResult;
  isSelected: boolean;
  onToggle: () => void;
  isSelectable: boolean;
}

function ComparisonItem({
  result,
  isSelected,
  onToggle,
  isSelectable,
}: ComparisonItemProps) {
  const { t, tInterpolate } = useTranslation();
  const config = getStatusConfig(result.status, t);
  const Icon = config.icon;

  const displayName =
    result.status === "roster-only"
      ? result.rosterPlayerName
      : result.ocrPlayer?.displayName;

  const secondaryName =
    result.status === "match" ? result.rosterPlayerName : null;

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border ${config.bgColor} ${config.borderColor}`}
    >
      {/* Checkbox for selectable items */}
      {isSelectable && (
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggle}
          className="w-4 h-4 text-primary-500 border-gray-300 rounded focus:ring-primary-500 focus:ring-2"
          aria-label={`Select ${displayName}`}
        />
      )}

      {/* Status icon */}
      <div className={`flex-shrink-0 ${config.iconColor}`}>
        <Icon className="w-5 h-5" aria-hidden="true" />
      </div>

      {/* Player info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <User
            className="w-4 h-4 text-gray-400 flex-shrink-0"
            aria-hidden="true"
          />
          <span className="font-medium text-gray-900 dark:text-white truncate">
            {displayName}
          </span>
        </div>
        {secondaryName && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
            {secondaryName}
          </p>
        )}
      </div>

      {/* Status badge and confidence */}
      <div className="flex flex-col items-end gap-1">
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded ${config.bgColor} ${config.iconColor}`}
        >
          {config.label}
        </span>
        {result.confidence > 0 && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {tInterpolate("validation.ocr.comparison.confidence", {
              score: String(result.confidence),
            })}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Displays a list of player comparison results between OCR and roster data.
 * Allows selecting matched players to apply to the roster.
 */
export function PlayerComparisonList({
  results,
  selectedPlayerIds,
  onTogglePlayer,
  onSelectAll,
  onDeselectAll,
  readOnly = false,
}: PlayerComparisonListProps) {
  const { t, tInterpolate } = useTranslation();

  const { matched, ocrOnly, rosterOnly } = useMemo(() => {
    return {
      matched: results.filter((r) => r.status === "match"),
      ocrOnly: results.filter((r) => r.status === "ocr-only"),
      rosterOnly: results.filter((r) => r.status === "roster-only"),
    };
  }, [results]);

  const selectableCount = matched.length;
  const selectedCount = selectedPlayerIds.size;
  const allSelected = selectableCount > 0 && selectedCount === selectableCount;

  // In read-only mode, don't show selection controls
  const showSelectionControls = !readOnly && selectableCount > 0 && onSelectAll && onDeselectAll;

  if (results.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("validation.ocr.comparison.noMatches")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="flex flex-wrap gap-3 text-xs">
        {matched.length > 0 && (
          <span className="px-2 py-1 bg-success-50 dark:bg-success-900/20 text-success-700 dark:text-success-400 rounded-full">
            {tInterpolate("validation.ocr.comparison.matchedCount", {
              count: String(matched.length),
            })}
          </span>
        )}
        {ocrOnly.length > 0 && (
          <span className="px-2 py-1 bg-warning-50 dark:bg-warning-900/20 text-warning-700 dark:text-warning-400 rounded-full">
            {tInterpolate("validation.ocr.comparison.ocrOnlyCount", {
              count: String(ocrOnly.length),
            })}
          </span>
        )}
        {rosterOnly.length > 0 && (
          <span className="px-2 py-1 bg-danger-50 dark:bg-danger-900/20 text-danger-700 dark:text-danger-400 rounded-full">
            {tInterpolate("validation.ocr.comparison.rosterOnlyCount", {
              count: String(rosterOnly.length),
            })}
          </span>
        )}
      </div>

      {/* Select all / deselect all buttons */}
      {showSelectionControls && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={allSelected ? onDeselectAll : onSelectAll}
            className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
          >
            {allSelected
              ? t("validation.ocr.comparison.deselectAll")
              : t("validation.ocr.comparison.selectAll")}
          </button>
          <span className="text-xs text-gray-400">
            ({selectedCount}/{selectableCount})
          </span>
        </div>
      )}

      {/* Matched players (selectable in non-read-only mode) */}
      {matched.length > 0 && (
        <div className="space-y-2">
          {matched.map((result) => (
            <ComparisonItem
              key={result.rosterPlayerId ?? result.ocrPlayer?.rawName}
              result={result}
              isSelected={
                result.rosterPlayerId
                  ? selectedPlayerIds.has(result.rosterPlayerId)
                  : false
              }
              onToggle={() =>
                result.rosterPlayerId && onTogglePlayer(result.rosterPlayerId)
              }
              isSelectable={!readOnly && !!result.rosterPlayerId}
            />
          ))}
        </div>
      )}

      {/* OCR-only players (not selectable) */}
      {ocrOnly.length > 0 && (
        <div className="space-y-2">
          {ocrOnly.map((result) => (
            <ComparisonItem
              key={`ocr-only-${result.ocrPlayer?.rawName ?? result.ocrPlayer?.displayName}`}
              result={result}
              isSelected={false}
              onToggle={() => {}}
              isSelectable={false}
            />
          ))}
        </div>
      )}

      {/* Roster-only players (not selectable) */}
      {rosterOnly.length > 0 && (
        <div className="space-y-2">
          {rosterOnly.map((result) => (
            <ComparisonItem
              key={result.rosterPlayerId}
              result={result}
              isSelected={false}
              onToggle={() => {}}
              isSelectable={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}
