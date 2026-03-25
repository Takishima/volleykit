import { CheckCircle } from '@/common/components/icons'

interface Step {
  label: string
}

interface WizardStepIndicatorProps {
  steps: Step[]
  currentStep: number
}

export function WizardStepIndicator({ steps, currentStep }: WizardStepIndicatorProps) {
  return (
    <nav aria-label="Progress" className="mb-4">
      <ol className="flex items-center gap-1">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep
          const isCurrent = index === currentStep

          return (
            <li
              key={step.label}
              className="flex items-center gap-1 flex-1"
              {...(isCurrent ? { 'aria-current': 'step' as const } : {})}
            >
              {index > 0 && (
                <div
                  className={`h-px flex-1 ${
                    isCompleted ? 'bg-primary-500' : 'bg-border-default dark:bg-border-default-dark'
                  }`}
                />
              )}
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                {isCompleted ? (
                  <CheckCircle
                    className="w-5 h-5 text-primary-800 dark:text-primary-400 flex-shrink-0"
                    aria-hidden="true"
                  />
                ) : (
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${
                      isCurrent
                        ? 'bg-primary-500 text-gray-900'
                        : 'bg-surface-subtle dark:bg-surface-subtle-dark text-text-muted dark:text-text-muted-dark'
                    }`}
                  >
                    {index + 1}
                  </span>
                )}
                <span
                  className={`text-xs hidden sm:inline ${
                    isCurrent
                      ? 'font-medium text-text-primary dark:text-text-primary-dark'
                      : isCompleted
                        ? 'text-primary-800 dark:text-primary-400'
                        : 'text-text-muted dark:text-text-muted-dark'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
