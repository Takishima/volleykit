/**
 * Departure Reminder types
 *
 * Types for the Smart Departure Reminder feature.
 */

/**
 * Location coordinates.
 */
export interface Coordinates {
  latitude: number
  longitude: number
}

/**
 * Information about a transit stop.
 */
export interface StopInfo {
  /** Stop name (e.g., "Hauptbahnhof") */
  name: string
  /** Distance from user in meters */
  distanceMeters: number
  /** Walking time to stop in minutes */
  walkTimeMinutes: number
}

/**
 * A leg of a transit trip.
 */
export interface TripLeg {
  /** Transport mode (bus, train, tram, walk) */
  mode: 'bus' | 'train' | 'tram' | 'walk' | 'metro' | 'ferry'
  /** Line number (e.g., "31", "S3") - null for walking */
  line: string | null
  /** Direction/terminus - null for walking */
  direction: string | null
  /** Departure time from this leg */
  departureTime: string
  /** Arrival time at next point */
  arrivalTime: string
  /** Departure stop name */
  fromStop: string
  /** Arrival stop name */
  toStop: string
}

/**
 * Complete route calculation result.
 */
export interface RouteResult {
  /** Total travel duration in minutes */
  durationMinutes: number
  /** When user should leave */
  departureTime: string
  /** When user will arrive */
  arrivalTime: string
  /** Walking time to first stop */
  walkTimeMinutes: number
  /** Nearest transit stop */
  nearestStop: StopInfo
  /** Full route legs */
  legs: TripLeg[]
  /** Whether route is cached */
  isCached: boolean
  /** Cache timestamp if cached */
  cachedAt?: string
}

/**
 * Computed departure reminder with route information.
 */
export interface DepartureReminder {
  /** Related assignment ID */
  assignmentId: string
  /** User's current location */
  userLocation: Coordinates
  /** Destination venue coordinates */
  venueLocation: Coordinates
  /** Venue name */
  venueName: string
  /** When route was calculated */
  calculatedAt: string
  /** When user should leave */
  departureTime: string
  /** Expected arrival at venue */
  arrivalTime: string
  /** Total travel time in minutes */
  travelDurationMinutes: number
  /** Closest transit stop to user */
  nearestStop: StopInfo
  /** Transit route details */
  route: TripLeg[]
  /** When notification was scheduled */
  notificationScheduledAt: string | null
  /** Expo notification identifier */
  notificationId: string | null
}

/**
 * Group of nearby venues for consolidated notifications.
 */
export interface VenueCluster {
  /** Grouped assignment IDs */
  assignmentIds: string[]
  /** Center point of cluster */
  centroid: Coordinates
  /** Names of venues in cluster */
  venueNames: string[]
  /** Earliest game time in cluster */
  earliestGameTime: string
}

/**
 * User preferences for smart departure reminders.
 */
export interface DepartureReminderSettings {
  /** Feature toggle */
  enabled: boolean
  /** Minutes before departure to notify (5/10/15/20/30) */
  bufferMinutes: 5 | 10 | 15 | 20 | 30
  /** Threshold for "near venue" in meters */
  venueProximityMeters: number
}

/**
 * Default departure reminder settings.
 */
export const DEFAULT_DEPARTURE_REMINDER_SETTINGS: DepartureReminderSettings = {
  enabled: false,
  bufferMinutes: 15,
  venueProximityMeters: 500,
}

/**
 * Buffer time options in minutes.
 */
export const BUFFER_TIME_OPTIONS = [5, 10, 15, 20, 30] as const
export type BufferTimeOption = (typeof BUFFER_TIME_OPTIONS)[number]
