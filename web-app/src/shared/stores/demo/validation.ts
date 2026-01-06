/**
 * Validation slice for demo store.
 * Handles game validation state and pending scorer selections.
 */

import type { StateCreator } from "zustand";
import type {
  DemoState,
  DemoValidationState,
  ValidatedGameData,
  PendingScorerData,
} from "./types";

export interface ValidationSlice extends DemoValidationState {
  markGameValidated: (
    gameId: string,
    data: {
      scorer: { __identity: string; displayName: string; birthday?: string };
      scoresheetFileId?: string;
    },
  ) => void;
  isGameValidated: (gameId: string) => boolean;
  getValidatedGameData: (gameId: string) => ValidatedGameData | null;
  setPendingScorer: (
    gameId: string,
    scorer: { __identity: string; displayName: string; birthday?: string },
  ) => void;
  getPendingScorer: (gameId: string) => PendingScorerData | null;
  clearPendingScorer: (gameId: string) => void;
}

export const createValidationSlice: StateCreator<
  DemoState,
  [],
  [],
  ValidationSlice
> = (set, get) => ({
  validatedGames: {},
  pendingScorers: {},

  markGameValidated: (
    gameId: string,
    data: {
      scorer: { __identity: string; displayName: string; birthday?: string };
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
    scorer: { __identity: string; displayName: string; birthday?: string },
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
});
