import { useMemo } from "react";
import type { NominationList, IndoorPlayerNomination } from "@/api/client";
import { useAuthStore } from "@/stores/auth";
import { useDemoStore } from "@/stores/demo";

export interface RosterPlayer {
  id: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  birthday?: string | null;
  licenseCategory?: string;
  isNewlyAdded?: boolean;
}

export interface RosterModifications {
  added: RosterPlayer[];
  removed: string[];
}

export type CoachRole = "head" | "firstAssistant" | "secondAssistant";

export interface CoachInfo {
  id: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  birthday?: string | null;
}

export interface CoachModifications {
  /** Map of coach roles to the person being added */
  added: Map<CoachRole, CoachInfo>;
  /** Set of coach roles being removed */
  removed: Set<CoachRole>;
}

interface UseNominationListOptions {
  gameId: string;
  team: "home" | "away";
  /**
   * Pre-fetched nomination list data from getGameWithScoresheet().
   * Required when not in demo mode.
   */
  prefetchedData?: NominationList | null;
}

interface UseNominationListResult {
  nominationList: NominationList | null;
  players: RosterPlayer[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

function buildDisplayName(nomination: IndoorPlayerNomination): string {
  const person = nomination.indoorPlayer?.person;
  if (person?.displayName) {
    return person.displayName;
  }

  const firstName = person?.firstName?.trim() ?? "";
  const lastName = person?.lastName?.trim() ?? "";
  return [firstName, lastName].filter(Boolean).join(" ");
}

function transformNominationToPlayer(
  nomination: IndoorPlayerNomination,
): RosterPlayer | null {
  const id = nomination.__identity;
  const displayName = buildDisplayName(nomination);
  const person = nomination.indoorPlayer?.person;

  if (!id || !displayName) {
    return null;
  }

  return {
    id,
    displayName,
    firstName: person?.firstName,
    lastName: person?.lastName,
    birthday: person?.birthday,
    licenseCategory: nomination.indoorPlayerLicenseCategory?.shortName,
    isNewlyAdded: false,
  };
}

function transformNominationsToPlayers(
  nominations: IndoorPlayerNomination[] | undefined,
): RosterPlayer[] {
  if (!nominations) return [];

  return nominations
    .map(transformNominationToPlayer)
    .filter((player): player is RosterPlayer => player !== null)
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

/**
 * Hook to access nomination list data for a team.
 *
 * Data sources (in priority order):
 * 1. Pre-fetched data from getGameWithScoresheet() - preferred
 * 2. Demo mode data from useDemoStore
 *
 * @example
 * // In validation wizard with pre-fetched data
 * const { players } = useNominationList({
 *   gameId,
 *   team: "home",
 *   prefetchedData: homeNominationList,
 * });
 */
export function useNominationList({
  gameId,
  team,
  prefetchedData,
}: UseNominationListOptions): UseNominationListResult {
  const dataSource = useAuthStore((state) => state.dataSource);
  const isDemoMode = dataSource === "demo";
  const nominationLists = useDemoStore((state) => state.nominationLists);
  // Check for both null and undefined - API may return null for some validated games
  const hasPrefetchedData = prefetchedData != null;

  // Transform prefetched data if provided
  const prefetchedPlayers = useMemo(() => {
    if (!hasPrefetchedData) return [];
    return transformNominationsToPlayers(prefetchedData?.indoorPlayerNominations);
  }, [hasPrefetchedData, prefetchedData]);

  const demoNominationList = useMemo(() => {
    if (hasPrefetchedData || !isDemoMode || !gameId) return null;
    const gameNominations = nominationLists[gameId];
    if (!gameNominations) return null;
    return gameNominations[team] ?? null;
  }, [hasPrefetchedData, isDemoMode, gameId, team, nominationLists]);

  const demoPlayers = useMemo(() => {
    if (!demoNominationList) return [];
    return transformNominationsToPlayers(
      demoNominationList.indoorPlayerNominations,
    );
  }, [demoNominationList]);

  // Return prefetched data if provided
  if (hasPrefetchedData) {
    return {
      nominationList: prefetchedData,
      players: prefetchedPlayers,
      isLoading: false,
      isError: false,
      error: null,
      refetch: () => {
        // No-op when using prefetched data
      },
    };
  }

  // Return demo data if in demo mode
  if (isDemoMode) {
    return {
      nominationList: demoNominationList,
      players: demoPlayers,
      isLoading: false,
      isError: false,
      error: null,
      refetch: () => {
        // No-op in demo mode
      },
    };
  }

  // No data available - prefetchedData is required when not in demo mode
  return {
    nominationList: null,
    players: [],
    isLoading: false,
    isError: true,
    error: new Error(
      "Nomination list data not available. Ensure prefetchedData is provided from getGameWithScoresheet().",
    ),
    refetch: () => {
      // No-op - data should be provided via prefetchedData
    },
  };
}
