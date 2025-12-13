import type { Assignment } from "@/api/client";
import { useTranslation } from "@/hooks/useTranslation";

interface ScoresheetPanelProps {
  assignment: Assignment;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ScoresheetPanel(_props: ScoresheetPanelProps) {
  const { t } = useTranslation();

  return (
    <div className="py-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {t("validation.scoresheetPlaceholder")}
      </p>
    </div>
  );
}
