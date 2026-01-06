/**
 * Exchanges slice for demo store.
 * Handles game exchange data and operations.
 */

import type { StateCreator } from "zustand";
import type { GameExchange } from "@/api/client";
import type { DemoState, DemoExchangesState } from "./types";

export interface ExchangesSlice extends DemoExchangesState {
  applyForExchange: (exchangeId: string) => void;
  withdrawFromExchange: (exchangeId: string) => void;
  addAssignmentToExchange: (assignmentId: string) => void;
}

export const createExchangesSlice: StateCreator<
  DemoState,
  [],
  [],
  ExchangesSlice
> = (set) => ({
  exchanges: [],

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
});
