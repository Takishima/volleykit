import { useTranslation } from "@/hooks/useTranslation";
import { useTourStore } from "@/stores/tour";

export function TourModeBanner() {
  const { activeTour, dismissTour } = useTourStore();
  const { t } = useTranslation();

  if (!activeTour) return null;

  return (
    <div
      className="bg-primary-100 dark:bg-primary-900/50 border-b border-primary-200 dark:border-primary-800"
      role="status"
      aria-live="polite"
    >
      <div className="max-w-7xl mx-auto px-4 py-2">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            {/* Graduation cap icon */}
            <svg
              className="w-5 h-5 flex-shrink-0 text-primary-600 dark:text-primary-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 14l9-5-9-5-9 5 9 5z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222"
              />
            </svg>

            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="font-medium text-primary-700 dark:text-primary-300">
                {t("tour.banner.title")}
              </span>
              <span className="hidden sm:inline text-primary-600 dark:text-primary-400">
                •
              </span>
              <span className="hidden sm:inline text-primary-600 dark:text-primary-400 truncate">
                {t("tour.banner.subtitle")}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={dismissTour}
            className="flex-shrink-0 px-3 py-1 text-sm font-medium text-primary-700 dark:text-primary-300 hover:text-primary-900 dark:hover:text-primary-100 hover:bg-primary-200 dark:hover:bg-primary-800 rounded-md transition-colors"
          >
            {t("tour.banner.exit")}
          </button>
        </div>
      </div>
    </div>
  );
}
