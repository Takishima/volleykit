import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Assignment,
  CompensationRecord,
  GameExchange,
  PossibleNomination,
  PersonSearchResult,
} from "@/api/client";
import {
  generateDummyData,
  generateMockNominationLists,
  updateCompensationRecord,
  type DemoAssociationCode,
  type MockNominationLists,
} from "./demo-generators";

// Re-export types for consumers
export type { DemoAssociationCode, MockNominationLists };

// Mock player for roster display
export interface MockRosterPlayer {
  id: string;
  shirtNumber: number;
  displayName: string;
  licenseCategory?: string;
  isCaptain?: boolean;
  isLibero?: boolean;
}

// Validated game data stored after finalization
export interface ValidatedGameData {
  validatedAt: string;
  scorer: {
    __identity: string;
    displayName: string;
  };
  scoresheetFileId?: string;
  homeRosterClosed: boolean;
  awayRosterClosed: boolean;
}

// Pending scorer selection (saved before finalization)
export interface PendingScorerData {
  __identity: string;
  displayName: string;
}

// Compensation edits for assignments (stored separately since assignments
// don't have a convocationCompensation field like CompensationRecords do)
export interface AssignmentCompensationEdit {
  distanceInMetres?: number;
  correctionReason?: string;
  updatedAt: string;
}

interface DemoState {
  // Data arrays - populated when demo mode is enabled via useAuthStore
  assignments: Assignment[];
  compensations: CompensationRecord[];
  exchanges: GameExchange[];
  nominationLists: MockNominationLists;
  possiblePlayers: PossibleNomination[];
  scorers: PersonSearchResult[];

  // Validated games - keyed by game ID
  validatedGames: Record<string, ValidatedGameData>;

  // Pending scorer selections - keyed by game ID (saved before finalization)
  pendingScorers: Record<string, PendingScorerData>;

  // Assignment compensation edits - keyed by assignment ID
  assignmentCompensations: Record<string, AssignmentCompensationEdit>;

  // Current active association code for region-specific data
  activeAssociationCode: DemoAssociationCode | null;

  // Demo user's referee level for filtering exchanges
  userRefereeLevel: string | null;
  userRefereeLevelGradationValue: number | null;

  // Timestamp when demo data was generated (for staleness check)
  generatedAt: number | null;

  // Data lifecycle actions
  initializeDemoData: (associationCode?: DemoAssociationCode) => void;
  clearDemoData: () => void;
  refreshData: () => void;
  setActiveAssociation: (associationCode: DemoAssociationCode) => void;

  // Demo mode operations
  applyForExchange: (exchangeId: string) => void;
  withdrawFromExchange: (exchangeId: string) => void;
  addAssignmentToExchange: (assignmentId: string) => void;
  updateCompensation: (
    compensationId: string,
    data: { distanceInMetres?: number; correctionReason?: string },
  ) => void;

  // Assignment compensation operations
  updateAssignmentCompensation: (
    assignmentId: string,
    data: { distanceInMetres?: number; correctionReason?: string },
  ) => void;
  getAssignmentCompensation: (
    assignmentId: string,
  ) => AssignmentCompensationEdit | null;

  // Game validation operations
  markGameValidated: (
    gameId: string,
    data: {
      scorer: { __identity: string; displayName: string };
      scoresheetFileId?: string;
    },
  ) => void;
  isGameValidated: (gameId: string) => boolean;
  getValidatedGameData: (gameId: string) => ValidatedGameData | null;
  setPendingScorer: (
    gameId: string,
    scorer: { __identity: string; displayName: string },
  ) => void;
  getPendingScorer: (gameId: string) => PendingScorerData | null;
  clearPendingScorer: (gameId: string) => void;
  updateNominationListClosed: (
    gameId: string,
    team: "home" | "away",
    closed: boolean,
  ) => void;
  updateNominationListPlayers: (
    gameId: string,
    team: "home" | "away",
    playerNominationIds: string[],
  ) => void;
}

// Demo user referee level configuration
const DEMO_USER_REFEREE_LEVEL = "N2";
const DEMO_USER_REFEREE_LEVEL_GRADATION_VALUE = 2;

// Demo data is considered stale after 6 hours
const DEMO_DATA_STALENESS_MS = 6 * 60 * 60 * 1000;

