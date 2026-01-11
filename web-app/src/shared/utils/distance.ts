/**
 * Distance conversion and calculation utilities.
 *
 * Includes:
 * - Unit conversions (metres <-> kilometres)
 * - Haversine formula for straight-line distance between coordinates
 * - Formatting utilities
 */

/** Number of metres in one kilometre */
export const METRES_PER_KILOMETRE = 1000

/** Earth's radius in metres for Haversine calculation */
const EARTH_RADIUS_METRES = 6_371_000

/**
 * Geographic coordinates for distance calculations.
 */
export interface Coordinates {
  latitude: number
  longitude: number
}

/** Number of decimal places to display for distance values */
export const DISTANCE_DISPLAY_PRECISION = 1

/**
 * HTML input pattern for decimal numbers.
 * Accepts digits with optional single decimal separator (period or comma).
 */
export const DECIMAL_INPUT_PATTERN = '[0-9]*[.,]?[0-9]*'

/**
 * Converts metres to kilometres.
 */
export function metresToKilometres(metres: number): number {
  return metres / METRES_PER_KILOMETRE
}

/**
 * Converts kilometres to metres.
 */
export function kilometresToMetres(kilometres: number): number {
  return kilometres * METRES_PER_KILOMETRE
}

/**
 * Formats a distance in metres as a human-readable kilometre string.
 * @param metres - Distance in metres
 * @returns Formatted string like "48.0"
 */
export function formatDistanceKm(metres: number): string {
  return metresToKilometres(metres).toFixed(DISTANCE_DISPLAY_PRECISION)
}

/**
 * Parses a localized number string that may use either "." or "," as decimal separator.
 * Always normalizes to use "." before parsing.
 *
 * Note: This simple replacement doesn't handle thousands separators (e.g., "1.234,56"
 * in German format). This is acceptable for single decimal values like distance in km.
 *
 * @param value - String value that may contain "," or "." as decimal separator
 * @returns Parsed number, or NaN if invalid
 */
export function parseLocalizedNumber(value: string): number {
  const normalized = value.replace(',', '.')
  return parseFloat(normalized)
}

/** Degrees in a half circle (for radians conversion) */
const DEGREES_PER_HALF_CIRCLE = 180

/**
 * Converts degrees to radians.
 */
function degreesToRadians(degrees: number): number {
  return degrees * (Math.PI / DEGREES_PER_HALF_CIRCLE)
}

/**
 * Calculates the straight-line distance between two geographic points using the Haversine formula.
 *
 * The Haversine formula determines the great-circle distance between two points on a sphere
 * given their longitudes and latitudes. This is an approximation as Earth is not a perfect
 * sphere, but is accurate enough for distances relevant to volleyball game filtering
 * (typical error < 0.5% for distances under 100km).
 *
 * @param from - Starting coordinates
 * @param to - Destination coordinates
 * @returns Distance in metres
 *
 * @example
 * ```ts
 * const zurich = { latitude: 47.3769, longitude: 8.5417 };
 * const bern = { latitude: 46.9480, longitude: 7.4474 };
 * const distance = calculateHaversineDistance(zurich, bern);
 * // Returns approximately 95,400 metres (95.4 km)
 * ```
 */
export function calculateHaversineDistance(from: Coordinates, to: Coordinates): number {
  const lat1Rad = degreesToRadians(from.latitude)
  const lat2Rad = degreesToRadians(to.latitude)
  const deltaLat = degreesToRadians(to.latitude - from.latitude)
  const deltaLon = degreesToRadians(to.longitude - from.longitude)

  // Haversine formula
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return EARTH_RADIUS_METRES * c
}

/**
 * Calculates straight-line distance and returns it in kilometres.
 *
 * Convenience wrapper around calculateHaversineDistance for common use cases.
 *
 * @param from - Starting coordinates
 * @param to - Destination coordinates
 * @returns Distance in kilometres
 */
export function calculateDistanceKm(from: Coordinates, to: Coordinates): number {
  return metresToKilometres(calculateHaversineDistance(from, to))
}

/**
 * Multiplier to estimate road distance from straight-line distance.
 *
 * Empirically validated against 30 routes from 3 Swiss origins using routing.osm.ch:
 * - Bern origin: 1.40x average (range 1.19x - 1.70x)
 * - Zurich origin: 1.25x average (range 1.12x - 1.37x)
 * - Lausanne origin: 1.41x average (range 1.29x - 1.58x)
 *
 * Overall average: 1.35x | Typical routes (<1.5x): 1.31x (26 of 30 routes)
 * The 1.33x multiplier provides ~±10% accuracy for most Swiss volleyball venues.
 */
export const ROAD_DISTANCE_MULTIPLIER = 1.33

/**
 * Estimates the driving distance between two points based on straight-line distance.
 *
 * Uses a multiplier to approximate road distance from the Haversine (straight-line)
 * distance. This provides a reasonable estimate without requiring an external
 * routing API.
 *
 * @param from - Starting coordinates
 * @param to - Destination coordinates
 * @returns Estimated driving distance in kilometres
 *
 * @example
 * ```ts
 * const zurich = { latitude: 47.3769, longitude: 8.5417 };
 * const bern = { latitude: 46.9480, longitude: 7.4474 };
 * const carDistance = calculateCarDistanceKm(zurich, bern);
 * // Returns approximately 126.9 km (95.4 km * 1.33)
 * ```
 */
export function calculateCarDistanceKm(from: Coordinates, to: Coordinates): number {
  const straightLineKm = calculateDistanceKm(from, to)
  return straightLineKm * ROAD_DISTANCE_MULTIPLIER
}
