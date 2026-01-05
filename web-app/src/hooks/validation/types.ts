/**
 * Types for game validation state management.
 */

import type { ValidatedPersonSearchResult } from "@/api/validation";
import type { RosterModifications, CoachModifications } from "@/hooks/useNominationList";
import type { RosterPanelModifications } from "@/components/features/validation/RosterVerificationPanel";
import type { NominationList } from "@/api/client";

/**
 * State for a roster panel (home or away team).
 */
export interface RosterPanelState {
  /** Whether the roster has been reviewed (user viewed and acknowledged) */
  reviewed: boolean;
  /** Player changes made by the user */
  playerModifications: RosterModifications;
  /** Coach changes made by the user */
  coachModifications: CoachModifications;
}

/**
 * State for the scorer panel.
 */
export interface ScorerPanelState {
  /** The selected scorer, or null if none */
  selected: ValidatedPersonSearchResult | null;
}

/**
 * State for the scoresheet panel.
 */
export interface ScoresheetPanelState {
  /** The selected file, or null if none */
  file: File | null;
  /** Whether the file has been "uploaded" */
  uploaded: boolean;
}

/**
 * Complete validation state for all panels.
 */
export interface ValidationState {
  homeRoster: RosterPanelState;
  awayRoster: RosterPanelState;
  scorer: ScorerPanelState;
  scoresheet: ScoresheetPanelState;
}

/**
 * Completion status for each panel.
 */
export interface PanelCompletionStatus {
  homeRoster: boolean;
  awayRoster: boolean;
  scorer: boolean;
  scoresheet: boolean; // Always true (optional)
}

/**
 * Validated game data from a previously finalized validation.
 */
export interface ValidatedGameInfo {
  validatedAt: string;
  scorerName: string;
  scorerBirthday?: string;
  hasScoresheet: boolean;
}

/**
 * Pending scorer data from demo store.
 */
export interface PendingScorerData {
  __identity: string;
  displayName: string;
  birthday?: string;
}

/**
 * Result from the useValidationState hook.
 */
export interface UseValidationStateResult {
  /** Current validation state for all panels */
  state: ValidationState;
  /** Whether any changes have been made */
  isDirty: boolean;
  /** Completion status for each panel */
  completionStatus: PanelCompletionStatus;
  /** Whether all required panels are complete */
  isAllRequiredComplete: boolean;
  /** Whether the game has already been validated (read-only mode) */
  isValidated: boolean;
  /** Information about the validated game (if validated) */
  validatedInfo: ValidatedGameInfo | null;
  /** Pending scorer from previous save (if any) */
  pendingScorer: PendingScorerData | null;
  /** Whether scoresheet upload is not required for this game's group */
  scoresheetNotRequired: boolean;
  /** Update home roster modifications (auto-marks roster as reviewed) */
  setHomeRosterModifications: (modifications: RosterPanelModifications) => void;
  /** Update away roster modifications (auto-marks roster as reviewed) */
  setAwayRosterModifications: (modifications: RosterPanelModifications) => void;
  /** Set the selected scorer */
  setScorer: (scorer: ValidatedPersonSearchResult | null) => void;
  /** Set the scoresheet file and upload status */
  setScoresheet: (file: File | null, uploaded: boolean) => void;
  /** Reset all state to initial values */
  reset: () => void;
  /** Save current state to API (returns promise for async handling) */
  saveProgress: () => Promise<void>;
  /** Finalize the validation (close nomination lists and scoresheet) */
  finalizeValidation: () => Promise<void>;
  /** Whether a save operation is in progress */
  isSaving: boolean;
  /** Whether a finalize operation is in progress */
  isFinalizing: boolean;
  /** Whether game details are being loaded */
  isLoadingGameDetails: boolean;
  /** Error from game details loading */
  gameDetailsError: Error | null;
  /** Pre-fetched home team nomination list from game details */
  homeNominationList: NominationList | null;
  /** Pre-fetched away team nomination list from game details */
  awayNominationList: NominationList | null;
}

/**
 * Creates a fresh initial validation state.
 */
export function createInitialState(): ValidationState {
  return {
    homeRoster: {
      reviewed: false,
      playerModifications: { added: [], removed: [] },
      coachModifications: { added: new Map(), removed: new Set() },
    },
    awayRoster: {
      reviewed: false,
      playerModifications: { added: [], removed: [] },
      coachModifications: { added: new Map(), removed: new Set() },
    },
    scorer: { selected: null },
    scoresheet: { file: null, uploaded: false },
  };
}