export const useDemoStore = create<DemoState>()(
  persist(
    (set, get) => ({
      assignments: [],
      compensations: [],
      exchanges: [],
      nominationLists: {},
      possiblePlayers: [],
      scorers: [],
      validatedGames: {},
      pendingScorers: {},
      assignmentCompensations: {},
      activeAssociationCode: null,
      userRefereeLevel: null,
      userRefereeLevelGradationValue: null,
      generatedAt: null,

      initializeDemoData: (associationCode: DemoAssociationCode = "SV") => {
        const currentState = get();
        const hasExistingData = currentState.assignments.length > 0;
        const isSameAssociation =
          currentState.activeAssociationCode === associationCode;

        if (hasExistingData && isSameAssociation) {
          return;
        }

        const data = generateDummyData(associationCode);
        set({
          assignments: data.assignments,
          compensations: data.compensations,
          exchanges: data.exchanges,
          nominationLists: generateMockNominationLists(),
          possiblePlayers: data.possiblePlayers,
          scorers: data.scorers,
          activeAssociationCode: associationCode,
          userRefereeLevel: DEMO_USER_REFEREE_LEVEL,
          userRefereeLevelGradationValue: DEMO_USER_REFEREE_LEVEL_GRADATION_VALUE,
          generatedAt: Date.now(),
        });
      },

      clearDemoData: () =>
        set({
          assignments: [],
          compensations: [],
          exchanges: [],
          nominationLists: {},
          possiblePlayers: [],
          scorers: [],
          validatedGames: {},
          pendingScorers: {},
          assignmentCompensations: {},
          activeAssociationCode: null,
          userRefereeLevel: null,
          userRefereeLevelGradationValue: null,
          generatedAt: null,
        }),

      refreshData: () =>
        set(() => {
          const currentAssociation = get().activeAssociationCode ?? "SV";
          const newData = generateDummyData(currentAssociation);
          return {
            assignments: newData.assignments,
            compensations: newData.compensations,
            exchanges: newData.exchanges,
            nominationLists: generateMockNominationLists(),
            possiblePlayers: newData.possiblePlayers,
            scorers: newData.scorers,
            validatedGames: {},
            pendingScorers: {},
            assignmentCompensations: {},
            generatedAt: Date.now(),
          };
        }),

      setActiveAssociation: (associationCode: DemoAssociationCode) => {
        const data = generateDummyData(associationCode);
        set({
          assignments: data.assignments,
          compensations: data.compensations,
          exchanges: data.exchanges,
          nominationLists: generateMockNominationLists(),
          possiblePlayers: data.possiblePlayers,
          scorers: data.scorers,
          activeAssociationCode: associationCode,
          generatedAt: Date.now(),
        });
      },

      applyForExchange: (exchangeId: string) =>
        set((state) => {
          const now = new Date();
          return {
            exchanges: state.exchanges.map((exchange) =>
              exchange.__identity === exchangeId
                ? {
                    ...exchange,
                    status: "applied" as const,
                    appliedAt: now.toISOString(),
                    appliedBy: {
                      indoorReferee: {
                        person: {
                          __identity: "demo-me",
                          firstName: "Demo",
                          lastName: "User",
                          displayName: "Demo User",
                        },
                      },
                    },
                  }
                : exchange,
            ),
          };
        }),

      withdrawFromExchange: (exchangeId: string) =>
        set((state) => ({
          exchanges: state.exchanges.map((exchange) =>
            exchange.__identity === exchangeId
              ? {
                  ...exchange,
                  status: "open" as const,
                  appliedAt: undefined,
                  appliedBy: undefined,
                }
              : exchange,
          ),
        })),

      addAssignmentToExchange: (assignmentId: string) =>
        set((state) => {
          const assignment = state.assignments.find(
            (a) => a.__identity === assignmentId,
          );
          if (!assignment) return state;

          const now = new Date();
          const newExchange: GameExchange = {
            __identity: `demo-exchange-new-${Date.now()}`,
            status: "open",
            submittedAt: now.toISOString(),
            submittingType: "referee",
            refereePosition: assignment.refereePosition,
            requiredRefereeLevel: "N3",
            submittedByPerson: {
              __identity: "demo-me",
              firstName: "Demo",
              lastName: "User",
              displayName: "Demo User",
            },
            refereeGame: assignment.refereeGame,
          };

          return {
            exchanges: [...state.exchanges, newExchange],
          };
        }),

      updateCompensation: (
        compensationId: string,
        data: { distanceInMetres?: number; correctionReason?: string },
      ) =>
        set((state) => ({
          compensations: state.compensations.map((comp) =>
            updateCompensationRecord(comp, compensationId, data),
          ),
        })),

      updateAssignmentCompensation: (
        assignmentId: string,
        data: { distanceInMetres?: number; correctionReason?: string },
      ) =>
        set((state) => ({
          assignmentCompensations: {
            ...state.assignmentCompensations,
            [assignmentId]: {
              ...state.assignmentCompensations[assignmentId],
              ...data,
              updatedAt: new Date().toISOString(),
            },
          },
        })),

      getAssignmentCompensation: (assignmentId: string) => {
        return get().assignmentCompensations[assignmentId] ?? null;
      },

      markGameValidated: (
        gameId: string,
        data: {
          scorer: { __identity: string; displayName: string };
          scoresheetFileId?: string;
        },
      ) =>
        set((state) => ({
          validatedGames: {
            ...state.validatedGames,
            [gameId]: {
              validatedAt: new Date().toISOString(),
              scorer: data.scorer,
              scoresheetFileId: data.scoresheetFileId,
              homeRosterClosed: true,
              awayRosterClosed: true,
            },
          },
        })),

      isGameValidated: (gameId: string) => {
        return !!get().validatedGames[gameId];
      },

      getValidatedGameData: (gameId: string) => {
        return get().validatedGames[gameId] ?? null;
      },

      setPendingScorer: (
        gameId: string,
        scorer: { __identity: string; displayName: string },
      ) =>
        set((state) => ({
          pendingScorers: {
            ...state.pendingScorers,
            [gameId]: scorer,
          },
        })),

      getPendingScorer: (gameId: string) => {
        return get().pendingScorers[gameId] ?? null;
      },

      clearPendingScorer: (gameId: string) =>
        set((state) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Destructuring to remove key
          const { [gameId]: _removed, ...rest } = state.pendingScorers;
          return { pendingScorers: rest };
        }),

      updateNominationListClosed: (
        gameId: string,
        team: "home" | "away",
        closed: boolean,
      ) =>
        set((state) => {
          const gameNominations = state.nominationLists[gameId];
          if (!gameNominations) return state;

          return {
            nominationLists: {
              ...state.nominationLists,
              [gameId]: {
                ...gameNominations,
                [team]: {
                  ...gameNominations[team],
                  closed,
                  ...(closed && {
                    closedAt: new Date().toISOString(),
                    closedBy: "referee",
                  }),
                },
              },
            },
          };
        }),

      updateNominationListPlayers: (
        gameId: string,
        team: "home" | "away",
        playerNominationIds: string[],
      ) =>
        set((state) => {
          const gameNominations = state.nominationLists[gameId];
          if (!gameNominations) return state;

          const nominationList = gameNominations[team];
          if (!nominationList) return state;

          const existingNominations =
            nominationList.indoorPlayerNominations ?? [];
          const existingById = new Map(
            existingNominations.map((n) => [n.__identity, n]),
          );

          const possiblePlayersById = new Map(
            state.possiblePlayers.map((p) => [
              p.indoorPlayer?.__identity,
              {
                __identity: p.indoorPlayer?.__identity ?? "",
                person: p.indoorPlayer?.person,
                shirtNumber: 0,
              },
            ]),
          );

          const newNominations = playerNominationIds
            .map((id) => existingById.get(id) ?? possiblePlayersById.get(id))
            .filter(
              (n): n is NonNullable<typeof n> => n !== undefined && n !== null,
            );

          return {
            nominationLists: {
              ...state.nominationLists,
              [gameId]: {
                ...gameNominations,
                [team]: {
                  ...nominationList,
                  indoorPlayerNominations: newNominations,
                },
              },
            },
          };
        }),
    }),
    {
      name: "volleykit-demo",
      partialize: (state) => ({
        assignments: state.assignments,
        compensations: state.compensations,
        exchanges: state.exchanges,
        nominationLists: state.nominationLists,
        possiblePlayers: state.possiblePlayers,
        scorers: state.scorers,
        validatedGames: state.validatedGames,
        pendingScorers: state.pendingScorers,
        assignmentCompensations: state.assignmentCompensations,
        activeAssociationCode: state.activeAssociationCode,
        userRefereeLevel: state.userRefereeLevel,
        userRefereeLevelGradationValue: state.userRefereeLevelGradationValue,
        generatedAt: state.generatedAt,
      }),
      merge: (persisted, current) => {
        const persistedState = persisted as Partial<DemoState> | undefined;

        const generatedAt = persistedState?.generatedAt;
        const isStale =
          !generatedAt || Date.now() - generatedAt > DEMO_DATA_STALENESS_MS;

        if (isStale) {
          return {
            ...current,
            validatedGames: persistedState?.validatedGames ?? {},
            pendingScorers: persistedState?.pendingScorers ?? {},
            assignmentCompensations: persistedState?.assignmentCompensations ?? {},
          };
        }

        return {
          ...current,
          ...persistedState,
        };
      },
    },
  ),
);
