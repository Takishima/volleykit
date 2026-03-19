import type { RosterValidationStatus } from '@/features/validation/utils/roster-validation'

export type ValidationStepId = 'home-roster' | 'away-roster' | 'scorer' | 'scoresheet'

export interface ValidationStep {
  id: ValidationStepId
  label: string
  isOptional?: boolean
  /** Whether the step has validation errors (e.g., insufficient players/coaches) */
  isInvalid?: boolean
  /** Whether the step is read-only (already finalized externally) */
  isReadOnly?: boolean
}

interface StepClosureStatus {
  isHomeRosterClosed: boolean
  isAwayRosterClosed: boolean
  isScoresheetClosed: boolean
}

interface StepLabels {
  scoresheet: string
  homeRoster: string
  awayRoster: string
  scorer: string
}

/**
 * Build the ordered list of wizard steps with their current validity/read-only state.
 *
 * This is a pure function so it can be called inside `useMemo` and unit-tested
 * without rendering any React component.
 */
export function buildWizardSteps(
  labels: StepLabels,
  rosterValidation: RosterValidationStatus,
  closure: StepClosureStatus
): ValidationStep[] {
  return [
    {
      id: 'scoresheet',
      label: labels.scoresheet,
      isOptional: true,
      isReadOnly: closure.isScoresheetClosed,
    },
    {
      id: 'home-roster',
      label: labels.homeRoster,
      isInvalid: !closure.isHomeRosterClosed && !rosterValidation.home.isValid,
      isReadOnly: closure.isHomeRosterClosed,
    },
    {
      id: 'away-roster',
      label: labels.awayRoster,
      isInvalid: !closure.isAwayRosterClosed && !rosterValidation.away.isValid,
      isReadOnly: closure.isAwayRosterClosed,
    },
    {
      id: 'scorer',
      label: labels.scorer,
      isReadOnly: closure.isScoresheetClosed,
    },
  ]
}

/**
 * Determine whether the current step can be marked as done.
 *
 * Only the scorer step has a real completion gate; all other steps can always
 * be marked done.
 */
export function canMarkStepDone(
  stepId: ValidationStepId | undefined,
  scorerComplete: boolean
): boolean {
  if (stepId === 'scorer') return scorerComplete
  return true
}

/**
 * Check whether every required (non-optional) step before `currentIndex` has
 * been marked as done.
 */
export function allPreviousRequiredDone(
  steps: ValidationStep[],
  currentIndex: number,
  stepsMarkedDone: ReadonlySet<number>
): boolean {
  for (let i = 0; i < currentIndex; i++) {
    const step = steps[i]
    if (!step?.isOptional && !stepsMarkedDone.has(i)) {
      return false
    }
  }
  return true
}

/**
 * Find the index of the first invalid roster step.
 *
 * Step order: scoresheet(0), home-roster(1), away-roster(2), scorer(3).
 * Returns the index to navigate to, or `null` if both rosters are valid.
 */
export function firstInvalidRosterStepIndex(
  rosterValidation: RosterValidationStatus
): number | null {
  if (!rosterValidation.home.isValid) return 1
  if (!rosterValidation.away.isValid) return 2
  return null
}
