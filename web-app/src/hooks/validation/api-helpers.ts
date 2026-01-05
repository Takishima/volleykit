/**
 * API helper functions for game validation operations.
 */

import { getApiClient } from "@/api/client";
import { logger } from "@/utils/logger";
import type { RosterModifications, CoachModifications, CoachRole } from "@/hooks/useNominationList";

/** Type for nomination list with required fields for API calls. */
export interface NominationListForApi {
  __identity?: string;
  team?: { __identity?: string };
  indoorPlayerNominations?: { __identity?: string }[];
  nominationListValidation?: { __identity?: string };
  coachPerson?: { __identity?: string };
  firstAssistantCoachPerson?: { __identity?: string };
  secondAssistantCoachPerson?: { __identity?: string };
}

/** Type for scoresheet with required fields for API calls. */
export interface ScoresheetForApi {
  __identity?: string;
  isSimpleScoresheet?: boolean;
  scoresheetValidation?: { __identity?: string };
}

/**
 * Check if roster has modifications (added or removed players).
 */
export function hasRosterModifications(modifications: RosterModifications): boolean {
  return modifications.added.length > 0 || modifications.removed.length > 0;
}

/**
 * Get player nomination IDs from a nomination list, applying modifications.
 */
export function getPlayerNominationIds(
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

/**
 * Check if there are any coach modifications (additions or removals).
 */
export function hasCoachModifications(modifications: CoachModifications): boolean {
  return modifications.added.size > 0 || modifications.removed.size > 0;
}

/**
 * Build coach IDs object from coach modifications.
 * Merges existing coaches with additions and handles removals.
 */
export function buildCoachIds(
  nomList: NominationListForApi,
  coachModifications: CoachModifications,
): { head?: string; firstAssistant?: string; secondAssistant?: string } | undefined {
  if (!hasCoachModifications(coachModifications)) {
    return undefined;
  }

  const coachIds: { head?: string; firstAssistant?: string; secondAssistant?: string } = {};
  const roleToProperty: Record<CoachRole, keyof Pick<NominationListForApi, "coachPerson" | "firstAssistantCoachPerson" | "secondAssistantCoachPerson">> = {
    head: "coachPerson",
    firstAssistant: "firstAssistantCoachPerson",
    secondAssistant: "secondAssistantCoachPerson",
  };

  for (const role of ["head", "firstAssistant", "secondAssistant"] as CoachRole[]) {
    // Check if there's a pending addition for this role
    const addedCoach = coachModifications.added.get(role);
    if (addedCoach) {
      coachIds[role] = addedCoach.id;
      continue;
    }

    // Check if this role is being removed
    if (coachModifications.removed.has(role)) {
      coachIds[role] = ""; // Empty string signals removal
      continue;
    }

    // Preserve existing coach if no modification
    const existingId = nomList[roleToProperty[role]]?.__identity;
    if (existingId) {
      coachIds[role] = existingId;
    }
  }

  return coachIds;
}

/** Saves roster modifications (players and coaches) for a single team. */
export async function saveRosterModifications(
  apiClient: ReturnType<typeof getApiClient>,
  gameId: string,
  nomList: NominationListForApi | undefined,
  playerModifications: RosterModifications,
  coachModifications?: CoachModifications,
): Promise<void> {
  const hasPlayerMods = hasRosterModifications(playerModifications);
  const hasCoachMods = coachModifications ? hasCoachModifications(coachModifications) : false;

  if (!hasPlayerMods && !hasCoachMods) {
    logger.debug("[VS] skip roster save: no modifications");
    return;
  }
  if (!nomList?.__identity || !nomList.team?.__identity) {
    logger.debug("[VS] skip roster save: missing nomination list or team ID");
    return;
  }

  const playerIds = getPlayerNominationIds(nomList, playerModifications);
  const coachIds = coachModifications ? buildCoachIds(nomList, coachModifications) : undefined;

  await apiClient.updateNominationList(
    nomList.__identity,
    gameId,
    nomList.team.__identity,
    playerIds,
    coachIds,
  );
}

/** Saves scoresheet with scorer selection. */
export async function saveScorerSelection(
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

/** Finalizes a single team's roster (players and coaches). */
export async function finalizeRoster(
  apiClient: ReturnType<typeof getApiClient>,
  gameId: string,
  nomList: NominationListForApi | undefined,
  playerModifications: RosterModifications,
  coachModifications?: CoachModifications,
): Promise<void> {
  if (!nomList?.__identity || !nomList.team?.__identity) {
    logger.debug("[VS] skip roster finalize: missing nomination list or team ID");
    return;
  }

  const playerIds = getPlayerNominationIds(nomList, playerModifications);
  const coachIds = coachModifications ? buildCoachIds(nomList, coachModifications) : undefined;

  await apiClient.finalizeNominationList(
    nomList.__identity,
    gameId,
    nomList.team.__identity,
    playerIds,
    nomList.nominationListValidation?.__identity,
    coachIds,
  );
}

/** Finalizes scoresheet with optional file upload. */
export async function finalizeScoresheetWithFile(
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

  await apiClient.finalizeScoresheet(
    scoresheet.__identity,
    gameId,
    scorerId,
    fileResourceId,
    scoresheet.scoresheetValidation?.__identity,
    scoresheet.isSimpleScoresheet ?? false,
  );
}
