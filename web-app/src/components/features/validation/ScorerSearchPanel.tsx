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

/** Unique ID for the scorer search listbox element, used for ARIA relationships. */
const SCORER_LISTBOX_ID = "scorer-search-listbox";

/** Unique ID for the search hint text, used for aria-describedby relationship. */
const SCORER_SEARCH_HINT_ID = "scorer-search-hint";

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
  const { t, tInterpolate } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const debouncedQuery = useDebouncedValue(searchQuery, SEARCH_DEBOUNCE_MS);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const searchFilters = parseSearchInput(debouncedQuery);
  const { data: results, isLoading, isError } = useScorerSearch(searchFilters);

  // Focus search input on mount and when scorer is cleared
  useEffect(() => {
    if (selectedScorer) return;

    const timeout = setTimeout(() => {
      searchInputRef.current?.focus();
    }, FOCUS_DELAY_MS);

    return () => clearTimeout(timeout);
  }, [selectedScorer]);

  // Scroll highlighted item into view when navigating with keyboard
  useEffect(() => {
    if (highlightedIndex >= 0 && results?.[highlightedIndex]) {
      const optionId = `scorer-option-${results[highlightedIndex].__identity}`;
      const element = document.getElementById(optionId);
      // scrollIntoView may not be available in test environments (JSDOM)
      if (element?.scrollIntoView) {
        element.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [highlightedIndex, results]);

  const handleSelect = useCallback(
    (scorer: ValidatedPersonSearchResult) => {
      onScorerSelect(scorer);
      setSearchQuery("");
      setHighlightedIndex(-1);
    },
    [onScorerSelect],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!results || results.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev < results.length - 1 ? prev + 1 : prev,
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case "Enter": {
          const selectedResult = results[highlightedIndex];
          if (highlightedIndex >= 0 && selectedResult) {
            e.preventDefault();
            handleSelect(selectedResult);
          }
          break;
        }
        case "Escape":
          setHighlightedIndex(-1);
          break;
        case "Home":
          e.preventDefault();
          setHighlightedIndex(0);
          break;
        case "End":
          e.preventDefault();
          setHighlightedIndex(results.length - 1);
          break;
      }
    },
    [results, highlightedIndex, handleSelect],
  );

  const handleClear = useCallback(() => {
    onScorerSelect(null);
    setSearchQuery("");
    setHighlightedIndex(-1);
    searchInputRef.current?.focus();
  }, [onScorerSelect]);

  const hasResults = results && results.length > 0;

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
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setHighlightedIndex(-1);
              }}
              onKeyDown={handleKeyDown}
              placeholder={t("validation.scorerSearch.searchPlaceholder")}
              aria-label={t("validation.scorerSearch.searchPlaceholder")}
              role="combobox"
              aria-expanded={hasResults && showResults ? "true" : "false"}
              aria-controls={SCORER_LISTBOX_ID}
              aria-activedescendant={
                highlightedIndex >= 0 && results?.[highlightedIndex]
                  ? `scorer-option-${results[highlightedIndex].__identity}`
                  : undefined
              }
              aria-autocomplete="list"
              aria-describedby={SCORER_SEARCH_HINT_ID}
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
            <p
              id={SCORER_SEARCH_HINT_ID}
              className="mt-2 text-xs text-gray-500 dark:text-gray-400"
            >
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
                highlightedIndex={highlightedIndex}
                onHighlight={setHighlightedIndex}
                listboxId={SCORER_LISTBOX_ID}
              />
            </div>
          )}

          {/* Screen reader announcement for result count */}
          <div aria-live="polite" aria-atomic="true" className="sr-only">
            {showResults && !isLoading && !isError && results && (
              <span>
                {results.length === 1
                  ? t("validation.scorerSearch.resultsCountOne")
                  : tInterpolate("validation.scorerSearch.resultsCount", {
                      count: results.length,
                    })}
              </span>
            )}
          </div>
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
