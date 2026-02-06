import { Button } from '@/shared/components/Button'
import { useTranslation } from '@/shared/hooks/useTranslation'

interface WizardNavigationState {
  isFirstStep: boolean
  isLastStep: boolean
}

interface ReadOnlyModeButtonsProps {
  navigation: WizardNavigationState
  onBack: () => void
  onNext: () => void
  onClose: () => void
  closeLabel: string
}

/**
 * Shared navigation buttons for read-only modes (validated/safe mode).
 * Shows Previous/Next buttons with a customizable close button on last step.
 */
function ReadOnlyModeButtons({
  navigation,
  onBack,
  onNext,
  onClose,
  closeLabel,
}: ReadOnlyModeButtonsProps) {
  const { t } = useTranslation()

  return (
    <>
      <div>
        {!navigation.isFirstStep && (
          <Button variant="secondary" onClick={onBack}>
            {t('validation.wizard.previous')}
          </Button>
        )}
      </div>
      <div>
        {navigation.isLastStep ? (
          <Button variant="primary" onClick={onClose}>
            {closeLabel}
          </Button>
        ) : (
          <Button variant="primary" onClick={onNext}>
            {t('validation.wizard.next')}
          </Button>
        )}
      </div>
    </>
  )
}

interface ValidatedModeButtonsProps {
  navigation: WizardNavigationState
  onBack: () => void
  onNext: () => void
  onClose: () => void
}

/**
 * Navigation buttons shown when viewing an already-validated game.
 * Read-only mode with Previous/Next/Close buttons.
 */
export function ValidatedModeButtons(props: ValidatedModeButtonsProps) {
  const { t } = useTranslation()
  return <ReadOnlyModeButtons {...props} closeLabel={t('common.close')} />
}

interface EditModeState {
  isFinalizing: boolean
  isLoadingGameDetails: boolean
  hasGameDetailsError: boolean
  canMarkCurrentStepDone: boolean
  allPreviousRequiredStepsDone: boolean
  currentStepIsOptional: boolean
}

interface EditModeButtonsProps {
  navigation: WizardNavigationState
  state: EditModeState
  onAttemptClose: () => void
  onBack: () => void
  onValidateAndNext: () => void
  onFinish: () => Promise<void>
}

/**
 * Navigation buttons shown when editing/validating a game.
 * Cancel/Previous on left, Validate/Finish on right.
 */
export function EditModeButtons({
  navigation,
  state,
  onAttemptClose,
  onBack,
  onValidateAndNext,
  onFinish,
}: EditModeButtonsProps) {
  const { t } = useTranslation()

  const isDisabled = state.isFinalizing || state.isLoadingGameDetails || state.hasGameDetailsError
  const finishDisabled =
    isDisabled ||
    !state.allPreviousRequiredStepsDone ||
    (!state.currentStepIsOptional && !state.canMarkCurrentStepDone)

  return (
    <>
      <div>
        {navigation.isFirstStep ? (
          <Button variant="secondary" onClick={onAttemptClose} disabled={state.isFinalizing}>
            {t('common.cancel')}
          </Button>
        ) : (
          <Button variant="secondary" onClick={onBack} disabled={state.isFinalizing}>
            {t('validation.wizard.previous')}
          </Button>
        )}
      </div>

      <div>
        {navigation.isLastStep ? (
          <Button
            variant="success"
            onClick={() => onFinish()}
            disabled={finishDisabled}
            title={
              !state.allPreviousRequiredStepsDone
                ? t('validation.state.markAllStepsTooltip')
                : undefined
            }
          >
            {state.isFinalizing ? t('common.loading') : t('validation.wizard.finish')}
          </Button>
        ) : (
          <Button
            variant="success"
            onClick={onValidateAndNext}
            disabled={isDisabled || !state.canMarkCurrentStepDone}
          >
            {t('validation.wizard.validate')}
          </Button>
        )}
      </div>
    </>
  )
}
