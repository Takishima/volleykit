import { useState, useRef, useEffect, useCallback } from "react";
import type { ValidatedPersonSearchResult } from "@/api/validation";
import { useTranslation } from "@/hooks/useTranslation";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useScorerSearch, parseSearchInput } from "@/hooks/useScorerSearch";
import { SelectedScorerCard } from "./SelectedScorerCard";
import { ScorerResultsList } from "./ScorerResultsList";

/**
 * Debounce delay for search input.
 * 300ms balances responsiveness with avoiding excessive API calls:
 * - Short enough that users don't perceive lag after typing
 * - Long enough to batch rapid keystrokes into single requests
 * Research suggests 200-400ms is optimal for search-as-you-type UX.
 */
const SEARCH_DEBOUNCE_MS = 300;

/**
 * Delay before focusing search input after mount or state changes.
 * 100ms allows React to complete rendering and DOM updates before
 * attempting to focus, preventing focus failures on unmounted elements.
 */
const FOCUS_DELAY_MS = 100;

interface ScorerSearchPanelProps {
  selectedScorer?: ValidatedPersonSearchResult | null;
  onScorerSelect: (scorer: ValidatedPersonSearchResult | null) => void;
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

  const showResults = debouncedQuery.trim() && !selectedScorer;

  return (
    <div className="py-4">
      {selectedScorer && (
        <SelectedScorerCard scorer={selectedScorer} onClear={handleClear} />
      )}

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

          {showResults && (
            <div className="mt-4">
              <ScorerResultsList
                results={results}
                isLoading={isLoading}
                isError={isError}
                onSelect={handleSelect}
              />
            </div>
          )}
        </>
      )}

      {!selectedScorer && !showResults && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("validation.scorerSearch.noScorerSelected")}
        </p>
      )}
    </div>
  );
}
