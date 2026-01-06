/**
 * Roster validation utilities for game validation wizard.
 *
 * A valid roster requires:
 * - At least 1 head coach
 * - At least 6 players
 *
 * Without these minimums, the game would be forfeited.
 */

import type { NominationList } from "@/api/client";
import type { RosterModifications, CoachModifications, CoachRole } from "@/hooks/useNominationList";

/** Minimum number of players required for a valid roster */
export const MIN_PLAYERS_REQUIRED = 6;

export interface RosterValidationResult {
  /** Whether the roster meets all minimum requirements */
  isValid: boolean;
  /** Effective number of players (base + added - removed) */
  playerCount: number;
  /** Whether the team has a head coach */
  hasHeadCoach: boolean;
  /** Whether player count is sufficient */
  hasMinPlayers: boolean;
}

/**
 * Validates a team roster against minimum requirements.
 *
 * @param nominationList - The base nomination list data (may be null if loading)
 * @param playerModifications - Player additions and removals
 * @param coachModifications - Coach additions and removals
 * @returns Validation result with details about what's missing
 */
export function validateRoster(
  nominationList: NominationList | null,
  playerModifications: RosterModifications,
  coachModifications: CoachModifications,
): RosterValidationResult {
  // If nomination list is not yet loaded, assume valid (don't show errors during loading)
  if (!nominationList) {
    return {
      isValid: true,
      playerCount: 0,
      hasHeadCoach: true,
      hasMinPlayers: true,
    };
  }

  // Calculate effective player count
  const basePlayerCount = nominationList.indoorPlayerNominations?.length ?? 0;
  const addedCount = playerModifications.added.length;
  const removedCount = playerModifications.removed.length;
  const playerCount = basePlayerCount + addedCount - removedCount;

  // Check for head coach
  // A team has a head coach if:
  // 1. Base nomination list has one AND it's not removed, OR
  // 2. A head coach addition is pending
  const hasBaseHeadCoach = !!nominationList.coachPerson;
  const headCoachRemoved = coachModifications.removed.has("head" as CoachRole);
  const headCoachAdded = coachModifications.added.has("head" as CoachRole);

  const hasHeadCoach = headCoachAdded || (hasBaseHeadCoach && !headCoachRemoved);
  const hasMinPlayers = playerCount >= MIN_PLAYERS_REQUIRED;

  return {
    isValid: hasHeadCoach && hasMinPlayers,
    playerCount,
    hasHeadCoach,
    hasMinPlayers,
  };
}

export interface RosterValidationStatus {
  home: RosterValidationResult;
  away: RosterValidationResult;
  /** Whether both rosters are valid */
  allValid: boolean;
}

/**
 * Validates both team rosters.
 */
export function validateBothRosters(
  homeNominationList: NominationList | null,
  homePlayerModifications: RosterModifications,
  homeCoachModifications: CoachModifications,
  awayNominationList: NominationList | null,
  awayPlayerModifications: RosterModifications,
  awayCoachModifications: CoachModifications,
): RosterValidationStatus {
  const home = validateRoster(homeNominationList, homePlayerModifications, homeCoachModifications);
  const away = validateRoster(awayNominationList, awayPlayerModifications, awayCoachModifications);

  return {
    home,
    away,
    allValid: home.isValid && away.isValid,
  };
}
