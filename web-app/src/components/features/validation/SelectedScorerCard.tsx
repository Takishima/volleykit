import type { ValidatedPersonSearchResult } from "@/api/validation";
import { useTranslation } from "@/hooks/useTranslation";
import { formatBirthday } from "./format-birthday";

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
    <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium text-gray-900 dark:text-white">
            {scorer.displayName}
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
            {scorer.associationId && <span>ID: {scorer.associationId}</span>}
            {scorer.birthday && <span>{formatBirthday(scorer.birthday)}</span>}
          </div>
        </div>
        <button
          onClick={onClear}
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
  );
}
