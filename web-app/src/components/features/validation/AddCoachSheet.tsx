import { useState, useRef, useEffect, useCallback } from "react";
import type { ValidatedPersonSearchResult } from "@/api/validation";
import { useTranslation } from "@/hooks/useTranslation";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useScorerSearch, parseSearchInput } from "@/hooks/useScorerSearch";
import { ResponsiveSheet } from "@/components/ui/ResponsiveSheet";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { X, ChevronRight } from "@/components/ui/icons";
import { formatDOB } from "@/utils/date-helpers";
import type { CoachRole } from "@/hooks/useNominationList";

/** Delay before focusing search input to ensure the sheet animation has started */
const FOCUS_DELAY_MS = 100;

/** Debounce delay for search input to avoid searching on every keystroke */
const SEARCH_DEBOUNCE_MS = 300;

/** Unique ID for the coach search listbox element */
const COACH_LISTBOX_ID = "coach-search-listbox";

interface AddCoachSheetProps {
  isOpen: boolean;
  onClose: () => void;
  /** The role being filled (head, firstAssistant, secondAssistant) */
  role: CoachRole;
  /** Callback when a coach is selected */
  onSelectCoach: (coach: ValidatedPersonSearchResult, role: CoachRole) => void;
}

function getRoleLabel(
  role: CoachRole,
  t: ReturnType<typeof useTranslation>["t"],
): string {
  switch (role) {
    case "head":
      return t("validation.roster.headCoach");
    case "firstAssistant":
      return t("validation.roster.firstAssistant");
    case "secondAssistant":
      return t("validation.roster.secondAssistant");
  }
}

export function AddCoachSheet({
  isOpen,
  onClose,
  role,
  onSelectCoach,
}: AddCoachSheetProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const debouncedQuery = useDebouncedValue(searchQuery, SEARCH_DEBOUNCE_MS);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const searchFilters = parseSearchInput(debouncedQuery);
  const { data: results, isLoading, isError } = useScorerSearch(searchFilters, {
    enabled: isOpen && debouncedQuery.trim().length > 0,
  });

  const handleClose = useCallback(() => {
    setSearchQuery("");
    setHighlightedIndex(-1);
    onClose();
  }, [onClose]);

  const handleSelect = useCallback(
    (coach: ValidatedPersonSearchResult) => {
      onSelectCoach(coach, role);
      handleClose();
    },
    [onSelectCoach, role, handleClose],
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
      }
    },
    [results, highlightedIndex, handleSelect],
  );

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      const timeout = setTimeout(() => {
        searchInputRef.current?.focus();
      }, FOCUS_DELAY_MS);
      return () => clearTimeout(timeout);
    }
  }, [isOpen]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && results?.[highlightedIndex]) {
      const optionId = `coach-option-${results[highlightedIndex].__identity}`;
      const element = document.getElementById(optionId);
      if (element?.scrollIntoView) {
        element.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [highlightedIndex, results]);

  const hasResults = results && results.length > 0;
  const showResults = debouncedQuery.trim().length > 0;
  const roleLabel = getRoleLabel(role, t);

  return (
    <ResponsiveSheet isOpen={isOpen} onClose={handleClose} titleId="add-coach-title">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-border-default dark:border-border-default-dark">
        <div>
          <h2
            id="add-coach-title"
            className="text-lg font-semibold text-text-primary dark:text-text-primary-dark"
          >
            {t("validation.roster.addCoach")}
          </h2>
          <p className="text-sm text-text-muted dark:text-text-muted-dark">
            {roleLabel}
          </p>
        </div>
        <button
          onClick={handleClose}
          aria-label={t("common.close")}
          className="
            p-2 -mr-2 rounded-lg
            text-text-muted hover:text-text-secondary dark:text-text-muted-dark dark:hover:text-text-secondary-dark
            hover:bg-surface-subtle dark:hover:bg-surface-subtle-dark
            transition-colors
          "
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>

      {/* Search Input */}
      <div className="flex-shrink-0 p-4 border-b border-border-default dark:border-border-default-dark">
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setHighlightedIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          placeholder={t("validation.roster.searchCoaches")}
          aria-label={t("validation.roster.searchCoaches")}
          role="combobox"
          aria-expanded={hasResults && showResults ? "true" : "false"}
          aria-controls={COACH_LISTBOX_ID}
          aria-activedescendant={
            highlightedIndex >= 0 && results?.[highlightedIndex]
              ? `coach-option-${results[highlightedIndex].__identity}`
              : undefined
          }
          aria-autocomplete="list"
          className="
            w-full px-4 py-2 rounded-lg
            bg-surface-subtle dark:bg-surface-subtle-dark
            text-text-primary dark:text-text-primary-dark
            placeholder-text-muted dark:placeholder-text-muted-dark
            border border-transparent
            focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20
            outline-none transition-colors
          "
        />
      </div>

      {/* Results List */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-2 py-2">
        {!showResults ? (
          <div className="text-center py-8 text-text-muted dark:text-text-muted-dark">
            {t("validation.scorerSearch.searchHint")}
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="md" />
          </div>
        ) : isError ? (
          <div
            role="alert"
            className="text-center py-8 text-danger-500 dark:text-danger-400"
          >
            {t("validation.roster.loadCoachesError")}
          </div>
        ) : !hasResults ? (
          <div className="text-center py-8 text-text-muted dark:text-text-muted-dark">
            {t("validation.roster.noCoachesFound")}
          </div>
        ) : (
          <ul
            id={COACH_LISTBOX_ID}
            role="listbox"
            aria-label={t("validation.roster.coaches")}
            className="space-y-1"
          >
            {results.map((coach, index) => {
              const isHighlighted = index === highlightedIndex;
              return (
                <li
                  key={coach.__identity}
                  id={`coach-option-${coach.__identity}`}
                  role="option"
                  aria-selected={isHighlighted}
                >
                  <button
                    type="button"
                    onClick={() => handleSelect(coach)}
                    onMouseEnter={() => setHighlightedIndex(index)}
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
                        {coach.displayName}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-text-muted dark:text-text-muted-dark">
                        {coach.associationId && (
                          <span>ID: {coach.associationId}</span>
                        )}
                        {coach.birthday && (
                          <span>
                            {t("common.dob")}: {formatDOB(coach.birthday)}
                          </span>
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
        )}
      </div>

      {/* Footer with Cancel button */}
      <div className="flex-shrink-0 p-4 border-t border-border-default dark:border-border-default-dark">
        <button
          type="button"
          onClick={handleClose}
          className="
            w-full py-3 px-4 rounded-lg
            text-sm font-medium
            text-text-secondary dark:text-text-secondary-dark
            bg-surface-subtle dark:bg-surface-subtle-dark
            hover:bg-gray-200 dark:hover:bg-gray-700
            transition-colors
            focus:outline-none focus:ring-2 focus:ring-primary-500/50
          "
        >
          {t("common.cancel")}
        </button>
      </div>
    </ResponsiveSheet>
  );
}
