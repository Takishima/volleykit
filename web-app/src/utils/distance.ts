/**
 * Distance conversion utilities for compensation calculations.
 */

/** Number of metres in one kilometre */
export const METRES_PER_KILOMETRE = 1000;

/** Number of decimal places to display for distance values */
export const DISTANCE_DISPLAY_PRECISION = 1;

/**
 * Converts metres to kilometres.
 */
export function metresToKilometres(metres: number): number {
  return metres / METRES_PER_KILOMETRE;
}

/**
 * Converts kilometres to metres.
 */
export function kilometresToMetres(kilometres: number): number {
  return kilometres * METRES_PER_KILOMETRE;
}

/**
 * Formats a distance in metres as a human-readable kilometre string.
 * @param metres - Distance in metres
 * @returns Formatted string like "48.0"
 */
export function formatDistanceKm(metres: number): string {
  return metresToKilometres(metres).toFixed(DISTANCE_DISPLAY_PRECISION);
}
