import type { Assignment, NominationList } from '@/api/client'
import type { ValidationStepId } from '@/features/validation/hooks/useValidateGameWizard'
import type { UseValidationStateResult } from '@/features/validation/hooks/useValidationState'
import { Lock } from '@/shared/components/icons'
import { ModalErrorBoundary } from '@/shared/components/ModalErrorBoundary'
import { useTranslation } from '@/shared/hooks/useTranslation'

import { HomeRosterPanel, AwayRosterPanel, ScorerPanel, ScoresheetPanel } from '.'

interface LoadingState {
  isLoading: boolean
  error: Error | null
}

interface ValidationInfo {
  isValidated: boolean
  /** Whether the current step is read-only due to its form being already finalized */
  isCurrentStepReadOnly: boolean
  validatedInfo: UseValidationStateResult['validatedInfo']
  pendingScorer: UseValidationStateResult['pendingScorer']
  scoresheetNotRequired: boolean
  state: UseValidationStateResult['state']
  homeNominationList: NominationList | null
  awayNominationList: NominationList | null
}

interface StepHandlers {
  setHomeRosterModifications: UseValidationStateResult['setHomeRosterModifications']
  setAwayRosterModifications: UseValidationStateResult['setAwayRosterModifications']
  setScorer: UseValidationStateResult['setScorer']
  setScoresheet: UseValidationStateResult['setScoresheet']
  onAddPlayerSheetOpenChange: (open: boolean) => void
  onClose: () => void
}

interface StepRendererProps {
  currentStepId: ValidationStepId
  assignment: Assignment
  loading: LoadingState
  validation: ValidationInfo
  handlers: StepHandlers
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
  const { t } = useTranslation()

  if (loading.isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-text-muted dark:text-text-muted-dark">
          {t('common.loading')}
        </div>
      </div>
    )
  }

  if (loading.error) {
    return (
      <div
        role="alert"
        className="p-3 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg"
      >
        <p className="text-sm text-danger-700 dark:text-danger-400">{loading.error.message}</p>
      </div>
    )
  }

  const isStepReadOnly = validation.isValidated || validation.isCurrentStepReadOnly
  const isRosterStep = currentStepId === 'home-roster' || currentStepId === 'away-roster'

  // Show finalized banner when the step is read-only due to partial finalization
  // (not when the entire game is validated — that has its own banner in the modal)
  const showFinalizedBanner = !validation.isValidated && validation.isCurrentStepReadOnly

  return (
    <ModalErrorBoundary modalName="ValidateGameModal" onClose={handlers.onClose}>
      {showFinalizedBanner && (
        <div
          role="status"
          className="mb-3 p-2.5 flex items-center gap-2 bg-surface-muted dark:bg-surface-subtle-dark border border-border-strong dark:border-border-strong-dark rounded-lg"
        >
          <Lock
            className="w-4 h-4 flex-shrink-0 text-text-muted dark:text-text-muted-dark"
            aria-hidden="true"
          />
          <p className="text-sm text-text-secondary dark:text-text-secondary-dark">
            {isRosterStep
              ? t('validation.wizard.rosterFinalized')
              : t('validation.wizard.scoresheetFinalized')}
          </p>
        </div>
      )}

      {currentStepId === 'home-roster' && (
        <HomeRosterPanel
          assignment={assignment}
          onModificationsChange={handlers.setHomeRosterModifications}
          onAddPlayerSheetOpenChange={handlers.onAddPlayerSheetOpenChange}
          readOnly={isStepReadOnly}
          initialModifications={validation.state.homeRoster.playerModifications}
          initialCoachModifications={validation.state.homeRoster.coachModifications}
          prefetchedNominationList={validation.homeNominationList}
        />
      )}

      {currentStepId === 'away-roster' && (
        <AwayRosterPanel
          assignment={assignment}
          onModificationsChange={handlers.setAwayRosterModifications}
          onAddPlayerSheetOpenChange={handlers.onAddPlayerSheetOpenChange}
          readOnly={isStepReadOnly}
          initialModifications={validation.state.awayRoster.playerModifications}
          initialCoachModifications={validation.state.awayRoster.coachModifications}
          prefetchedNominationList={validation.awayNominationList}
        />
      )}

      {currentStepId === 'scorer' && (
        <ScorerPanel
          key={validation.pendingScorer?.__identity ?? 'no-pending-scorer'}
          onScorerChange={handlers.setScorer}
          readOnly={isStepReadOnly}
          readOnlyScorerName={validation.validatedInfo?.scorerName}
          readOnlyScorerBirthday={validation.validatedInfo?.scorerBirthday}
          initialScorer={
            validation.pendingScorer
              ? {
                  __identity: validation.pendingScorer.__identity,
                  displayName: validation.pendingScorer.displayName,
                  birthday: validation.pendingScorer.birthday ?? '',
                }
              : null
          }
        />
      )}

      {currentStepId === 'scoresheet' && (
        <ScoresheetPanel
          onScoresheetChange={handlers.setScoresheet}
          readOnly={isStepReadOnly}
          hasScoresheet={validation.validatedInfo?.hasScoresheet}
          scoresheetNotRequired={validation.scoresheetNotRequired}
        />
      )}
    </ModalErrorBoundary>
  )
}
