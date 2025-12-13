import type { Assignment } from "@/api/client";
import { useTranslation } from "@/hooks/useTranslation";

interface ScoresheetPanelProps {
  assignment: Assignment;
}

export function ScoresheetPanel({
  assignment: _assignment,
}: ScoresheetPanelProps) {
  const { t } = useTranslation();

  return (
    <div className="py-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {t("validation.scoresheetPlaceholder")}
      </p>
    </div>
  );
}
