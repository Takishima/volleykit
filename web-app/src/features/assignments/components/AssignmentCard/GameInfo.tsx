import { useTranslation } from "@/shared/hooks/useTranslation";
import { useAssignmentCardContext } from "./context";

/** Displays game number and league/category info in details view */
export function GameInfo() {
  const { t } = useTranslation();
  const { game } = useAssignmentCardContext();

  const gameNumber = game?.number;
  const leagueCategory = game?.group?.phase?.league?.leagueCategory?.name;
  const gender = game?.group?.phase?.league?.gender;

  return (
    <>
      {gameNumber && (
        <div className="text-xs text-text-subtle dark:text-text-subtle-dark">
          #{gameNumber}
        </div>
      )}
      {leagueCategory && (
        <div className="text-xs text-text-subtle dark:text-text-subtle-dark">
          {leagueCategory}
          {gender &&
            ` • ${gender === "m" ? t("common.men") : t("common.women")}`}
        </div>
      )}
    </>
  );
}
