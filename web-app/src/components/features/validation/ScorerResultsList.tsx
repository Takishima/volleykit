import type { ValidatedPersonSearchResult } from "@/api/validation";
import { useTranslation } from "@/hooks/useTranslation";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { formatDOB } from "@/utils/date-helpers";
import { ChevronRight } from "@/components/ui/icons";

interface ScorerResultsListProps {
  results: ValidatedPersonSearchResult[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onSelect: (scorer: ValidatedPersonSearchResult) => void;
  highlightedIndex?: number;
  onHighlight?: (index: number) => void;
  listboxId?: string;
}

/** Generates a unique ID for a scorer option element. */
function getScorerOptionId(identity: string): string {
  return `scorer-option-${identity}`;
}

/**
 * Displays search results for scorer search.
 * Handles loading, error, empty, and results states.
 */
export function ScorerResultsList({
  results,
  isLoading,
  isError,
  onSelect,
  highlightedIndex = -1,
  onHighlight,
  listboxId,
}: ScorerResultsListProps) {
  const { t } = useTranslation();

  const hasResults = results && results.length > 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (isError) {
    return (
      <div
        role="alert"
        className="text-center py-8 text-danger-500 dark:text-danger-400"
      >
        {t("validation.scorerSearch.searchError")}
      </div>
    );
  }

  if (!hasResults) {
    return (
      <div className="text-center py-8 text-text-muted dark:text-text-muted-dark">
        {t("validation.scorerSearch.noScorersFound")}
      </div>
    );
  }

  return (
    <ul
      id={listboxId}
      role="listbox"
      aria-label={t("validation.scorerSearch.searchResults")}
      className="space-y-1"
    >
      {results.map((scorer, index) => {
        const isHighlighted = index === highlightedIndex;
        return (
          <li
            key={scorer.__identity}
            id={getScorerOptionId(scorer.__identity)}
            role="option"
            aria-selected={isHighlighted}
          >
            <button
              onClick={() => onSelect(scorer)}
              onMouseEnter={() => onHighlight?.(index)}
              className={`
                w-full flex items-center justify-between p-3 rounded-lg
                text-left
                transition-colors
                ${
                  isHighlighted
                    ? "bg-primary-50 dark:bg-primary-900/30"
                    : "hover:bg-surface-subtle dark:hover:bg-surface-subtle-dark"
                }
              `}
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-text-primary dark:text-text-primary-dark truncate">
                  {scorer.displayName}
                </div>
                <div className="flex items-center gap-3 text-sm text-text-muted dark:text-text-muted-dark">
                  {scorer.associationId && (
                    <span>ID: {scorer.associationId}</span>
                  )}
                  {scorer.birthday && (
                    <span>{formatDOB(scorer.birthday)}</span>
                  )}
                </div>
              </div>
              <ChevronRight
                className="w-5 h-5 text-text-subtle flex-shrink-0 ml-2"
                aria-hidden="true"
              />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
