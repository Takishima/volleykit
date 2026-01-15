/**
 * Background task for departure reminders.
 *
 * Periodically checks location and schedules departure notifications
 * for upcoming assignments using expo-task-manager.
 */

import * as TaskManager from 'expo-task-manager';
import { location } from '../../platform/location';
import { departureReminderSettingsStore } from '../../stores/departureReminderSettings';
import { departureRemindersStore } from '../../stores/departureReminders';
import { storage } from '../../platform/storage';
import type { Coordinates, DepartureReminder } from '../../types/departureReminder';
import { calculateRoute, isOjpConfigured, RouteCalculationError } from './route-calculator';
import { isNearVenue, shouldSendDepartureNotification, clusterNearbyVenues, type AssignmentWithVenue, type VenueCluster } from './venue-proximity';
import { scheduleReminderNotification, cancelReminderNotification } from './notification-scheduler';

/** Task name for the departure reminder background task */
export const DEPARTURE_REMINDER_TASK_NAME = 'VOLLEYKIT_DEPARTURE_REMINDER_TASK';

/** How far ahead to look for assignments (6 hours in ms) */
const LOOKAHEAD_WINDOW_MS = 6 * 60 * 60 * 1000;

/** Fallback travel time estimate in minutes when route calculation fails */
const FALLBACK_TRAVEL_ESTIMATE_MINUTES = 45;

/**
 * Assignment data needed for departure reminders.
 */
export interface UpcomingAssignment {
  id: string;
  gameTime: string;
  venueName: string;
  venueLocation: Coordinates;
  venueAddress?: string;
}

/**
 * Assignment data provider interface.
 * This should be implemented to fetch assignments from the app's data layer.
 */
export interface AssignmentProvider {
  getUpcomingAssignments(withinMs: number): Promise<UpcomingAssignment[]>;
}

/** Registered assignment provider */
let assignmentProvider: AssignmentProvider | null = null;

/**
 * Register the assignment provider for the background task.
 */
export function registerAssignmentProvider(provider: AssignmentProvider): void {
  assignmentProvider = provider;
}

/**
 * Define the background task.
 * This must be called at app startup outside of any component.
 */
export function defineBackgroundTask(): void {
  TaskManager.defineTask(DEPARTURE_REMINDER_TASK_NAME, async () => {
    try {
      await runDepartureReminderCheck();
    } catch (error) {
      console.error('Departure reminder task error:', error);
    }
  });
}

/**
 * Check if the background task is registered.
 */
export async function isTaskRegistered(): Promise<boolean> {
  return TaskManager.isTaskRegisteredAsync(DEPARTURE_REMINDER_TASK_NAME);
}

/**
 * Start the background task.
 * Starts location tracking which triggers the task.
 */
export async function startBackgroundTask(): Promise<void> {
  // Check if feature is enabled
  const settings = await departureReminderSettingsStore.loadSettings(storage);
  if (!settings.enabled) {
    console.log('Departure reminders disabled, not starting task');
    return;
  }

  // Check for assignments
  if (!assignmentProvider) {
    console.log('No assignment provider registered');
    return;
  }

  const assignments = await assignmentProvider.getUpcomingAssignments(LOOKAHEAD_WINDOW_MS);
  if (assignments.length === 0) {
    console.log('No upcoming assignments, not starting task');
    return;
  }

  // Check permissions
  const hasBgPermissions = await location.hasBackgroundPermissions();
  if (!hasBgPermissions) {
    console.log('No background location permissions');
    return;
  }

  // Start location tracking with balanced accuracy
  // Settings are configured in location.ts
  await location.startBackgroundTracking();

  departureRemindersStore.setTracking(true);
}

/**
 * Stop the background task.
 */
export async function stopBackgroundTask(): Promise<void> {
  await location.stopBackgroundTracking();
  departureRemindersStore.setTracking(false);
}

/**
 * Run the departure reminder check.
 * This is called by the background task.
 */
export async function runDepartureReminderCheck(): Promise<void> {
  // Verify feature is still enabled
  const settings = await departureReminderSettingsStore.loadSettings(storage);
  if (!settings.enabled) {
    await stopBackgroundTask();
    return;
  }

  // Get current location
  let userLocation: Coordinates;
  try {
    const currentLocation = await location.getCurrentLocation();
    if (!currentLocation) {
      console.log('Could not get current location');
      // Fallback behavior: schedule time-based reminders without route info
      await scheduleTimeBasedReminders();
      return;
    }
    userLocation = currentLocation;
    departureRemindersStore.updateLocation(userLocation);
  } catch (error) {
    console.error('Failed to get location:', error);
    // Fallback behavior: schedule time-based reminders without route info
    await scheduleTimeBasedReminders();
    return;
  }

  // Get upcoming assignments
  if (!assignmentProvider) return;
  const assignments = await assignmentProvider.getUpcomingAssignments(LOOKAHEAD_WINDOW_MS);

  if (assignments.length === 0) {
    // No assignments in window, stop tracking
    await stopBackgroundTask();
    return;
  }

  // Check each assignment
  for (const assignment of assignments) {
    await processAssignment(assignment, userLocation, settings.bufferMinutes);
  }

  // Cleanup past reminders
  departureRemindersStore.cleanupPastReminders(new Date());
}

