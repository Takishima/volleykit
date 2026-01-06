import { CircleAlert, ExternalLink } from "@/components/ui/icons";
import { useTranslation } from "@/hooks/useTranslation";
import { useAssignmentCardContext } from "./context";

/** Displays single-ball hall warning notice in details view */
export function SingleBallNotice() {
  const { t } = useTranslation();
  const { singleBallMatch, singleBallPdfPath } = useAssignmentCardContext();

  if (!singleBallMatch) {
    return null;
  }

  return (
    <a
      href={singleBallPdfPath}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 px-2 py-1.5 rounded-md hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors group"
      onClick={(e) => e.stopPropagation()}
    >
      <CircleAlert className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
      <span className="underline decoration-amber-400/50 group-hover:decoration-amber-500 underline-offset-2">
        {singleBallMatch.isConditional
          ? t("assignments.singleBallHallConditional")
          : t("assignments.singleBallHall")}
      </span>
      <ExternalLink
        className="w-3 h-3 flex-shrink-0 opacity-60 group-hover:opacity-100"
        aria-hidden="true"
      />
    </a>
  );
}
