import { useTranslation } from "@/hooks/useTranslation";

export function ScoresheetPanel() {
  const { t } = useTranslation();

  return (
    <div className="py-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {t("validation.scoresheetPlaceholder")}
      </p>
    </div>
  );
}
