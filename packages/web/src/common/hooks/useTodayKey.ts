import { useSyncExternalStore } from 'react'

import { format } from 'date-fns'

const DATE_KEY_FORMAT = 'yyyy-MM-dd'

/** Formats a date as a YYYY-MM-DD key in local time. */
export function formatDateKey(date: Date): string {
  return format(date, DATE_KEY_FORMAT)
}

const readTodayKey = () => formatDateKey(new Date())

/** The clock never notifies; the key is simply re-read on every render. */
const subscribeToClock = () => () => {}

/**
 * Today's date as a YYYY-MM-DD key, read from the clock as an external value.
 * It is stable within a day, so it is safe in memo and query-key dependencies,
 * and rolls over once the component renders again after midnight.
 */
export function useTodayKey(): string {
  return useSyncExternalStore(subscribeToClock, readTodayKey, readTodayKey)
}
