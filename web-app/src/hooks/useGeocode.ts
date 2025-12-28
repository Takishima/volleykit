import { useState, useCallback, useRef } from "react";

export interface GeocodedLocation {
  /** Unique identifier from Nominatim */
  placeId: number;
  latitude: number;
  longitude: number;
  displayName: string;
}

export interface GeocodeState {
  /** List of geocoded location results */
  results: GeocodedLocation[];
  /** Whether a geocoding request is in progress */
  isLoading: boolean;
  /** Error message if geocoding failed */
  error: string | null;
}

export interface UseGeocodeResult extends GeocodeState {
  /** Search for locations matching the given address query */
  search: (query: string) => void;
  /** Clear results and error */
  clear: () => void;
}

interface UseGeocodeOptions {
  /** Limit results to this country code (default: "ch" for Switzerland) */
  countryCode?: string;
  /** Maximum number of results to return (default: 5) */
  limit?: number;
}

const NOMINATIM_API_URL = "https://nominatim.openstreetmap.org/search";
const DEFAULT_COUNTRY_CODE = "ch";
const DEFAULT_LIMIT = 5;
const MIN_QUERY_LENGTH = 3;

/**
 * Hook for geocoding addresses using the OpenStreetMap Nominatim API.
 *
 * Converts human-readable addresses into geographic coordinates.
 * Default configuration is optimized for Swiss addresses.
 *
 * Rate limit: Nominatim has a 1 request/second limit.
 * Use debouncing when calling search() from user input.
 *
 * @example
 * ```tsx
 * function AddressSearch() {
 *   const { results, isLoading, error, search, clear } = useGeocode();
 *   const [query, setQuery] = useState("");
 *   const debouncedQuery = useDebouncedValue(query, 500);
 *
 *   useEffect(() => {
 *     if (debouncedQuery.length >= 3) {
 *       search(debouncedQuery);
 *     } else {
 *       clear();
 *     }
 *   }, [debouncedQuery, search, clear]);
 *
 *   return (
 *     <div>
 *       <input value={query} onChange={(e) => setQuery(e.target.value)} />
 *       {isLoading && <p>Searching...</p>}
 *       {results.map((r) => (
 *         <div key={`${r.latitude}-${r.longitude}`}>{r.displayName}</div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useGeocode(options: UseGeocodeOptions = {}): UseGeocodeResult {
  const {
    countryCode = DEFAULT_COUNTRY_CODE,
    limit = DEFAULT_LIMIT,
  } = options;

  const [state, setState] = useState<GeocodeState>({
    results: [],
    isLoading: false,
    error: null,
  });

  // AbortController for cancelling pending requests
  const abortControllerRef = useRef<AbortController | null>(null);

  const search = useCallback(
    async (query: string) => {
      // Skip empty or too short queries
      if (query.trim().length < MIN_QUERY_LENGTH) {
        setState({ results: [], isLoading: false, error: null });
        return;
      }

      // Cancel previous request if still pending
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const params = new URLSearchParams({
          q: query,
          format: "json",
          countrycodes: countryCode,
          limit: String(limit),
          addressdetails: "1",
        });

        const response = await fetch(`${NOMINATIM_API_URL}?${params}`, {
          signal: abortControllerRef.current.signal,
          headers: {
            // Nominatim requires a user agent
            "User-Agent": "VolleyKit/1.0",
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data: NominatimResult[] = await response.json();

        // AbortController prevents this from running if aborted
        setState({
          results: data.map((item) => ({
            placeId: item.place_id,
            latitude: parseFloat(item.lat),
            longitude: parseFloat(item.lon),
            displayName: formatSwissAddress(item),
          })),
          isLoading: false,
          error: null,
        });
      } catch (err) {
        // Ignore abort errors (expected when cancelling requests)
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }

        setState((prev) => ({
          ...prev,
          results: [],
          isLoading: false,
          error: "geocode_failed",
        }));
      }
    },
    [countryCode, limit],
  );

  const clear = useCallback(() => {
    abortControllerRef.current?.abort();
    setState({ results: [], isLoading: false, error: null });
  }, []);

  return {
    ...state,
    search,
    clear,
  };
}

/** Nominatim address details structure */
interface NominatimAddress {
  house_number?: string;
  road?: string;
  pedestrian?: string;
  footway?: string;
  neighbourhood?: string;
  suburb?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  state?: string;
  postcode?: string;
  country?: string;
}

/** Nominatim API response item */
interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  place_id: number;
  type: string;
  class: string;
  address?: NominatimAddress;
}

/**
 * Format a Nominatim address into Swiss SBB format.
 * Swiss format: "{postalCode} {city}, {street} {houseNumber}"
 * Example: "1009 Pully, Avenue des Roses 31"
 *
 * Falls back to display_name if structured address data is insufficient.
 */
function formatSwissAddress(result: NominatimResult): string {
  const address = result.address;

  if (!address) {
    return result.display_name;
  }

  const houseNumber = address.house_number;
  const street = address.road ?? address.pedestrian ?? address.footway;
  const city = address.city ?? address.town ?? address.village ?? address.municipality;
  const postcode = address.postcode;

  // Need at least city and postcode for Swiss format
  if (!city || !postcode) {
    return result.display_name;
  }

  // Build the formatted address
  const locationPart = `${postcode} ${city}`;

  if (street) {
    const streetPart = houseNumber ? `${street} ${houseNumber}` : street;
    return `${locationPart}, ${streetPart}`;
  }

  return locationPart;
}
