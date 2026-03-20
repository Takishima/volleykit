import { CheckCircle } from '@/shared/components/icons'

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
            <li key={step.label} className="flex items-center gap-1 flex-1">
              {index > 0 && (
                <div
                  className={`h-px flex-1 ${
                    isCompleted ? 'bg-blue-500' : 'bg-border-default dark:bg-border-default-dark'
                  }`}
                />
              )}
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                {isCompleted ? (
                  <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" aria-hidden="true" />
                ) : (
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-medium flex-shrink-0 ${
                      isCurrent
                        ? 'bg-blue-500 text-white'
                        : 'bg-surface-subtle dark:bg-surface-subtle-dark text-text-muted dark:text-text-muted-dark'
                    }`}
                  >
                    {index + 1}
                  </span>
                )}
                <span
                  className={`text-xs ${
                    isCurrent
                      ? 'font-medium text-text-primary dark:text-text-primary-dark'
                      : isCompleted
                        ? 'text-blue-500'
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
