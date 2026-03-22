/**
 * Store for calendar association filter state.
 *
 * Provides shared state for filtering calendar assignments by association,
 * allowing the AppShell dropdown and AssignmentsPage to share the same filter.
 */

import { create } from 'zustand'

/** Special value meaning "show all associations" */
export const ALL_ASSOCIATIONS = '__all__'

interface CalendarFilterState {
  /** Currently selected association filter (or ALL_ASSOCIATIONS for all) */
  selectedAssociation: string

  /** List of available associations extracted from calendar data */
  associations: string[]

  /** Set the selected association filter */
  setSelectedAssociation: (association: string) => void

  /** Set the list of available associations */
  setAssociations: (associations: string[]) => void

  /** Reset filter to show all associations */
  resetFilter: () => void
}

export const useCalendarFilterStore = create<CalendarFilterState>((set) => ({
  selectedAssociation: ALL_ASSOCIATIONS,
  associations: [],

  setSelectedAssociation: (association) => set({ selectedAssociation: association }),

  setAssociations: (associations) => set({ associations }),

  resetFilter: () => set({ selectedAssociation: ALL_ASSOCIATIONS }),
}))
