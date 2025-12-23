import { useState, useCallback, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { logger } from "@/utils/logger";
import type { ValidatedPersonSearchResult } from "@/api/validation";
import type { RosterModifications } from "@/hooks/useNominationList";
import { getApiClient } from "@/api/client";
import { useAuthStore } from "@/stores/auth";

const MINUTES_TO_MS = 60 * 1000;
const GAME_DETAILS_STALE_TIME_MS = 5 * MINUTES_TO_MS;

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
 * Validated game data from a previously finalized validation.
 */
export interface ValidatedGameInfo {
  validatedAt: string;
  scorerName: string;
  hasScoresheet: boolean;
}

/**
 * Pending scorer data from the game details (previously saved but not finalized).
 */
export interface PendingScorerInfo {
  __identity: string;
  displayName: string;
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
  pendingScorer: PendingScorerInfo | null;
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
 * Get player nomination IDs from a nomination list, applying modifications.
 */
function getPlayerNominationIds(
  nominationList: { indoorPlayerNominations?: { __identity?: string }[] },
  modifications: RosterModifications,
): string[] {
  const existingIds =
    nominationList.indoorPlayerNominations
      ?.map((n) => n.__identity)
      .filter((id): id is string => !!id) ?? [];

  const removedSet = new Set(modifications.removed);
  const remainingIds = existingIds.filter((id) => !removedSet.has(id));
  const addedIds = modifications.added.map((p) => p.id);

  return [...remainingIds, ...addedIds];
}

/** Type for nomination list with required fields for API calls. */
interface NominationListForApi {
  __identity?: string;
  team?: { __identity?: string };
  indoorPlayerNominations?: { __identity?: string }[];
  nominationListValidation?: { __identity?: string };
}

/** Type for scoresheet with required fields for API calls. */
interface ScoresheetForApi {
  __identity?: string;
  isSimpleScoresheet?: boolean;
  scoresheetValidation?: { __identity?: string };
}

/** Saves roster modifications for a single team. */
async function saveRosterModifications(
  apiClient: ReturnType<typeof getApiClient>,
  gameId: string,
  nomList: NominationListForApi | undefined,
  modifications: RosterModifications,
): Promise<void> {
  if (!hasRosterModifications(modifications)) {
    logger.debug("[VS] skip roster save: no modifications");
    return;
  }
  if (!nomList?.__identity || !nomList.team?.__identity) {
    logger.debug("[VS] skip roster save: missing nomination list or team ID");
    return;
  }

  const playerIds = getPlayerNominationIds(nomList, modifications);
  await apiClient.updateNominationList(
    nomList.__identity,
    gameId,
    nomList.team.__identity,
    playerIds,
  );
}

/** Saves scoresheet with scorer selection. */
async function saveScorerSelection(
  apiClient: ReturnType<typeof getApiClient>,
  gameId: string,
  scoresheet: ScoresheetForApi | undefined,
  scorerId: string | undefined,
): Promise<void> {
  if (!scorerId || !scoresheet?.__identity) {
    logger.debug("[VS] skip scorer save: no scorer or scoresheet ID");
    return;
  }

  await apiClient.updateScoresheet(
    scoresheet.__identity,
    gameId,
    scorerId,
    scoresheet.isSimpleScoresheet ?? false,
  );
}

/** Finalizes a single team's roster. */
async function finalizeRoster(
  apiClient: ReturnType<typeof getApiClient>,
  gameId: string,
  nomList: NominationListForApi | undefined,
  modifications: RosterModifications,
): Promise<void> {
  if (!nomList?.__identity || !nomList.team?.__identity) {
    logger.debug("[VS] skip roster finalize: missing nomination list or team ID");
    return;
  }

  const playerIds = getPlayerNominationIds(nomList, modifications);
  await apiClient.finalizeNominationList(
    nomList.__identity,
    gameId,
    nomList.team.__identity,
    playerIds,
    nomList.nominationListValidation?.__identity,
  );
}

/** Finalizes scoresheet with optional file upload. */
async function finalizeScoresheetWithFile(
  apiClient: ReturnType<typeof getApiClient>,
  gameId: string,
  scoresheet: ScoresheetForApi | undefined,
  scorerId: string | undefined,
  fileResourceId: string | undefined,
): Promise<void> {
  if (!scorerId || !scoresheet?.__identity) {
    logger.debug("[VS] skip scoresheet finalize: no scorer or scoresheet ID");
    return;
  }

  // Always call finalizeScoresheet to mark the game as validated.
  // The file is optional - when not provided, the API will finalize without a PDF.
  await apiClient.finalizeScoresheet(
    scoresheet.__identity,
    gameId,
    scorerId,
    fileResourceId,
    scoresheet.scoresheetValidation?.__identity,
    scoresheet.isSimpleScoresheet ?? false,
  );
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
  const queryClient = useQueryClient();

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

  // Check if the game has already been validated (read-only mode)
  const isValidated = useMemo(() => {
    const scoresheet = gameDetailsQuery.data?.scoresheet;
    return !!scoresheet?.closedAt;
  }, [gameDetailsQuery.data]);

  // Get validated game info if available
  const validatedInfo = useMemo<ValidatedGameInfo | null>(() => {
    const scoresheet = gameDetailsQuery.data?.scoresheet;
    if (!scoresheet?.closedAt) return null;

    return {
      validatedAt: scoresheet.closedAt,
      scorerName: scoresheet.writerPerson?.displayName ?? "Unknown",
      hasScoresheet: !!scoresheet.hasFile,
    };
  }, [gameDetailsQuery.data]);

  // Get pending scorer from game details (if game is not validated but has a saved scorer)
  const pendingScorer = useMemo<PendingScorerInfo | null>(() => {
    // Don't show pending scorer if game is already validated
    if (isValidated) return null;

    const writerPerson = gameDetailsQuery.data?.scoresheet?.writerPerson;
    if (!writerPerson?.__identity) return null;

    return {
      __identity: writerPerson.__identity,
      displayName: writerPerson.displayName ?? "Unknown",
    };
  }, [gameDetailsQuery.data, isValidated]);

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

  // Save current progress to API
  const saveProgress = useCallback(async (): Promise<void> => {
    if (isSavingRef.current) {
      logger.debug("[VS] save skip: in progress");
      return;
    }

    isSavingRef.current = true;
    setIsSaving(true);

    try {
      const gameDetails = gameDetailsQuery.data;
      if (!gameId || !gameDetails) {
        logger.warn("[VS] no game data for save");
        return;
      }

      logger.debug("[VS] saving:", state);

      await saveRosterModifications(
        apiClient,
        gameId,
        gameDetails.nominationListOfTeamHome,
        state.homeRoster.modifications,
      );
      await saveRosterModifications(
        apiClient,
        gameId,
        gameDetails.nominationListOfTeamAway,
        state.awayRoster.modifications,
      );
      await saveScorerSelection(
        apiClient,
        gameId,
        gameDetails.scoresheet,
        state.scorer.selected?.__identity,
      );

      logger.debug("[VS] save done");
    } catch (error) {
      logger.error("[VS] save failed:", error);
      throw error;
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }, [gameId, gameDetailsQuery.data, state, apiClient]);

  // Finalize validation (save + close nomination lists and scoresheet)
  const finalizeValidation = useCallback(async (): Promise<void> => {
    if (isFinalizingRef.current) {
      logger.debug("[VS] finalize skip: in progress");
      return;
    }

    isFinalizingRef.current = true;
    setIsFinalizing(true);

    try {
      const gameDetails = gameDetailsQuery.data;
      if (!gameId || !gameDetails) {
        logger.warn("[VS] no game data for finalize");
        return;
      }

      logger.debug("[VS] finalizing:", gameId);

      // Upload scoresheet PDF if provided
      let fileResourceId: string | undefined;
      if (state.scoresheet.file) {
        const uploadResult = await apiClient.uploadResource(
          state.scoresheet.file,
        );
        fileResourceId = uploadResult[0]?.__identity;
        logger.debug("[VS] PDF uploaded:", fileResourceId);
      }

      await finalizeRoster(
        apiClient,
        gameId,
        gameDetails.nominationListOfTeamHome,
        state.homeRoster.modifications,
      );
      await finalizeRoster(
        apiClient,
        gameId,
        gameDetails.nominationListOfTeamAway,
        state.awayRoster.modifications,
      );
      await finalizeScoresheetWithFile(
        apiClient,
        gameId,
        gameDetails.scoresheet,
        state.scorer.selected?.__identity,
        fileResourceId,
      );

      // Invalidate game details cache so reopening shows validated state
      await queryClient.invalidateQueries({
        queryKey: ["gameWithScoresheet", gameId],
      });

      logger.debug("[VS] finalize done");
    } catch (error) {
      logger.error("[VS] finalize failed:", error);
      throw error;
    } finally {
      isFinalizingRef.current = false;
      setIsFinalizing(false);
    }
  }, [gameId, gameDetailsQuery.data, state, apiClient, queryClient]);

  return {
    state,
    isDirty,
    completionStatus,
    isAllRequiredComplete,
    isValidated,
    validatedInfo,
    pendingScorer,
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
