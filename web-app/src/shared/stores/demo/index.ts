/**
 * Demo store - combines domain-specific slices into a single store.
 *
 * This store manages mock data for demo mode, providing sample assignments,
 * compensations, exchanges, nominations, and game validation state.
 *
 * The store is split into domain-specific slices for maintainability:
 * - assignments: Assignment data
 * - compensations: Compensation records and edits
 * - exchanges: Game exchange data and operations
 * - nominations: Nomination lists, possible players, scorers
 * - validation: Game validation state and pending scorers
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  generateDummyData,
  generateMockNominationLists,
  type DemoAssociationCode,
} from "../demo-generators";
import { createAssignmentsSlice } from "./assignments";
import { createCompensationsSlice } from "./compensations";
import { createExchangesSlice } from "./exchanges";
import { createNominationsSlice } from "./nominations";
import { createValidationSlice } from "./validation";
import {
  type DemoState,
  DEMO_USER_REFEREE_LEVEL,
  DEMO_USER_REFEREE_LEVEL_GRADATION_VALUE,
  DEMO_DATA_STALENESS_MS,
} from "./types";

// Re-export types and constants for consumers
export type {
  DemoState,
  DemoAssociationCode,
  MockNominationLists,
  ValidatedGameData,
  PendingScorerData,
  AssignmentCompensationEdit,
} from "./types";

export { DEMO_USER_PERSON_IDENTITY } from "./types";

export const useDemoStore = create<DemoState>()(
  persist(
    (set, get, api) => ({
      // Combine all slices
      ...createAssignmentsSlice(set, get, api),
      ...createCompensationsSlice(set, get, api),
      ...createExchangesSlice(set, get, api),
      ...createNominationsSlice(set, get, api),
      ...createValidationSlice(set, get, api),

      // Core state
      activeAssociationCode: null,
      userRefereeLevel: null,
      userRefereeLevelGradationValue: null,
      generatedAt: null,

      // Data lifecycle actions
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
