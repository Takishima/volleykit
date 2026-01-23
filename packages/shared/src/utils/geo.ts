/**
 * Geographic utility functions
 *
 * Used for venue proximity detection in Smart Departure Reminder feature
 */

export interface Coordinates {
  lat: number
  lng: number
}

/**
 * Calculate the distance between two points using the Haversine formula
 *
 * @param point1 - First coordinate (lat, lng)
 * @param point2 - Second coordinate (lat, lng)
 * @returns Distance in meters
 */
export const haversineDistance = (point1: Coordinates, point2: Coordinates): number => {
  const R = 6371000 // Earth's radius in meters

  const toRadians = (degrees: number): number => degrees * (Math.PI / 180)

  const lat1Rad = toRadians(point1.lat)
  const lat2Rad = toRadians(point2.lat)
  const deltaLat = toRadians(point2.lat - point1.lat)
  const deltaLng = toRadians(point2.lng - point1.lng)

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

/**
 * Check if a point is within a certain distance of another point
 *
 * @param point1 - First coordinate
 * @param point2 - Second coordinate
 * @param thresholdMeters - Distance threshold in meters (default 500m per FR-024)
 * @returns true if within threshold
 */
export const isWithinDistance = (
  point1: Coordinates,
  point2: Coordinates,
  thresholdMeters = 500
): boolean => {
  return haversineDistance(point1, point2) <= thresholdMeters
}

/**
 * Default venue proximity threshold in meters (per spec FR-024)
 */
export const VENUE_PROXIMITY_THRESHOLD_METERS = 500
