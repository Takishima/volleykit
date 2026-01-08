import { useTranslation } from "@/shared/hooks/useTranslation";
import { Button } from "@/shared/components/Button";

interface WizardNavigationState {
  isFirstStep: boolean;
  isLastStep: boolean;
}

interface ValidatedModeButtonsProps {
  navigation: WizardNavigationState;
  onBack: () => void;
  onNext: () => void;
  onClose: () => void;
}

/**
 * Navigation buttons shown when viewing an already-validated game.
 * Read-only mode with Previous/Next/Close buttons.
 */
export function ValidatedModeButtons({
  navigation,
  onBack,
  onNext,
  onClose,
}: ValidatedModeButtonsProps) {
  const { t } = useTranslation();

  return (
    <>
      <div>
        {!navigation.isFirstStep && (
          <Button variant="secondary" onClick={onBack}>
            {t("validation.wizard.previous")}
          </Button>
        )}
      </div>
      <div>
        {navigation.isLastStep ? (
          <Button variant="primary" onClick={onClose}>
            {t("common.close")}
          </Button>
        ) : (
          <Button variant="primary" onClick={onNext}>
            {t("validation.wizard.next")}
          </Button>
        )}
      </div>
    </>
  );
}

interface SafeModeButtonsProps {
  navigation: WizardNavigationState;
  onBack: () => void;
  onNext: () => void;
  onClose: () => void;
}

/**
 * Navigation buttons shown when safe mode is enabled.
 * Read-only mode with Previous/Next/Dismiss buttons.
 * Dismiss closes without making any API calls.
 */
export function SafeModeButtons({
  navigation,
  onBack,
  onNext,
  onClose,
}: SafeModeButtonsProps) {
  const { t } = useTranslation();

  return (
    <>
      <div>
        {!navigation.isFirstStep && (
          <Button variant="secondary" onClick={onBack}>
            {t("validation.wizard.previous")}
          </Button>
        )}
      </div>
      <div>
        {navigation.isLastStep ? (
          <Button variant="primary" onClick={onClose}>
            {t("validation.wizard.dismiss")}
          </Button>
        ) : (
          <Button variant="primary" onClick={onNext}>
            {t("validation.wizard.next")}
          </Button>
        )}
      </div>
    </>
  );
}

interface EditModeState {
  isFinalizing: boolean;
  isLoadingGameDetails: boolean;
  hasGameDetailsError: boolean;
  canMarkCurrentStepDone: boolean;
  allPreviousRequiredStepsDone: boolean;
  currentStepIsOptional: boolean;
}

interface EditModeButtonsProps {
  navigation: WizardNavigationState;
  state: EditModeState;
  onAttemptClose: () => void;
  onBack: () => void;
  onValidateAndNext: () => void;
  onFinish: () => Promise<void>;
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
  const { t } = useTranslation();

  const isDisabled = state.isFinalizing || state.isLoadingGameDetails || state.hasGameDetailsError;
  const finishDisabled =
    isDisabled ||
    !state.allPreviousRequiredStepsDone ||
    (!state.currentStepIsOptional && !state.canMarkCurrentStepDone);

  return (
    <>
      <div>
        {navigation.isFirstStep ? (
          <Button
            variant="secondary"
            onClick={onAttemptClose}
            disabled={state.isFinalizing}
          >
            {t("common.cancel")}
          </Button>
        ) : (
          <Button
            variant="secondary"
            onClick={onBack}
            disabled={state.isFinalizing}
          >
            {t("validation.wizard.previous")}
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
                ? t("validation.state.markAllStepsTooltip")
                : undefined
            }
          >
            {state.isFinalizing
              ? t("common.loading")
              : t("validation.wizard.finish")}
          </Button>
        ) : (
          <Button
            variant="success"
            onClick={onValidateAndNext}
            disabled={isDisabled || !state.canMarkCurrentStepDone}
          >
            {t("validation.wizard.validate")}
          </Button>
        )}
      </div>
    </>
  );
}
