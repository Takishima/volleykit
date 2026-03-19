/**
 * Active Departure Reminders store
 *
 * Manages transient state for active departure reminders.
 * Reminders are cleared after assignment completion.
 *
 * Uses Zustand for consistency with all other stores in the project.
 */

import { createStore } from 'zustand'

import type { DepartureReminder, Coordinates } from '../types/departureReminder'

/**
 * Departure reminders state.
 */
export interface DepartureRemindersState {
  /** Active reminders keyed by assignment ID */
  reminders: Map<string, DepartureReminder>
  /** Last known user location */
  lastKnownLocation: Coordinates | null
  /** Last location update timestamp */
  locationUpdatedAt: string | null
  /** Whether location tracking is active */
  isTracking: boolean
}

/**
 * Departure reminders actions.
 */
export interface DepartureRemindersActions {
  /** Add or update a reminder */
  upsertReminder(reminder: DepartureReminder): void
  /** Remove a reminder by assignment ID */
  removeReminder(assignmentId: string): void
  /** Remove reminders for past assignments */
  cleanupPastReminders(currentTime: Date): void
  /** Get reminder for assignment */
  getReminder(assignmentId: string): DepartureReminder | undefined
  /** Get all active reminders */
  getActiveReminders(): DepartureReminder[]
  /** Update user location */
  updateLocation(location: Coordinates): void
  /** Set tracking status */
  setTracking(isTracking: boolean): void
  /** Clear all reminders */
  clearAll(): void
  /** Reset to initial state */
  reset(): void
}

const departureRemindersZustandStore = createStore<
  DepartureRemindersState & DepartureRemindersActions
>()((set, get) => ({
  reminders: new Map(),
  lastKnownLocation: null,
  locationUpdatedAt: null,
  isTracking: false,

  upsertReminder(reminder) {
    set((state) => {
      const newReminders = new Map(state.reminders)
      newReminders.set(reminder.assignmentId, reminder)
      return { reminders: newReminders }
    })
  },

  removeReminder(assignmentId) {
    set((state) => {
      const newReminders = new Map(state.reminders)
      newReminders.delete(assignmentId)
      return { reminders: newReminders }
    })
  },

  cleanupPastReminders(currentTime) {
    const { reminders } = get()
    const newReminders = new Map<string, DepartureReminder>()
    const cutoffTime = currentTime.toISOString()

    reminders.forEach((reminder, id) => {
      if (reminder.arrivalTime > cutoffTime) {
        newReminders.set(id, reminder)
      }
    })

    if (newReminders.size !== reminders.size) {
      set({ reminders: newReminders })
    }
  },

  getReminder(assignmentId) {
    return get().reminders.get(assignmentId)
  },

  getActiveReminders() {
    return Array.from(get().reminders.values())
  },

  updateLocation(location) {
    set({
      lastKnownLocation: location,
      locationUpdatedAt: new Date().toISOString(),
    })
  },

  setTracking(isTracking) {
    set({ isTracking })
  },

  clearAll() {
    set({ reminders: new Map() })
  },

  reset() {
    set({
      reminders: new Map(),
      lastKnownLocation: null,
      locationUpdatedAt: null,
      isTracking: false,
    })
  },
}))

/**
 * Backward-compatible store interface.
 *
 * Preserves the existing imperative API used by service files
 * while backed by Zustand internally.
 */
export interface DepartureRemindersStore {
  getState(): DepartureRemindersState
  subscribe(
    listener: (state: DepartureRemindersState & DepartureRemindersActions) => void
  ): () => void
  upsertReminder(reminder: DepartureReminder): void
  removeReminder(assignmentId: string): void
  cleanupPastReminders(currentTime: Date): void
  getReminder(assignmentId: string): DepartureReminder | undefined
  getActiveReminders(): DepartureReminder[]
  updateLocation(location: Coordinates): void
  setTracking(isTracking: boolean): void
  clearAll(): void
  reset(): void
}

export const departureRemindersStore: DepartureRemindersStore = {
  getState: departureRemindersZustandStore.getState,
  subscribe: departureRemindersZustandStore.subscribe,
  upsertReminder: (...args) => departureRemindersZustandStore.getState().upsertReminder(...args),
  removeReminder: (...args) => departureRemindersZustandStore.getState().removeReminder(...args),
  cleanupPastReminders: (...args) =>
    departureRemindersZustandStore.getState().cleanupPastReminders(...args),
  getReminder: (...args) => departureRemindersZustandStore.getState().getReminder(...args),
  getActiveReminders: () => departureRemindersZustandStore.getState().getActiveReminders(),
  updateLocation: (...args) => departureRemindersZustandStore.getState().updateLocation(...args),
  setTracking: (...args) => departureRemindersZustandStore.getState().setTracking(...args),
  clearAll: () => departureRemindersZustandStore.getState().clearAll(),
  reset: () => departureRemindersZustandStore.getState().reset(),
}
