/**
 * Clock hooks - read the current time as an external value.
 *
 * `new Date()` inside render is impure, so these hooks expose the clock through
 * `useSyncExternalStore`. The clock never notifies; each value is simply re-read
 * on every render and only changes once its granularity boundary has passed, so
 * it is safe in memo and query-key dependencies.
 */

import { useSyncExternalStore } from 'react'

import { formatDateKey, MS_PER_MINUTE } from '../utils/date-helpers'

/** The clock never notifies; values are simply re-read on every render. */
const subscribeToClock = () => () => {}

const readTodayKey = () => formatDateKey(new Date())

/**
 * Today's date as a YYYY-MM-dd key in local time.
 * It is stable within a day and rolls over once the component renders again
 * after midnight.
 */
export function useTodayKey(): string {
  return useSyncExternalStore(subscribeToClock, readTodayKey, readTodayKey)
}

const readCurrentMinute = () => Math.floor(Date.now() / MS_PER_MINUTE) * MS_PER_MINUTE

/**
 * The current time as epoch milliseconds floored to the minute.
 * It is stable within a minute and advances once the component renders again
 * after a minute boundary has passed.
 */
export function useCurrentMinute(): number {
  return useSyncExternalStore(subscribeToClock, readCurrentMinute, readCurrentMinute)
}
