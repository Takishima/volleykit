import type { ValidatedPersonSearchResult } from "@/api/validation";
import { useTranslation } from "@/hooks/useTranslation";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { formatBirthday } from "./format-birthday";

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
        className="text-center py-8 text-red-500 dark:text-red-400"
      >
        {t("validation.scorerSearch.searchError")}
      </div>
    );
  }

  if (!hasResults) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        {t("validation.noPlayersFound")}
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
                    ? "bg-blue-50 dark:bg-blue-900/30"
                    : "hover:bg-gray-100 dark:hover:bg-gray-700"
                }
              `}
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 dark:text-white truncate">
                  {scorer.displayName}
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                  {scorer.associationId && (
                    <span>ID: {scorer.associationId}</span>
                  )}
                  {scorer.birthday && (
                    <span>{formatBirthday(scorer.birthday)}</span>
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
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
