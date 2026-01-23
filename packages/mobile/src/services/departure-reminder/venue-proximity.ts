/**
 * Venue proximity detection service.
 *
 * Detects when user is near a venue and clusters nearby venues.
 */

import {
  haversineDistance,
  isWithinDistance,
  VENUE_PROXIMITY_THRESHOLD_METERS,
} from '@volleykit/shared/utils/geo'

import type { Coordinates, VenueCluster } from '../../types/departureReminder'

/**
 * Assignment with venue location for proximity checks.
 */
export interface AssignmentWithVenue {
  id: string
  venueName: string
  venueLocation: Coordinates
  gameTime: string
}

/**
 * Convert between coordinate formats.
 */
function toGeoCoordinates(coords: Coordinates): { lat: number; lng: number } {
  return { lat: coords.latitude, lng: coords.longitude }
}

/**
 * Check if user is near a specific venue.
 *
 * @param userLocation User's current coordinates
 * @param venueLocation Venue coordinates
 * @param thresholdMeters Optional custom threshold (default 500m per FR-024)
 * @returns true if within threshold
 */
export function isNearVenue(
  userLocation: Coordinates,
  venueLocation: Coordinates,
  thresholdMeters = VENUE_PROXIMITY_THRESHOLD_METERS
): boolean {
  return isWithinDistance(
    toGeoCoordinates(userLocation),
    toGeoCoordinates(venueLocation),
    thresholdMeters
  )
}

/**
 * Get the distance from user to a venue in meters.
 *
 * @param userLocation User's current coordinates
 * @param venueLocation Venue coordinates
 * @returns Distance in meters
 */
export function distanceToVenue(userLocation: Coordinates, venueLocation: Coordinates): number {
  return haversineDistance(toGeoCoordinates(userLocation), toGeoCoordinates(venueLocation))
}

/**
 * Check if user is near any of the given venues.
 *
 * @param userLocation User's current coordinates
 * @param venues List of venues to check
 * @param thresholdMeters Optional custom threshold
 * @returns List of venue IDs within threshold
 */
export function findNearbyVenues(
  userLocation: Coordinates,
  venues: AssignmentWithVenue[],
  thresholdMeters = VENUE_PROXIMITY_THRESHOLD_METERS
): string[] {
  return venues
    .filter((venue) => isNearVenue(userLocation, venue.venueLocation, thresholdMeters))
    .map((venue) => venue.id)
}

/**
 * Calculate centroid of a set of coordinates.
 */
function calculateCentroid(locations: Coordinates[]): Coordinates {
  if (locations.length === 0) {
    return { latitude: 0, longitude: 0 }
  }

  const sum = locations.reduce(
    (acc, loc) => ({
      latitude: acc.latitude + loc.latitude,
      longitude: acc.longitude + loc.longitude,
    }),
    { latitude: 0, longitude: 0 }
  )

  return {
    latitude: sum.latitude / locations.length,
    longitude: sum.longitude / locations.length,
  }
}

/**
 * Cluster nearby venues for consolidated notifications.
 *
 * Groups venues that are within the proximity threshold of each other.
 * Uses a simple clustering algorithm based on distance.
 *
 * @param assignments Assignments with venue locations
 * @param thresholdMeters Clustering threshold (default 500m)
 * @returns Array of venue clusters
 */
export function clusterNearbyVenues(
  assignments: AssignmentWithVenue[],
  thresholdMeters = VENUE_PROXIMITY_THRESHOLD_METERS
): VenueCluster[] {
  if (assignments.length === 0) return []
  if (assignments.length === 1) {
    const assignment = assignments[0]!
    return [
      {
        assignmentIds: [assignment.id],
        centroid: assignment.venueLocation,
        venueNames: [assignment.venueName],
        earliestGameTime: assignment.gameTime,
      },
    ]
  }

  // Track which assignments have been clustered
  const clustered = new Set<string>()
  const clusters: VenueCluster[] = []

  // Sort by game time to prioritize earlier games
  const sorted = [...assignments].sort(
    (a, b) => new Date(a.gameTime).getTime() - new Date(b.gameTime).getTime()
  )

  for (const assignment of sorted) {
    if (clustered.has(assignment.id)) continue

    // Start a new cluster with this assignment
    const clusterAssignments: AssignmentWithVenue[] = [assignment]
    clustered.add(assignment.id)

    // Find other unclustered assignments within threshold
    for (const other of sorted) {
      if (clustered.has(other.id)) continue

      // Check if close to any assignment in current cluster
      const isCloseToCluster = clusterAssignments.some((member) =>
        isWithinDistance(
          toGeoCoordinates(member.venueLocation),
          toGeoCoordinates(other.venueLocation),
          thresholdMeters
        )
      )

      if (isCloseToCluster) {
        clusterAssignments.push(other)
        clustered.add(other.id)
      }
    }

    // Create cluster from collected assignments
    const venueLocations = clusterAssignments.map((a) => a.venueLocation)
    const earliestTime = clusterAssignments.reduce(
      (earliest, a) => (a.gameTime < earliest ? a.gameTime : earliest),
      clusterAssignments[0]!.gameTime
    )

    clusters.push({
      assignmentIds: clusterAssignments.map((a) => a.id),
      centroid: calculateCentroid(venueLocations),
      venueNames: clusterAssignments.map((a) => a.venueName),
      earliestGameTime: earliestTime,
    })
  }

  return clusters
}

/**
 * Check if user should receive departure notification for an assignment.
 *
 * Returns false if user is already near the venue (per FR-024).
 *
 * @param userLocation User's current coordinates
 * @param venueLocation Venue coordinates
 * @param thresholdMeters Proximity threshold
 * @returns true if notification should be sent
 */
export function shouldSendDepartureNotification(
  userLocation: Coordinates,
  venueLocation: Coordinates,
  thresholdMeters = VENUE_PROXIMITY_THRESHOLD_METERS
): boolean {
  return !isNearVenue(userLocation, venueLocation, thresholdMeters)
}
