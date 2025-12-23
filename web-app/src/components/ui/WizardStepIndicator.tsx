import type { WizardStep } from "@/hooks/useWizardNavigation";
import { Check } from "@/components/ui/icons";
import { useTranslation } from "@/hooks/useTranslation";

/** Returns the appropriate style classes based on step state */
function getStepIndicatorStyle(
  isCurrent: boolean,
  showCompletion: boolean,
): string {
  if (isCurrent) {
    return "bg-primary-500 text-primary-950 ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-surface-card-dark";
  }
  if (showCompletion) {
    return "bg-success-500 text-white";
  }
  return "bg-surface-muted dark:bg-surface-subtle-dark text-text-muted dark:text-text-muted-dark";
}

interface WizardStepIndicatorProps {
  /** All wizard steps */
  steps: WizardStep[];
  /** Current step index (0-based) */
  currentStepIndex: number;
  /** Set of step indices that user has marked as done */
  stepsMarkedDone: ReadonlySet<number>;
  /** Optional callback when clicking a step indicator */
  onStepClick?: (index: number) => void;
  /** Whether step clicking is enabled */
  clickable?: boolean;
}

/**
 * Visual indicator showing wizard progress with step dots.
 *
 * - Current step: Highlighted/active
 * - Completed steps: Show checkmark
 * - Incomplete steps: Show empty dot
 * - Optional steps: No completion indicator
 */
export function WizardStepIndicator({
  steps,
  currentStepIndex,
  stepsMarkedDone,
  onStepClick,
  clickable = false,
}: WizardStepIndicatorProps) {
  const { t } = useTranslation();

  return (
    <div
      className="flex items-center justify-center gap-2"
      role="navigation"
      aria-label={t("common.wizardProgress")}
    >
      {steps.map((step, index) => {
        const isCurrent = index === currentStepIndex;
        const isMarkedDone = stepsMarkedDone.has(index);

        // Show checkmark if user has marked step as done (and it's not optional)
        const showCompletion = !step.isOptional && isMarkedDone;

        const isDisabled = !clickable;

        const handleClick = () => {
          if (!isDisabled && onStepClick) {
            onStepClick(index);
          }
        };

        const handleKeyDown = (e: React.KeyboardEvent) => {
          if (
            !isDisabled &&
            onStepClick &&
            (e.key === "Enter" || e.key === " ")
          ) {
            e.preventDefault();
            onStepClick(index);
          }
        };

        return (
          <div key={step.id} className="flex items-center">
            {/* Connector line before step (except first) */}
            {index > 0 && (
              <div
                className={`w-8 h-0.5 mx-1 transition-colors ${
                  index <= currentStepIndex
                    ? "bg-primary-500"
                    : "bg-border-strong dark:bg-border-strong-dark"
                }`}
              />
            )}

            {/* Step indicator - use aria-disabled to keep in tab order for accessibility */}
            <button
              type="button"
              onClick={handleClick}
              onKeyDown={handleKeyDown}
              aria-disabled={isDisabled}
              aria-current={isCurrent ? "step" : undefined}
              aria-label={`${step.label}${isCurrent ? ` ${t("common.stepIndicatorCurrent")}` : ""}${showCompletion ? ` ${t("common.stepIndicatorDone")}` : ""}`}
              className={`
                relative flex items-center justify-center w-8 h-8 rounded-full
                transition-all duration-200
                ${clickable ? "cursor-pointer hover:scale-110" : "cursor-default"}
                ${getStepIndicatorStyle(isCurrent, showCompletion)}
                focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-surface-card-dark
                aria-disabled:cursor-default aria-disabled:opacity-100
              `}
            >
              {showCompletion && !isCurrent ? (
                <Check className="w-4 h-4" strokeWidth={3} aria-hidden="true" />
              ) : (
                <span className="text-xs font-semibold">{index + 1}</span>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}
