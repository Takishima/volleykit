/**
 * Re-export from common/services/calendar for backward compatibility.
 * Calendar helpers were moved to common/ since they're consumed by the auth
 * feature (LoginPage) and the core API layer, not just assignments.
 */
export {
  extractCalendarCode,
  validateCalendarCode,
  mapCalendarAssignmentToAssignment,
  extractCityFromAddress,
  type CalendarValidationResult,
} from '@/common/services/calendar/calendar-helpers'
