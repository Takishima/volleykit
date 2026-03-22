// Public API for assignments feature
export { AssignmentsPage } from './AssignmentsPage'

// Hooks
export {
  useAssignments,
  useUpcomingAssignments,
  usePastAssignments,
  useValidationClosedAssignments,
  useAssignmentDetails,
  getDateRangeForPeriod,
  type DatePeriod,
} from './hooks/useAssignments'
export { useAssignmentActions } from './hooks/useAssignmentActions'
export { useCalendarAssignments, type CalendarAssignment } from './hooks/useCalendarAssignments'
export { useCalendarTheme } from './hooks/useCalendarTheme'
export { useCalendarConflicts } from './hooks/useCalendarConflicts'

// Components
export { AssignmentCard } from './components/AssignmentCard'
export { CalendarErrorHandler } from './components/CalendarErrorHandler'

// Conflict detection (shared with exchanges feature)
export {
  hasMinimumGapFromAssignments,
  DEFAULT_SAME_LOCATION_DISTANCE_KM,
} from './utils/conflict-detection'

// Tour
export { assignmentsTour } from './assignments'
