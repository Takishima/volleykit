// Public API for assignments feature
export { AssignmentsPage } from './AssignmentsPage'

// Hooks
export {
  useAssignments,
  useUpcomingAssignments,
  usePastAssignments,
  useValidationClosedAssignments,
} from './hooks/useAssignments'
export { useAssignmentActions } from './hooks/useAssignmentActions'
export { useCalendarAssignments, type CalendarAssignment } from './hooks/useCalendarAssignments'
export { useCalendarTheme } from './hooks/useCalendarTheme'
export { useCalendarConflicts, useAssignmentConflicts } from './hooks/useCalendarConflicts'

// Utils
export {
  hasMinimumGapFromAssignments,
  DEFAULT_SAME_LOCATION_DISTANCE_KM,
} from './utils/conflict-detection'

// API
export { calendarApi } from './api/calendar-client'
export { fetchCalendarAssignments } from './api/calendar-api'

// Components
export { AssignmentCard } from './components/AssignmentCard'
export { CalendarErrorHandler } from './components/CalendarErrorHandler'

// Tour
export { assignmentsTour } from './assignments'
