import type { Assignment, NominationList } from "@/api/client";
import type { ValidationStepId } from "@/hooks/useValidateGameWizard";
import type { UseValidationStateResult } from "@/hooks/useValidationState";
import { useTranslation } from "@/hooks/useTranslation";
import { ModalErrorBoundary } from "@/components/ui/ModalErrorBoundary";
import {
  HomeRosterPanel,
  AwayRosterPanel,
  ScorerPanel,
  ScoresheetPanel,
} from "@/components/features/validation";

interface LoadingState {
  isLoading: boolean;
  error: Error | null;
}

interface ValidationInfo {
  isValidated: boolean;
  validatedInfo: UseValidationStateResult["validatedInfo"];
  pendingScorer: UseValidationStateResult["pendingScorer"];
  scoresheetNotRequired: boolean;
  state: UseValidationStateResult["state"];
  homeNominationList: NominationList | null;
  awayNominationList: NominationList | null;
}

interface StepHandlers {
  setHomeRosterModifications: UseValidationStateResult["setHomeRosterModifications"];
  setAwayRosterModifications: UseValidationStateResult["setAwayRosterModifications"];
  setScorer: UseValidationStateResult["setScorer"];
  setScoresheet: UseValidationStateResult["setScoresheet"];
  onAddPlayerSheetOpenChange: (open: boolean) => void;
  onClose: () => void;
}

interface StepRendererProps {
  currentStepId: ValidationStepId;
  assignment: Assignment;
  loading: LoadingState;
  validation: ValidationInfo;
  handlers: StepHandlers;
}

/**
 * Renders the appropriate step content based on the current step ID.
 *
 * Handles:
 * - Loading state while fetching game details
 * - Error state if game details fetch fails
 * - Step-specific panels (HomeRoster, AwayRoster, Scorer, Scoresheet)
 */
export function StepRenderer({
  currentStepId,
  assignment,
  loading,
  validation,
  handlers,
}: StepRendererProps) {
  const { t } = useTranslation();

  if (loading.isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-text-muted dark:text-text-muted-dark">
          {t("common.loading")}
        </div>
      </div>
    );
  }

  if (loading.error) {
    return (
      <div
        role="alert"
        className="p-3 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg"
      >
        <p className="text-sm text-danger-700 dark:text-danger-400">
          {loading.error.message}
        </p>
      </div>
    );
  }

  return (
    <ModalErrorBoundary modalName="ValidateGameModal" onClose={handlers.onClose}>
      {currentStepId === "home-roster" && (
        <HomeRosterPanel
          assignment={assignment}
          onModificationsChange={handlers.setHomeRosterModifications}
          onAddPlayerSheetOpenChange={handlers.onAddPlayerSheetOpenChange}
          readOnly={validation.isValidated}
          initialModifications={validation.state.homeRoster.modifications}
          prefetchedNominationList={validation.homeNominationList}
        />
      )}

      {currentStepId === "away-roster" && (
        <AwayRosterPanel
          assignment={assignment}
          onModificationsChange={handlers.setAwayRosterModifications}
          onAddPlayerSheetOpenChange={handlers.onAddPlayerSheetOpenChange}
          readOnly={validation.isValidated}
          initialModifications={validation.state.awayRoster.modifications}
          prefetchedNominationList={validation.awayNominationList}
        />
      )}

      {currentStepId === "scorer" && (
        <ScorerPanel
          key={validation.pendingScorer?.__identity ?? "no-pending-scorer"}
          onScorerChange={handlers.setScorer}
          readOnly={validation.isValidated}
          readOnlyScorerName={validation.validatedInfo?.scorerName}
          initialScorer={
            validation.pendingScorer
              ? {
                  __identity: validation.pendingScorer.__identity,
                  displayName: validation.pendingScorer.displayName,
                  birthday: "",
                }
              : null
          }
        />
      )}

      {currentStepId === "scoresheet" && (
        <ScoresheetPanel
          onScoresheetChange={handlers.setScoresheet}
          readOnly={validation.isValidated}
          hasScoresheet={validation.validatedInfo?.hasScoresheet}
          scoresheetNotRequired={validation.scoresheetNotRequired}
        />
      )}
    </ModalErrorBoundary>
  );
}
