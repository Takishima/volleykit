import type { Assignment } from "@/api/client";
import { useTranslation } from "@/hooks/useTranslation";
import { getTeamNames } from "@/utils/assignment-helpers";

interface HomeRosterPanelProps {
  assignment: Assignment;
}

export function HomeRosterPanel({ assignment }: HomeRosterPanelProps) {
  const { t } = useTranslation();
  const { homeTeam } = getTeamNames(assignment);

  return (
    <div className="py-4">
      <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
        {homeTeam}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {t("validation.homeRosterPlaceholder")}
      </p>
    </div>
  );
}
