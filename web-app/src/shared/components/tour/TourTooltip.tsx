import { useTranslation } from "@/shared/hooks/useTranslation";

interface TourTooltipProps {
  titleKey: string;
  descriptionKey: string;
  currentStep: number;
  totalSteps: number;
  onSkip: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  isLastStep: boolean;
  isFirstStep: boolean;
}

export function TourTooltip({
  titleKey,
  descriptionKey,
  currentStep,
  totalSteps,
  onSkip,
  onNext,
  onPrevious,
  isLastStep,
  isFirstStep,
}: TourTooltipProps) {
  const { t, tInterpolate } = useTranslation();

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-base font-semibold text-text-primary dark:text-text-primary-dark">
          {t(titleKey as Parameters<typeof t>[0])}
        </h3>
        <button
          type="button"
          onClick={onSkip}
          className="flex-shrink-0 p-1 -mr-1 -mt-1 rounded-md text-text-muted dark:text-text-muted-dark hover:text-text-secondary dark:hover:text-text-secondary-dark hover:bg-surface-subtle dark:hover:bg-surface-subtle-dark transition-colors"
          aria-label={t("tour.actions.skip")}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Description */}
      <p className="text-sm text-text-secondary dark:text-text-secondary-dark mb-4">
        {t(descriptionKey as Parameters<typeof t>[0])}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-border-subtle dark:border-border-subtle-dark">
        {/* Step indicator */}
        <div className="flex items-center gap-1.5">
          {Array.from({ length: totalSteps }).map((_, index) => (
            <div
              key={`step-${index}`}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentStep
                  ? "bg-primary-500"
                  : index < currentStep
                    ? "bg-primary-300 dark:bg-primary-700"
                    : "bg-surface-muted dark:bg-surface-subtle-dark"
              }`}
              aria-label={
                index === currentStep
                  ? tInterpolate("tour.stepCurrent", { step: index + 1, total: totalSteps })
                  : undefined
              }
            />
          ))}
          <span className="ml-2 text-xs text-text-muted dark:text-text-muted-dark">
            {currentStep + 1}/{totalSteps}
          </span>
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center gap-2">
          {!isFirstStep && onPrevious && (
            <button
              type="button"
              onClick={onPrevious}
              className="px-3 py-1.5 text-sm font-medium text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark transition-colors"
            >
              {t("tour.actions.previous")}
            </button>
          )}

          {onNext && (
            <button
              type="button"
              onClick={onNext}
              className="px-4 py-1.5 text-sm font-medium bg-primary-500 text-primary-950 rounded-lg hover:bg-primary-600 transition-colors"
            >
              {isLastStep ? t("tour.actions.finish") : t("tour.actions.next")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
