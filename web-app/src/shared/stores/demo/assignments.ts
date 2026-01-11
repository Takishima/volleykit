/**
 * Assignments slice for demo store.
 * Handles assignment data and operations.
 */

import type { DemoState, DemoAssignmentsState } from './types'
import type { StateCreator } from 'zustand'

export type AssignmentsSlice = DemoAssignmentsState

export const createAssignmentsSlice: StateCreator<DemoState, [], [], AssignmentsSlice> = () => ({
  assignments: [],
})
