import { Check, AlertTriangle, Lock } from '@/shared/components/icons'
import { useTranslation } from '@/shared/hooks/useTranslation'
import type { WizardStep } from '@/shared/hooks/useWizardNavigation'

/** Returns the appropriate style classes based on step state */
function getStepIndicatorStyle(
  isCurrent: boolean,
  showCompletion: boolean,
  isInvalid: boolean,
  isReadOnly: boolean
): string {
  if (isCurrent) {
    if (isReadOnly) {
      return 'bg-surface-muted dark:bg-surface-subtle-dark text-text-muted dark:text-text-muted-dark ring-2 ring-border-strong dark:ring-border-strong-dark ring-offset-2 dark:ring-offset-surface-card-dark'
    }
    // Current step with invalid state gets warning ring
    if (isInvalid) {
      return 'bg-warning-500 text-warning-950 ring-2 ring-warning-500 ring-offset-2 dark:ring-offset-surface-card-dark'
    }
    return 'bg-primary-500 text-primary-950 ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-surface-card-dark'
  }
  // Non-current read-only (finalized) step
  if (isReadOnly) {
    return 'bg-surface-muted dark:bg-surface-subtle-dark text-text-muted dark:text-text-muted-dark'
  }
  // Non-current invalid step
  if (isInvalid) {
    return 'bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-400 ring-2 ring-warning-400 dark:ring-warning-600'
  }
  if (showCompletion) {
    return 'bg-success-500 text-white'
  }
  return 'bg-surface-muted dark:bg-surface-subtle-dark text-text-muted dark:text-text-muted-dark'
}

interface WizardStepIndicatorProps {
  /** All wizard steps */
  steps: WizardStep[]
  /** Current step index (0-based) */
  currentStepIndex: number
  /** Set of step indices that user has marked as done */
  stepsMarkedDone: ReadonlySet<number>
  /** Optional callback when clicking a step indicator */
  onStepClick?: (index: number) => void
  /** Whether step clicking is enabled */
  clickable?: boolean
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
  const { t } = useTranslation()

  return (
    <div
      className="flex items-center justify-center gap-2"
      role="navigation"
      aria-label={t('common.wizardProgress')}
    >
      {steps.map((step, index) => {
        const isCurrent = index === currentStepIndex
        const isMarkedDone = stepsMarkedDone.has(index)
        const isInvalid = step.isInvalid ?? false
        const isReadOnly = step.isReadOnly ?? false

        // Show checkmark if user has marked step as done (and it's not optional, not invalid, and not read-only)
        const showCompletion = !step.isOptional && isMarkedDone && !isInvalid && !isReadOnly

        const isDisabled = !clickable

        const handleClick = () => {
          if (!isDisabled && onStepClick) {
            onStepClick(index)
          }
        }

        const handleKeyDown = (e: React.KeyboardEvent) => {
          if (!isDisabled && onStepClick && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault()
            onStepClick(index)
          }
        }

        // Build aria-label with all states
        const ariaLabelParts = [step.label]
        if (isCurrent) ariaLabelParts.push(t('common.stepIndicatorCurrent'))
        if (isReadOnly) ariaLabelParts.push(t('common.stepIndicatorFinalized'))
        if (showCompletion) ariaLabelParts.push(t('common.stepIndicatorDone'))
        if (isInvalid) ariaLabelParts.push(t('common.stepIndicatorInvalid'))

        return (
          <div key={step.id} className="flex items-center">
            {/* Connector line before step (except first) */}
            {index > 0 && (
              <div
                className={`w-8 h-0.5 mx-1 transition-colors ${
                  index <= currentStepIndex
                    ? 'bg-primary-500'
                    : 'bg-border-strong dark:bg-border-strong-dark'
                }`}
              />
            )}

            {/* Step indicator - use aria-disabled to keep in tab order for accessibility */}
            <button
              type="button"
              onClick={handleClick}
              onKeyDown={handleKeyDown}
              aria-disabled={isDisabled}
              aria-current={isCurrent ? 'step' : undefined}
              aria-label={ariaLabelParts.join(' ')}
              className={`
                relative flex items-center justify-center w-8 h-8 rounded-full
                transition-all duration-200
                ${clickable ? 'cursor-pointer hover:scale-110' : 'cursor-default'}
                ${getStepIndicatorStyle(isCurrent, showCompletion, isInvalid, isReadOnly)}
                focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-surface-card-dark
                aria-disabled:cursor-default aria-disabled:opacity-100
              `}
            >
              {isReadOnly ? (
                <Lock className="w-3.5 h-3.5" strokeWidth={2.5} aria-hidden="true" />
              ) : isInvalid && !isCurrent ? (
                <AlertTriangle className="w-4 h-4" strokeWidth={2.5} aria-hidden="true" />
              ) : showCompletion && !isCurrent ? (
                <Check className="w-4 h-4" strokeWidth={3} aria-hidden="true" />
              ) : (
                <span className="text-xs font-semibold">{index + 1}</span>
              )}
            </button>
          </div>
        )
      })}
    </div>
  )
}
