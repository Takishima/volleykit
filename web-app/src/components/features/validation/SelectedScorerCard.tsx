import type { ValidatedPersonSearchResult } from "@/api/validation";
import { useTranslation } from "@/hooks/useTranslation";
import { formatDOB } from "@/utils/date-helpers";
import { X } from "@/components/ui/icons";

interface SelectedScorerCardProps {
  scorer: ValidatedPersonSearchResult;
  onClear: () => void;
}

/**
 * Displays the currently selected scorer with option to clear selection.
 */
export function SelectedScorerCard({
  scorer,
  onClear,
}: SelectedScorerCardProps) {
  const { t } = useTranslation();

  return (
    <div className="mb-4 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium text-text-primary dark:text-text-primary-dark">
            {scorer.displayName}
          </div>
          <div className="flex items-center gap-3 text-sm text-text-muted dark:text-text-muted-dark">
            {scorer.associationId && <span>ID: {scorer.associationId}</span>}
            {scorer.birthday && <span>{formatDOB(scorer.birthday)}</span>}
          </div>
        </div>
        <button
          onClick={onClear}
          aria-label={t("common.close")}
          className="
            p-2 rounded-lg
            text-text-muted hover:text-text-secondary dark:text-text-muted-dark dark:hover:text-text-secondary-dark
            hover:bg-surface-subtle dark:hover:bg-surface-subtle-dark
            transition-colors
          "
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
