/**
 * Assignment helper utilities.
 *
 * Re-exports from @volleykit/shared for cross-platform consistency.
 */
export {
  // Constants
  MODAL_CLEANUP_DELAY,
  DEFAULT_VALIDATION_DEADLINE_HOURS,
  // Functions
  isFromCalendarMode,
  extractTeamNames,
  getTeamNames,
  getTeamNamesFromCompensation,
  isGameReportEligible,
  isValidationEligible,
  isValidationClosed,
  isGamePast,
  isGameAlreadyValidated,
  isActionAvailable,
  formatTeamMatchup,
  // Types
  type AssignmentAction,
  type AssignmentStatus,
} from '@volleykit/shared/utils'
