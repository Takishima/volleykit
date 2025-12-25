import { useTranslation } from "@/hooks/useTranslation";
import { ModalButton } from "@/components/ui/ModalButton";

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
          <ModalButton variant="secondary" onClick={onBack}>
            {t("validation.wizard.previous")}
          </ModalButton>
        )}
      </div>
      <div>
        {navigation.isLastStep ? (
          <ModalButton variant="primary" onClick={onClose}>
            {t("common.close")}
          </ModalButton>
        ) : (
          <ModalButton variant="primary" onClick={onNext}>
            {t("validation.wizard.next")}
          </ModalButton>
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
          <ModalButton
            variant="secondary"
            onClick={onAttemptClose}
            disabled={state.isFinalizing}
          >
            {t("common.cancel")}
          </ModalButton>
        ) : (
          <ModalButton
            variant="secondary"
            onClick={onBack}
            disabled={state.isFinalizing}
          >
            {t("validation.wizard.previous")}
          </ModalButton>
        )}
      </div>

      <div>
        {navigation.isLastStep ? (
          <ModalButton
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
          </ModalButton>
        ) : (
          <ModalButton
            variant="success"
            onClick={onValidateAndNext}
            disabled={isDisabled || !state.canMarkCurrentStepDone}
          >
            {t("validation.wizard.validate")}
          </ModalButton>
        )}
      </div>
    </>
  );
}
