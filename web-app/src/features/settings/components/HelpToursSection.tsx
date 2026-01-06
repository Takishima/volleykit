import { memo } from "react";
import { useShallow } from "zustand/react/shallow";
import { BookOpen } from "lucide-react";
import { useTourStore, type TourId } from "@/shared/stores/tour";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Card, CardContent, CardHeader } from "@/shared/components/Card";
import { Button } from "@/shared/components/Button";
import { getHelpSiteUrl } from "@/shared/utils/constants";

const TOUR_IDS: TourId[] = ["assignments", "compensations", "exchange", "settings"];

interface HelpToursSectionProps {
  isDemoMode: boolean;
}

function HelpToursSectionComponent({ isDemoMode }: HelpToursSectionProps) {
  const { t } = useTranslation();
  const { getTourStatus, resetAllTours } = useTourStore(
    useShallow((state) => ({
      getTourStatus: state.getTourStatus,
      resetAllTours: state.resetAllTours,
    })),
  );

  return (
    <Card data-tour="tour-reset">
      <CardHeader>
        <div className="flex items-center gap-2">
          <BookOpen
            className="w-5 h-5 text-primary-600 dark:text-primary-400"
            aria-hidden="true"
          />
          <h2 className="font-semibold text-text-primary dark:text-text-primary-dark">
            {t("settings.helpTours.title")}
          </h2>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Help documentation link */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
            {t("settings.help.title")}
          </div>
          <p className="text-sm text-text-muted dark:text-text-muted-dark">
            {t("settings.help.description")}
          </p>
          <a
            href={getHelpSiteUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary-600 dark:text-primary-400 hover:underline text-sm"
          >
            {t("settings.help.openDocs")} &rarr;
          </a>
        </div>

        {/* Separator */}
        <div className="border-t border-border-subtle dark:border-border-subtle-dark" />

        {/* Tours */}
        <div className="space-y-4">
          <div className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
            {t("tour.settings.tourSection.title")}
          </div>
          <p className="text-sm text-text-muted dark:text-text-muted-dark">
            {t("tour.settings.tourSection.description")}
          </p>

          {/* Safe mode note - only show outside demo mode */}
          {!isDemoMode && (
            <p className="text-sm text-warning-600 dark:text-warning-400">
              {t("tour.settings.tourSection.safeModeNote")}
            </p>
          )}

          {/* Tour status list */}
          <div className="space-y-2">
            {TOUR_IDS.map((tourId) => {
              const status = getTourStatus(tourId);
              return (
                <div
                  key={tourId}
                  className="flex items-center justify-between py-1"
                >
                  <span className="text-sm text-text-primary dark:text-text-primary-dark capitalize">
                    {t(`nav.${tourId}` as Parameters<typeof t>[0])}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      status === "completed"
                        ? "bg-success-100 text-success-700 dark:bg-success-900/50 dark:text-success-300"
                        : status === "dismissed"
                          ? "bg-warning-100 text-warning-700 dark:bg-warning-900/50 dark:text-warning-300"
                          : "bg-surface-subtle text-text-muted dark:bg-surface-subtle-dark dark:text-text-muted-dark"
                    }`}
                  >
                    {status === "completed"
                      ? t("tour.settings.tourSection.statusCompleted")
                      : status === "dismissed"
                        ? t("tour.settings.tourSection.statusSkipped")
                        : t("tour.settings.tourSection.statusNotStarted")}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Reset button */}
          <div className="pt-2">
            <Button variant="secondary" onClick={resetAllTours}>
              {t("tour.settings.tourSection.restart")}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export const HelpToursSection = memo(HelpToursSectionComponent);
