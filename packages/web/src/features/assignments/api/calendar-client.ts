/**
 * Re-export from common/services/calendar for backward compatibility.
 * The calendar client was moved to common/ since it's consumed by the core
 * API dispatcher (api/client.ts), not just the assignments feature.
 */
export {
  calendarApi,
  CalendarModeNotSupportedError,
  DEFAULT_REFEREE_EDIT_HOURS,
} from '@/common/services/calendar/calendar-client'
