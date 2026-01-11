/**
 * Compensations slice for demo store.
 * Handles compensation data and operations.
 */

import { updateCompensationRecord } from '../demo-generators'

import type { DemoState, DemoCompensationsState, AssignmentCompensationEdit } from './types'
import type { StateCreator } from 'zustand'

export interface CompensationsSlice extends DemoCompensationsState {
  updateCompensation: (
    compensationId: string,
    data: { distanceInMetres?: number; correctionReason?: string }
  ) => void
  updateAssignmentCompensation: (
    assignmentId: string,
    data: { distanceInMetres?: number; correctionReason?: string }
  ) => void
  getAssignmentCompensation: (assignmentId: string) => AssignmentCompensationEdit | null
}

export const createCompensationsSlice: StateCreator<DemoState, [], [], CompensationsSlice> = (
  set,
  get
) => ({
  compensations: [],
  assignmentCompensations: {},

  updateCompensation: (
    compensationId: string,
    data: { distanceInMetres?: number; correctionReason?: string }
  ) =>
    set((state) => ({
      compensations: state.compensations.map((comp) =>
        updateCompensationRecord(comp, compensationId, data)
      ),
    })),

  updateAssignmentCompensation: (
    assignmentId: string,
    data: { distanceInMetres?: number; correctionReason?: string }
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
    return get().assignmentCompensations[assignmentId] ?? null
  },
})
