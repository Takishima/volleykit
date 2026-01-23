/**
 * Active Departure Reminders store
 *
 * Manages transient state for active departure reminders.
 * Reminders are cleared after assignment completion.
 */

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
 * Initial state.
 */
const initialState: DepartureRemindersState = {
  reminders: new Map(),
  lastKnownLocation: null,
  locationUpdatedAt: null,
  isTracking: false,
}

/**
 * In-memory state (not persisted).
 */
let state: DepartureRemindersState = { ...initialState }

/**
 * State change listeners.
 */
type Listener = (state: DepartureRemindersState) => void
const listeners = new Set<Listener>()

/**
 * Notify all listeners of state change.
 */
function notifyListeners(): void {
  listeners.forEach((listener) => listener(state))
}

/**
 * Departure reminders store operations.
 */
export interface DepartureRemindersStore {
  /** Get current state */
  getState(): DepartureRemindersState
  /** Subscribe to state changes */
  subscribe(listener: Listener): () => void
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

/**
 * Get current state.
 */
function getState(): DepartureRemindersState {
  return state
}

/**
 * Subscribe to state changes.
 */
function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * Add or update a reminder.
 */
function upsertReminder(reminder: DepartureReminder): void {
  const newReminders = new Map(state.reminders)
  newReminders.set(reminder.assignmentId, reminder)
  state = { ...state, reminders: newReminders }
  notifyListeners()
}

/**
 * Remove a reminder by assignment ID.
 */
function removeReminder(assignmentId: string): void {
  const newReminders = new Map(state.reminders)
  newReminders.delete(assignmentId)
  state = { ...state, reminders: newReminders }
  notifyListeners()
}

/**
 * Remove reminders for past assignments.
 */
function cleanupPastReminders(currentTime: Date): void {
  const newReminders = new Map<string, DepartureReminder>()
  const cutoffTime = currentTime.toISOString()

  state.reminders.forEach((reminder, id) => {
    // Keep reminder if arrival time is in the future
    if (reminder.arrivalTime > cutoffTime) {
      newReminders.set(id, reminder)
    }
  })

  if (newReminders.size !== state.reminders.size) {
    state = { ...state, reminders: newReminders }
    notifyListeners()
  }
}

/**
 * Get reminder for assignment.
 */
function getReminder(assignmentId: string): DepartureReminder | undefined {
  return state.reminders.get(assignmentId)
}

/**
 * Get all active reminders.
 */
function getActiveReminders(): DepartureReminder[] {
  return Array.from(state.reminders.values())
}

/**
 * Update user location.
 */
function updateLocation(location: Coordinates): void {
  state = {
    ...state,
    lastKnownLocation: location,
    locationUpdatedAt: new Date().toISOString(),
  }
  notifyListeners()
}

/**
 * Set tracking status.
 */
function setTracking(isTracking: boolean): void {
  state = { ...state, isTracking }
  notifyListeners()
}

/**
 * Clear all reminders.
 */
function clearAll(): void {
  state = {
    ...state,
    reminders: new Map(),
  }
  notifyListeners()
}

/**
 * Reset to initial state.
 */
function reset(): void {
  state = {
    reminders: new Map(),
    lastKnownLocation: null,
    locationUpdatedAt: null,
    isTracking: false,
  }
  notifyListeners()
}

/**
 * Departure reminders store implementation.
 */
export const departureRemindersStore: DepartureRemindersStore = {
  getState,
  subscribe,
  upsertReminder,
  removeReminder,
  cleanupPastReminders,
  getReminder,
  getActiveReminders,
  updateLocation,
  setTracking,
  clearAll,
  reset,
}
