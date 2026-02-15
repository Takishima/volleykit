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
  closeVariant?: 'primary' | 'success'
  closeDisabled?: boolean
}

/**
 * Shared navigation buttons for read-only modes (validated/safe mode/finalized step).
 * Shows Previous/Next buttons with a customizable close/finish button on last step.
 */
function ReadOnlyModeButtons({
  navigation,
  onBack,
  onNext,
  onClose,
  closeLabel,
  closeVariant = 'primary',
  closeDisabled = false,
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
          <Button variant={closeVariant} onClick={onClose} disabled={closeDisabled}>
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

interface ReadOnlyStepButtonsProps {
  navigation: WizardNavigationState
  onBack: () => void
  onNext: () => void
  onFinish: () => Promise<void>
  finishDisabled: boolean
  isFinalizing: boolean
}

/**
 * Navigation buttons shown when the current step is read-only (finalized)
 * but the overall game is not yet fully validated.
 * Shows Previous/Next, plus Finish on the last step.
 */
export function ReadOnlyStepButtons({
  navigation,
  onBack,
  onNext,
  onFinish,
  finishDisabled,
  isFinalizing,
}: ReadOnlyStepButtonsProps) {
  const { t } = useTranslation()
  return (
    <ReadOnlyModeButtons
      navigation={navigation}
      onBack={onBack}
      onNext={onNext}
      onClose={() => onFinish()}
      closeLabel={isFinalizing ? t('common.loading') : t('validation.wizard.finish')}
      closeVariant="success"
      closeDisabled={finishDisabled}
    />
  )
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
