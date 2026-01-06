/**
 * Utilities for extracting geographic coordinates from various sources.
 *
 * Supports:
 * - Direct latitude/longitude values
 * - Plus Code (Open Location Code) decoding as fallback
 *
 * Note: Uses the `pluscodes` package for Plus Code decoding. This package
 * was chosen for its small size (~0.4 KB gzipped), zero dependencies, and
 * TypeScript support. Alternative: `open-location-code` (Google's official
 * library) has similar features but slightly larger bundle impact.
 */

import { decode as decodePlusCode } from "pluscodes";
import type { components } from "@/api/schema";
import type { Coordinates } from "./distance";

/**
 * Geographic location data from the API schema.
 * Using the schema type ensures this stays in sync with API changes.
 */
type GeographicalLocation = components["schemas"]["GeographicalLocation"];

/**
 * Extracts coordinates from a geographical location object.
 *
 * Priority:
 * 1. Use direct latitude/longitude if both are present
 * 2. Decode Plus Code if available and lat/lon are missing
 *
 * @param geoLocation - Geographic location object from the API
 * @returns Coordinates object or null if no location can be determined
 *
 * @example
 * ```ts
 * // With direct coordinates
 * extractCoordinates({ latitude: 47.3769, longitude: 8.5417 })
 * // Returns { latitude: 47.3769, longitude: 8.5417 }
 *
 * // With Plus Code only
 * extractCoordinates({ plusCode: "8FV9HMQ5+F5" })
 * // Returns { latitude: 47.xxx, longitude: 7.xxx }
 *
 * // With no location data
 * extractCoordinates({ })
 * // Returns null
 * ```
 */
export function extractCoordinates(
  geoLocation: GeographicalLocation | null | undefined,
): Coordinates | null {
  if (!geoLocation) return null;

  // Priority 1: Use direct coordinates if available
  if (geoLocation.latitude != null && geoLocation.longitude != null) {
    return {
      latitude: geoLocation.latitude,
      longitude: geoLocation.longitude,
    };
  }

  // Priority 2: Decode Plus Code as fallback
  if (geoLocation.plusCode) {
    const decoded = decodePlusCode(geoLocation.plusCode);
    if (decoded) {
      return {
        latitude: decoded.latitude,
        longitude: decoded.longitude,
      };
    }
  }

  return null;
}
