import type { Assignment } from "@/api/client";
import { useTranslation } from "@/hooks/useTranslation";

interface ScorerPanelProps {
  assignment: Assignment;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ScorerPanel(_props: ScorerPanelProps) {
  const { t } = useTranslation();

  return (
    <div className="py-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {t("validation.scorerPlaceholder")}
      </p>
    </div>
  );
}
