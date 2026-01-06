import { useTranslation } from "@/hooks/useTranslation";
import { useAssignmentCardContext } from "./context";

/** Displays city, single-ball indicator, league category, and expand arrow in compact view */
export function CityInfo() {
  const { t } = useTranslation();
  const { city, game, singleBallMatch, expandArrow } =
    useAssignmentCardContext();

  const leagueCategory = game?.group?.phase?.league?.leagueCategory?.name;

  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-col items-end w-24">
        <span className="text-xs text-text-muted dark:text-text-muted-dark truncate w-full text-right flex items-center justify-end gap-1">
          {city || ""}
          {singleBallMatch && (
            <span
              className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-[10px] font-bold flex-shrink-0"
              title={t("assignments.singleBallHallTooltip")}
              aria-label={t("assignments.singleBallHallTooltip")}
            >
              1
            </span>
          )}
        </span>
        {leagueCategory && (
          <span className="text-xs text-text-subtle dark:text-text-subtle-dark truncate w-full text-right">
            {leagueCategory}
          </span>
        )}
      </div>
      {expandArrow}
    </div>
  );
}
