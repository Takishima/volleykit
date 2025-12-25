import type { Assignment } from "@/api/client";
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

interface StepRendererProps {
  currentStepId: ValidationStepId;
  assignment: Assignment;
  isLoadingGameDetails: boolean;
  gameDetailsError: Error | null;
  isValidated: boolean;
  validatedInfo: UseValidationStateResult["validatedInfo"];
  validationState: UseValidationStateResult["state"];
  pendingScorer: UseValidationStateResult["pendingScorer"];
  scoresheetNotRequired: boolean;
  setHomeRosterModifications: UseValidationStateResult["setHomeRosterModifications"];
  setAwayRosterModifications: UseValidationStateResult["setAwayRosterModifications"];
  setScorer: UseValidationStateResult["setScorer"];
  setScoresheet: UseValidationStateResult["setScoresheet"];
  onAddPlayerSheetOpenChange: (open: boolean) => void;
  onClose: () => void;
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
  isLoadingGameDetails,
  gameDetailsError,
  isValidated,
  validatedInfo,
  validationState,
  pendingScorer,
  scoresheetNotRequired,
  setHomeRosterModifications,
  setAwayRosterModifications,
  setScorer,
  setScoresheet,
  onAddPlayerSheetOpenChange,
  onClose,
}: StepRendererProps) {
  const { t } = useTranslation();

  if (isLoadingGameDetails) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-text-muted dark:text-text-muted-dark">
          {t("common.loading")}
        </div>
      </div>
    );
  }

  if (gameDetailsError) {
    return (
      <div
        role="alert"
        className="p-3 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg"
      >
        <p className="text-sm text-danger-700 dark:text-danger-400">
          {gameDetailsError.message}
        </p>
      </div>
    );
  }

  return (
    <ModalErrorBoundary modalName="ValidateGameModal" onClose={onClose}>
      {currentStepId === "home-roster" && (
        <HomeRosterPanel
          assignment={assignment}
          onModificationsChange={setHomeRosterModifications}
          onAddPlayerSheetOpenChange={onAddPlayerSheetOpenChange}
          readOnly={isValidated}
          initialModifications={validationState.homeRoster.modifications}
        />
      )}

      {currentStepId === "away-roster" && (
        <AwayRosterPanel
          assignment={assignment}
          onModificationsChange={setAwayRosterModifications}
          onAddPlayerSheetOpenChange={onAddPlayerSheetOpenChange}
          readOnly={isValidated}
          initialModifications={validationState.awayRoster.modifications}
        />
      )}

      {currentStepId === "scorer" && (
        <ScorerPanel
          key={pendingScorer?.__identity ?? "no-pending-scorer"}
          onScorerChange={setScorer}
          readOnly={isValidated}
          readOnlyScorerName={validatedInfo?.scorerName}
          initialScorer={
            pendingScorer
              ? {
                  __identity: pendingScorer.__identity,
                  displayName: pendingScorer.displayName,
                  birthday: "",
                }
              : null
          }
        />
      )}

      {currentStepId === "scoresheet" && (
        <ScoresheetPanel
          onScoresheetChange={setScoresheet}
          readOnly={isValidated}
          hasScoresheet={validatedInfo?.hasScoresheet}
          scoresheetNotRequired={scoresheetNotRequired}
        />
      )}
    </ModalErrorBoundary>
  );
}
