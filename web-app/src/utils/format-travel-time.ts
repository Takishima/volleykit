/** Minutes in one hour */
const MINUTES_PER_HOUR = 60;

/**
 * Formats travel time in minutes to a display string.
 * @param minutes - Travel time in minutes
 * @param units - Unit labels for display
 * @param prefix - Optional prefix (e.g., "≤" for "less than or equal")
 * @returns Formatted string like "≤45min" or "≤1h 30min"
 */
export function formatTravelTime(
  minutes: number,
  units: { minutesUnit: string; hoursUnit: string },
  prefix = "",
): string {
  if (minutes < MINUTES_PER_HOUR) {
    return `${prefix}${minutes}${units.minutesUnit}`;
  }
  const hours = Math.floor(minutes / MINUTES_PER_HOUR);
  const mins = minutes % MINUTES_PER_HOUR;
  if (mins === 0) {
    return `${prefix}${hours}${units.hoursUnit}`;
  }
  return `${prefix}${hours}${units.hoursUnit} ${mins}${units.minutesUnit}`;
}
