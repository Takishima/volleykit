import { useState, useCallback, useMemo } from "react";
import type { ValidatedPersonSearchResult } from "@/api/validation";
import type { RosterModifications } from "@/hooks/useNominationList";

/**
 * State for a roster panel (home or away team).
 */
export interface RosterPanelState {
  /** Whether the roster has been reviewed (user viewed and acknowledged) */
  reviewed: boolean;
  /** Roster changes made by the user */
  modifications: RosterModifications;
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
  /** Whether the file has been "uploaded" (simulated in demo mode) */
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
  /** Update home roster modifications (auto-marks roster as reviewed) */
  setHomeRosterModifications: (modifications: RosterModifications) => void;
  /** Update away roster modifications (auto-marks roster as reviewed) */
  setAwayRosterModifications: (modifications: RosterModifications) => void;
  /** Set the selected scorer */
  setScorer: (scorer: ValidatedPersonSearchResult | null) => void;
  /** Set the scoresheet file and upload status */
  setScoresheet: (file: File | null, uploaded: boolean) => void;
  /** Reset all state to initial values */
  reset: () => void;
}

/**
 * Creates a fresh initial validation state.
 * Using a factory function ensures each call gets fresh array instances,
 * preventing shared state bugs between multiple hook instances.
 */
function createInitialState(): ValidationState {
  return {
    homeRoster: {
      reviewed: false,
      modifications: { added: [], removed: [] },
    },
    awayRoster: {
      reviewed: false,
      modifications: { added: [], removed: [] },
    },
    scorer: { selected: null },
    scoresheet: { file: null, uploaded: false },
  };
}

/**
 * Check if roster has modifications (added or removed players).
 */
function hasRosterModifications(modifications: RosterModifications): boolean {
  return modifications.added.length > 0 || modifications.removed.length > 0;
}

/**
 * Hook to manage validation state across all panels in the ValidateGameModal.
 *
 * Tracks:
 * - Completion status for each panel
 * - Dirty state (whether any changes have been made)
 * - All panel data (rosters, scorer, scoresheet)
 *
 * Completion rules:
 * - Home/Away Roster: Complete when reviewed (even if unchanged)
 * - Scorer: Complete when a scorer is selected
 * - Scoresheet: Always complete (optional field)
 */
export function useValidationState(): UseValidationStateResult {
  const [state, setState] = useState<ValidationState>(createInitialState);

  // Calculate completion status
  const completionStatus = useMemo<PanelCompletionStatus>(
    () => ({
      homeRoster: state.homeRoster.reviewed,
      awayRoster: state.awayRoster.reviewed,
      scorer: state.scorer.selected !== null,
      scoresheet: true, // Always complete (optional)
    }),
    [
      state.homeRoster.reviewed,
      state.awayRoster.reviewed,
      state.scorer.selected,
    ],
  );

  // Check if all required panels are complete
  const isAllRequiredComplete = useMemo(() => {
    return (
      completionStatus.homeRoster &&
      completionStatus.awayRoster &&
      completionStatus.scorer
      // scoresheet is optional, not required
    );
  }, [completionStatus]);

  // Calculate dirty state
  const isDirty = useMemo(() => {
    const hasHomeChanges = hasRosterModifications(
      state.homeRoster.modifications,
    );
    const hasAwayChanges = hasRosterModifications(
      state.awayRoster.modifications,
    );
    const hasScorerChange = state.scorer.selected !== null;
    const hasScoresheetChange = state.scoresheet.file !== null;

    return (
      hasHomeChanges || hasAwayChanges || hasScorerChange || hasScoresheetChange
    );
  }, [state]);

  // Update home roster modifications
  const setHomeRosterModifications = useCallback(
    (modifications: RosterModifications) => {
      setState((prev) => ({
        ...prev,
        homeRoster: {
          ...prev.homeRoster,
          modifications,
          // Auto-mark as reviewed when modifications are made
          reviewed: true,
        },
      }));
    },
    [],
  );

  // Update away roster modifications
  const setAwayRosterModifications = useCallback(
    (modifications: RosterModifications) => {
      setState((prev) => ({
        ...prev,
        awayRoster: {
          ...prev.awayRoster,
          modifications,
          // Auto-mark as reviewed when modifications are made
          reviewed: true,
        },
      }));
    },
    [],
  );

  // Set scorer
  const setScorer = useCallback(
    (scorer: ValidatedPersonSearchResult | null) => {
      setState((prev) => ({
        ...prev,
        scorer: {
          selected: scorer,
        },
      }));
    },
    [],
  );

  // Set scoresheet
  const setScoresheet = useCallback((file: File | null, uploaded: boolean) => {
    setState((prev) => ({
      ...prev,
      scoresheet: {
        file,
        uploaded,
      },
    }));
  }, []);

  // Reset all state
  const reset = useCallback(() => {
    setState(createInitialState());
  }, []);

  return {
    state,
    isDirty,
    completionStatus,
    isAllRequiredComplete,
    setHomeRosterModifications,
    setAwayRosterModifications,
    setScorer,
    setScoresheet,
    reset,
  };
}