/**
 * Process a single assignment for departure reminder.
 */
async function processAssignment(
  assignment: UpcomingAssignment,
  userLocation: Coordinates,
  bufferMinutes: number
): Promise<void> {
  // Check if already near venue (suppress notification per FR-024)
  if (!shouldSendDepartureNotification(userLocation, assignment.venueLocation)) {
    // Cancel any existing notification
    const existing = departureRemindersStore.getReminder(assignment.id);
    if (existing?.notificationId) {
      await cancelReminderNotification(existing.notificationId);
      departureRemindersStore.removeReminder(assignment.id);
    }
    return;
  }

  // Check if we already have a recent reminder
  const existing = departureRemindersStore.getReminder(assignment.id);
  if (existing) {
    // Check if location changed significantly (>200m)
    const locationChanged = !isNearVenue(userLocation, existing.userLocation, 200);
    if (!locationChanged) {
      // Skip recalculation if location hasn't changed much
      return;
    }
  }

  // Calculate route
  const gameTime = new Date(assignment.gameTime);
  const targetArrivalTime = new Date(gameTime.getTime() - bufferMinutes * 60 * 1000);

  let reminder: DepartureReminder;

  if (isOjpConfigured()) {
    try {
      const route = await calculateRoute(
        userLocation,
        assignment.venueLocation,
        targetArrivalTime
      );

      reminder = {
        assignmentId: assignment.id,
        userLocation,
        venueLocation: assignment.venueLocation,
        venueName: assignment.venueName,
        calculatedAt: new Date().toISOString(),
        departureTime: route.departureTime,
        arrivalTime: route.arrivalTime,
        travelDurationMinutes: route.durationMinutes,
        nearestStop: route.nearestStop,
        route: route.legs,
        notificationScheduledAt: null,
        notificationId: null,
      };
    } catch (error) {
      if (error instanceof RouteCalculationError) {
        // Use fallback reminder without route info
        reminder = createFallbackReminder(assignment, userLocation, bufferMinutes);
      } else {
        throw error;
      }
    }
  } else {
    // OJP not configured, use fallback
    reminder = createFallbackReminder(assignment, userLocation, bufferMinutes);
  }

  // Store reminder
  departureRemindersStore.upsertReminder(reminder);

  // Schedule notification if not already scheduled
  if (!reminder.notificationId) {
    const notificationId = await scheduleReminderNotification(reminder, bufferMinutes);
    if (notificationId) {
      departureRemindersStore.upsertReminder({
        ...reminder,
        notificationId,
        notificationScheduledAt: new Date().toISOString(),
      });
    }
  }
}

/**
 * Create a fallback reminder without route information.
 */
function createFallbackReminder(
  assignment: UpcomingAssignment,
  userLocation: Coordinates,
  bufferMinutes: number
): DepartureReminder {
  const gameTime = new Date(assignment.gameTime);
  // Use fallback travel time estimate when route calculation is unavailable
  const estimatedTravelMinutes = FALLBACK_TRAVEL_ESTIMATE_MINUTES;
  const departureTime = new Date(gameTime.getTime() - (estimatedTravelMinutes + bufferMinutes) * 60 * 1000);

  return {
    assignmentId: assignment.id,
    userLocation,
    venueLocation: assignment.venueLocation,
    venueName: assignment.venueName,
    calculatedAt: new Date().toISOString(),
    departureTime: departureTime.toISOString(),
    arrivalTime: gameTime.toISOString(),
    travelDurationMinutes: estimatedTravelMinutes,
    nearestStop: {
      name: 'Unknown',
      distanceMeters: 0,
      walkTimeMinutes: 0,
    },
    route: [],
    notificationScheduledAt: null,
    notificationId: null,
  };
}

/**
 * Schedule time-based reminders when location is unavailable.
 */
async function scheduleTimeBasedReminders(): Promise<void> {
  if (!assignmentProvider) return;

  const settings = await departureReminderSettingsStore.loadSettings(storage);
  const assignments = await assignmentProvider.getUpcomingAssignments(LOOKAHEAD_WINDOW_MS);

  for (const assignment of assignments) {
    const existing = departureRemindersStore.getReminder(assignment.id);
    if (existing?.notificationId) continue; // Already scheduled

    const fallbackLocation: Coordinates = { latitude: 0, longitude: 0 };
    const reminder = createFallbackReminder(
      assignment,
      fallbackLocation,
      settings.bufferMinutes
    );

    departureRemindersStore.upsertReminder(reminder);

    const notificationId = await scheduleReminderNotification(reminder, settings.bufferMinutes);
    if (notificationId) {
      departureRemindersStore.upsertReminder({
        ...reminder,
        notificationId,
        notificationScheduledAt: new Date().toISOString(),
      });
    }
  }
}

/**
 * Handle clustered assignments for consolidated notifications.
 */
export async function processClusteredAssignments(
  assignments: UpcomingAssignment[],
  userLocation: Coordinates
): Promise<VenueCluster[]> {
  const assignmentsWithVenue: AssignmentWithVenue[] = assignments.map((a) => ({
    id: a.id,
    venueName: a.venueName,
    venueLocation: a.venueLocation,
    gameTime: a.gameTime,
  }));

  return clusterNearbyVenues(assignmentsWithVenue);
}
