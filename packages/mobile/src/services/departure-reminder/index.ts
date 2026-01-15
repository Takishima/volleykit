/**
 * Departure reminder service exports.
 */

export {
  calculateRoute,
  clearRouteCache,
  getCacheStats,
  isOjpConfigured,
  RouteCalculationError,
} from './route-calculator';

export {
  isNearVenue,
  distanceToVenue,
  findNearbyVenues,
  clusterNearbyVenues,
  shouldSendDepartureNotification,
  type AssignmentWithVenue,
} from './venue-proximity';

export {
  DEPARTURE_REMINDER_TASK_NAME,
  defineBackgroundTask,
  isTaskRegistered,
  startBackgroundTask,
  stopBackgroundTask,
  runDepartureReminderCheck,
  registerAssignmentProvider,
  processClusteredAssignments,
  type UpcomingAssignment,
  type AssignmentProvider,
} from './background-task';

export {
  scheduleReminderNotification,
  scheduleClusteredNotification,
  cancelReminderNotification,
  cancelAllDepartureNotifications,
  registerTranslationFunction,
} from './notification-scheduler';

export {
  cleanupAssignmentReminder,
  cleanupPastReminders,
  cleanupAllReminders,
  onAppForeground,
  onFeatureDisabled,
  onUserLogout,
  verifyNoLocationHistory,
  schedulePeriodicCleanup,
  type CleanupOptions,
} from './cleanup';
