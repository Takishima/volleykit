import { useState, useCallback, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { logger } from "@/utils/logger";
import type { ValidatedPersonSearchResult } from "@/api/validation";
import type { RosterModifications } from "@/hooks/useNominationList";
import { getApiClient } from "@/api/client";
import { useAuthStore } from "@/stores/auth";

/** Stale time for game details query (5 minutes) */
const GAME_DETAILS_STALE_TIME_MS = 5 * 60 * 1000;

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
 *
 * @param gameId - Optional game ID for API operations. Required for save/finalize.
 */
export function useValidationState(gameId?: string): UseValidationStateResult {
  const [state, setState] = useState<ValidationState>(createInitialState);
  const [isSaving, setIsSaving] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const isSavingRef = useRef(false);
  const isFinalizingRef = useRef(false);

  const isDemoMode = useAuthStore((state) => state.isDemoMode);
  const apiClient = getApiClient(isDemoMode);

  // Fetch game details (scoresheet and nomination list IDs)
  const gameDetailsQuery = useQuery({
    queryKey: ["gameWithScoresheet", gameId],
    queryFn: async () => {
      if (!gameId) return null;
      return apiClient.getGameWithScoresheet(gameId);
    },
    enabled: !!gameId,
    staleTime: GAME_DETAILS_STALE_TIME_MS,
  });

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

  // Get player nomination IDs from a nomination list, applying modifications
  const getPlayerNominationIds = useCallback(
    (
      nominationList: { indoorPlayerNominations?: { __identity?: string }[] },
      modifications: RosterModifications,
    ): string[] => {
      // Start with existing player IDs
      const existingIds =
        nominationList.indoorPlayerNominations
          ?.map((n) => n.__identity)
          .filter((id): id is string => !!id) ?? [];

      // Remove players that were removed
      const removedSet = new Set(modifications.removed);
      const remainingIds = existingIds.filter((id) => !removedSet.has(id));

      // Add newly added players (they already have IDs from the player search)
      const addedIds = modifications.added.map((p) => p.id);

      return [...remainingIds, ...addedIds];
    },
    [],
  );

  // Save current progress to API
  const saveProgress = useCallback(async (): Promise<void> => {
    // Guard against concurrent saves
    if (isSavingRef.current) {
      logger.debug("[useValidationState] Save already in progress, skipping");
      return;
    }

    isSavingRef.current = true;
    setIsSaving(true);

    try {
      const gameDetails = gameDetailsQuery.data;

      // If no game details, we can't make API calls
      if (!gameId || !gameDetails) {
        logger.warn(
          "[useValidationState] No game ID or game details available for save",
        );
        return;
      }

      logger.debug("[useValidationState] Saving validation progress:", state);

      // Save home roster if modified
      const homeNomList = gameDetails.nominationListOfTeamHome;
      if (
        hasRosterModifications(state.homeRoster.modifications) &&
        homeNomList?.__identity &&
        homeNomList.team?.__identity
      ) {
        const playerIds = getPlayerNominationIds(
          homeNomList,
          state.homeRoster.modifications,
        );
        await apiClient.updateNominationList(
          homeNomList.__identity,
          gameId,
          homeNomList.team.__identity,
          playerIds,
        );
        logger.debug("[useValidationState] Home roster updated");
      }

      // Save away roster if modified
      const awayNomList = gameDetails.nominationListOfTeamAway;
      if (
        hasRosterModifications(state.awayRoster.modifications) &&
        awayNomList?.__identity &&
        awayNomList.team?.__identity
      ) {
        const playerIds = getPlayerNominationIds(
          awayNomList,
          state.awayRoster.modifications,
        );
        await apiClient.updateNominationList(
          awayNomList.__identity,
          gameId,
          awayNomList.team.__identity,
          playerIds,
        );
        logger.debug("[useValidationState] Away roster updated");
      }

      // Save scoresheet with scorer if scorer is selected
      const scoresheet = gameDetails.scoresheet;
      if (
        state.scorer.selected?.__identity &&
        scoresheet?.__identity
      ) {
        await apiClient.updateScoresheet(
          scoresheet.__identity,
          gameId,
          state.scorer.selected.__identity,
          scoresheet.isSimpleScoresheet ?? false,
        );
        logger.debug("[useValidationState] Scoresheet updated with scorer");
      }

      logger.debug("[useValidationState] Save complete");
    } catch (error) {
      logger.error("[useValidationState] Save failed:", error);
      throw error;
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }, [
    gameId,
    gameDetailsQuery.data,
    state,
    apiClient,
    getPlayerNominationIds,
  ]);

  // Finalize validation (save + close nomination lists and scoresheet)
  const finalizeValidation = useCallback(async (): Promise<void> => {
    // Guard against concurrent operations
    if (isFinalizingRef.current) {
      logger.debug(
        "[useValidationState] Finalize already in progress, skipping",
      );
      return;
    }

    isFinalizingRef.current = true;
    setIsFinalizing(true);

    try {
      const gameDetails = gameDetailsQuery.data;

      // If no game details, we can't make API calls
      if (!gameId || !gameDetails) {
        logger.warn(
          "[useValidationState] No game ID or game details available for finalize",
        );
        return;
      }

      logger.debug(
        "[useValidationState] Finalizing validation for game:",
        gameId,
      );

      // Upload scoresheet PDF if provided
      let fileResourceId: string | undefined;
      if (state.scoresheet.file) {
        const uploadResult = await apiClient.uploadResource(
          state.scoresheet.file,
        );
        fileResourceId = uploadResult[0]?.__identity;
        logger.debug(
          "[useValidationState] Scoresheet PDF uploaded:",
          fileResourceId,
        );
      }

      // Finalize home roster
      const homeNomList = gameDetails.nominationListOfTeamHome;
      if (homeNomList?.__identity && homeNomList.team?.__identity) {
        const playerIds = getPlayerNominationIds(
          homeNomList,
          state.homeRoster.modifications,
        );
        await apiClient.finalizeNominationList(
          homeNomList.__identity,
          gameId,
          homeNomList.team.__identity,
          playerIds,
          homeNomList.nominationListValidation?.__identity,
        );
        logger.debug("[useValidationState] Home roster finalized");
      }

      // Finalize away roster
      const awayNomList = gameDetails.nominationListOfTeamAway;
      if (awayNomList?.__identity && awayNomList.team?.__identity) {
        const playerIds = getPlayerNominationIds(
          awayNomList,
          state.awayRoster.modifications,
        );
        await apiClient.finalizeNominationList(
          awayNomList.__identity,
          gameId,
          awayNomList.team.__identity,
          playerIds,
          awayNomList.nominationListValidation?.__identity,
        );
        logger.debug("[useValidationState] Away roster finalized");
      }

      // Finalize scoresheet if scorer is selected and file is uploaded
      const scoresheet = gameDetails.scoresheet;
      if (
        state.scorer.selected?.__identity &&
        scoresheet?.__identity &&
        fileResourceId
      ) {
        await apiClient.finalizeScoresheet(
          scoresheet.__identity,
          gameId,
          state.scorer.selected.__identity,
          fileResourceId,
          scoresheet.scoresheetValidation?.__identity,
          scoresheet.isSimpleScoresheet ?? false,
        );
        logger.debug("[useValidationState] Scoresheet finalized");
      } else if (state.scorer.selected?.__identity && scoresheet?.__identity) {
        // Update scoresheet with scorer even if no file is uploaded
        await apiClient.updateScoresheet(
          scoresheet.__identity,
          gameId,
          state.scorer.selected.__identity,
          scoresheet.isSimpleScoresheet ?? false,
        );
        logger.debug(
          "[useValidationState] Scoresheet updated (no file for finalization)",
        );
      }

      logger.debug("[useValidationState] Finalization complete");
    } catch (error) {
      logger.error("[useValidationState] Finalization failed:", error);
      throw error;
    } finally {
      isFinalizingRef.current = false;
      setIsFinalizing(false);
    }
  }, [
    gameId,
    gameDetailsQuery.data,
    state,
    apiClient,
    getPlayerNominationIds,
  ]);

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
    saveProgress,
    finalizeValidation,
    isSaving,
    isFinalizing,
    isLoadingGameDetails: gameDetailsQuery.isLoading,
    gameDetailsError: gameDetailsQuery.error,
  };
}
