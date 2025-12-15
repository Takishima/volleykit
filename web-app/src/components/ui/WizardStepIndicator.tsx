import type { WizardStep } from "@/hooks/useWizardNavigation";

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <polyline points="20,6 9,17 4,12" />
    </svg>
  );
}

interface WizardStepIndicatorProps {
  /** All wizard steps */
  steps: WizardStep[];
  /** Current step index (0-based) */
  currentStepIndex: number;
  /** Map of step id to completion status */
  completionStatus: Record<string, boolean>;
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
  completionStatus,
  onStepClick,
  clickable = false,
}: WizardStepIndicatorProps) {
  return (
    <div
      className="flex items-center justify-center gap-2"
      role="navigation"
      aria-label="Wizard progress"
    >
      {steps.map((step, index) => {
        const isCurrent = index === currentStepIndex;
        const isComplete = completionStatus[step.id] === true;
        const isPast = index < currentStepIndex;

        // Determine if this step should show completion indicator
        const showCompletion = !step.isOptional && (isComplete || isPast);

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
                    ? "bg-orange-500"
                    : "bg-gray-300 dark:bg-gray-600"
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
              aria-label={`${step.label}${isCurrent ? " (current)" : ""}${showCompletion ? " (complete)" : ""}`}
              className={`
                relative flex items-center justify-center w-8 h-8 rounded-full
                transition-all duration-200
                ${clickable ? "cursor-pointer hover:scale-110" : "cursor-default"}
                ${
                  isCurrent
                    ? "bg-orange-500 text-white ring-2 ring-orange-500 ring-offset-2 dark:ring-offset-gray-800"
                    : showCompletion
                      ? "bg-green-500 text-white"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                }
                focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-800
                aria-disabled:cursor-default aria-disabled:opacity-100
              `}
            >
              {showCompletion && !isCurrent ? (
                <CheckIcon className="w-4 h-4" />
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
