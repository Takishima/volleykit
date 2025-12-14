import { useState, useRef, useEffect, useCallback } from "react";
import type { ValidatedPersonSearchResult } from "@/api/validation";
import { useTranslation } from "@/hooks/useTranslation";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useScorerSearch, parseSearchInput } from "@/hooks/useScorerSearch";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

// Debounce delay for search input as specified in issue #37
const SEARCH_DEBOUNCE_MS = 300;

// Delay before focusing search input to ensure UI has settled
const FOCUS_DELAY_MS = 100;

interface ScorerSearchPanelProps {
  selectedScorer?: ValidatedPersonSearchResult | null;
  onScorerSelect: (scorer: ValidatedPersonSearchResult | null) => void;
}

/**
 * Formats a birthday date string for display.
 * Returns the date in a localized format, or empty string if invalid.
 */
function formatBirthday(birthday: string | undefined | null): string {
  if (!birthday) return "";
  const date = new Date(birthday);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString();
}

/**
 * Panel for searching and selecting a game scorer.
 * Features fuzzy search with flexible input parsing (names in any order, optional birth year).
 */
export function ScorerSearchPanel({
  selectedScorer,
  onScorerSelect,
}: ScorerSearchPanelProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebouncedValue(searchQuery, SEARCH_DEBOUNCE_MS);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const searchFilters = parseSearchInput(debouncedQuery);
  const { data: results, isLoading, isError } = useScorerSearch(searchFilters);

  // Focus search input on mount and when scorer is cleared
  useEffect(() => {
    if (!selectedScorer) {
      const timeout = setTimeout(() => {
        searchInputRef.current?.focus();
      }, FOCUS_DELAY_MS);
      return () => clearTimeout(timeout);
    }
  }, [selectedScorer]);

  const handleSelect = useCallback(
    (scorer: ValidatedPersonSearchResult) => {
      onScorerSelect(scorer);
      setSearchQuery("");
    },
    [onScorerSelect],
  );

  const handleClear = useCallback(() => {
    onScorerSelect(null);
    setSearchQuery("");
    searchInputRef.current?.focus();
  }, [onScorerSelect]);

  const hasResults = results && results.length > 0;
  const showResults = debouncedQuery.trim() && !selectedScorer;

  return (
    <div className="py-4">
      {/* Selected Scorer Display */}
      {selectedScorer && (
        <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900 dark:text-white">
                {selectedScorer.displayName}
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                {selectedScorer.associationId && (
                  <span>ID: {selectedScorer.associationId}</span>
                )}
                {selectedScorer.birthday && (
                  <span>{formatBirthday(selectedScorer.birthday)}</span>
                )}
              </div>
            </div>
            <button
              onClick={handleClear}
              aria-label={t("common.close")}
              className="
                p-2 rounded-lg
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
        </div>
      )}

      {/* Search Input */}
      {!selectedScorer && (
        <>
          <div className="mb-4">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("validation.scorerSearch.searchPlaceholder")}
              aria-label={t("validation.scorerSearch.searchPlaceholder")}
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
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {t("validation.scorerSearch.searchHint")}
            </p>
          </div>

          {/* Results */}
          {showResults && (
            <div className="mt-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner size="md" />
                </div>
              ) : isError ? (
                <div
                  role="alert"
                  className="text-center py-8 text-red-500 dark:text-red-400"
                >
                  {t("validation.scorerSearch.searchError")}
                </div>
              ) : !hasResults ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  {t("validation.noPlayersFound")}
                </div>
              ) : (
                <ul className="space-y-1">
                  {results.map((scorer) => (
                    <li key={scorer.__identity}>
                      <button
                        onClick={() => handleSelect(scorer)}
                        className="
                          w-full flex items-center justify-between p-3 rounded-lg
                          text-left
                          hover:bg-gray-100 dark:hover:bg-gray-700
                          transition-colors
                        "
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
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}

      {/* Optional indicator when no scorer is selected and no search is active */}
      {!selectedScorer && !showResults && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("validation.scorerSearch.noScorerSelected")}
        </p>
      )}
    </div>
  );
}
