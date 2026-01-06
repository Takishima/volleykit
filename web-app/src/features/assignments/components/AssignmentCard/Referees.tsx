import { useTranslation } from "@/shared/hooks/useTranslation";
import { useAssignmentCardContext } from "./context";

/** Displays referee names in details view */
export function Referees() {
  const { t } = useTranslation();
  const { headReferee1, headReferee2, linesmen } = useAssignmentCardContext();

  const hasReferees = headReferee1 || headReferee2 || linesmen.length > 0;

  if (!hasReferees) {
    return null;
  }

  return (
    <div className="text-xs text-text-subtle dark:text-text-subtle-dark pt-1 space-y-0.5">
      {headReferee1 && (
        <div>
          <span className="font-medium">{t("positions.head-one")}:</span>{" "}
          {headReferee1}
        </div>
      )}
      {headReferee2 && (
        <div>
          <span className="font-medium">{t("positions.head-two")}:</span>{" "}
          {headReferee2}
        </div>
      )}
      {linesmen.length > 0 && (
        <div>
          <span className="font-medium">{t("occupations.linesmen")}:</span>{" "}
          {linesmen.join(", ")}
        </div>
      )}
    </div>
  );
}
