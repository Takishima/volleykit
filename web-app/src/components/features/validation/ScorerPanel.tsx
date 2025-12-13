import type { Assignment } from "@/api/client";
import { useTranslation } from "@/hooks/useTranslation";

interface ScorerPanelProps {
  assignment: Assignment;
}

export function ScorerPanel({ assignment: _assignment }: ScorerPanelProps) {
  const { t } = useTranslation();

  return (
    <div className="py-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {t("validation.scorerPlaceholder")}
      </p>
    </div>
  );
}
