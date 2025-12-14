import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { NominationList, IndoorPlayerNomination } from "@/api/client";
import { useAuthStore } from "@/stores/auth";
import { useDemoStore } from "@/stores/demo";

const NOMINATION_LIST_STALE_TIME_MS = 5 * 60 * 1000;

export interface RosterPlayer {
  id: string;
  shirtNumber: number;
  displayName: string;
  licenseCategory?: string;
  isCaptain?: boolean;
  isLibero?: boolean;
  isNewlyAdded?: boolean;
}

export interface RosterModifications {
  added: RosterPlayer[];
  removed: string[];
}

interface UseNominationListOptions {
  gameId: string;
  team: "home" | "away";
  enabled?: boolean;
}

interface UseNominationListResult {
  nominationList: NominationList | null;
  players: RosterPlayer[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

function transformNominationToPlayer(
  nomination: IndoorPlayerNomination,
): RosterPlayer | null {
  const id = nomination.__identity;
  const shirtNumber = nomination.shirtNumber;
  const displayName =
    nomination.indoorPlayer?.person?.displayName ??
    `${nomination.indoorPlayer?.person?.firstName ?? ""} ${nomination.indoorPlayer?.person?.lastName ?? ""}`.trim();

  if (!id || shirtNumber === undefined || !displayName) {
    return null;
  }

  return {
    id,
    shirtNumber,
    displayName,
    licenseCategory: nomination.indoorPlayerLicenseCategory?.shortName,
    isCaptain: nomination.isCaptain ?? false,
    isLibero: nomination.isLibero ?? false,
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
    .sort((a, b) => a.shirtNumber - b.shirtNumber);
}

export function useNominationList({
  gameId,
  team,
  enabled = true,
}: UseNominationListOptions): UseNominationListResult {
  const isDemoMode = useAuthStore((state) => state.isDemoMode);
  const nominationLists = useDemoStore((state) => state.nominationLists);

  const demoNominationList = useMemo(() => {
    if (!isDemoMode || !gameId) return null;
    const gameNominations = nominationLists[gameId];
    if (!gameNominations) return null;
    return gameNominations[team] ?? null;
  }, [isDemoMode, gameId, team, nominationLists]);

  const demoPlayers = useMemo(() => {
    if (!demoNominationList) return [];
    return transformNominationsToPlayers(
      demoNominationList.indoorPlayerNominations,
    );
  }, [demoNominationList]);

  const query = useQuery({
    queryKey: ["nominationList", gameId, team],
    // TODO(#37): Implement API fetch for nomination list
    queryFn: async (): Promise<NominationList | null> => {
      return null;
    },
    enabled: enabled && !isDemoMode && !!gameId,
    staleTime: NOMINATION_LIST_STALE_TIME_MS,
  });

  const apiPlayers = useMemo(() => {
    if (!query.data) return [];
    return transformNominationsToPlayers(query.data.indoorPlayerNominations);
  }, [query.data]);

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

  return {
    nominationList: query.data ?? null,
    players: apiPlayers,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
