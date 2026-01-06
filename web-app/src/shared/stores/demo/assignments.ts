/**
 * Assignments slice for demo store.
 * Handles assignment data and operations.
 */

import type { StateCreator } from "zustand";
import type { DemoState, DemoAssignmentsState } from "./types";

export type AssignmentsSlice = DemoAssignmentsState;

export const createAssignmentsSlice: StateCreator<
  DemoState,
  [],
  [],
  AssignmentsSlice
> = () => ({
  assignments: [],
});
