/**
 * Absences slice for demo store.
 * Read-only data: absences are seeded by the data lifecycle actions in
 * index.ts (initialize/refresh/switch association); there are no operations.
 */

import type { DemoState, DemoAbsencesState } from './types'
import type { StateCreator } from 'zustand'

export type AbsencesSlice = DemoAbsencesState

export const createAbsencesSlice: StateCreator<DemoState, [], [], AbsencesSlice> = (
  _set,
  _get,
  _api
) => ({
  absences: [],
})
