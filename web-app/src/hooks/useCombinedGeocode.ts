import { useState, useCallback, useRef } from "react";

/**
 * Swiss-specific location data from geo.admin.ch.
 */
export interface SwissLocationData {
  /** Swiss LV95 X coordinate (easting) */
  lv95X: number;
  /** Swiss LV95 Y coordinate (northing) */
  lv95Y: number;
  /** geo.admin.ch feature ID */
  featureId: number;
}

/**
 * Unified geocoded location result that works with both
 * geo.admin.ch (Swiss) and Nominatim (OpenStreetMap) APIs.
 */
export interface GeocodedLocation {
  /** Unique identifier */
  id: number;
  /** Latitude in WGS84 */
  latitude: number;
  /** Longitude in WGS84 */
  longitude: number;
  /** Display name for the location */
  displayName: string;
  /** Source of the result */
  source: "swiss" | "nominatim";
  /** Swiss-specific data (only present for geo.admin.ch results) */
  swissData?: SwissLocationData;
}

export interface CombinedGeocodeState {
  /** List of geocoded location results */
  results: GeocodedLocation[];
  /** Whether a geocoding request is in progress */
  isLoading: boolean;
  /** Error message if geocoding failed */
  error: string | null;
}

export interface UseCombinedGeocodeResult extends CombinedGeocodeState {
  /** Search for locations matching the given address query */
  search: (query: string) => void;
  /** Clear results and error */
  clear: () => void;
}

interface UseCombinedGeocodeOptions {
  /** Maximum number of results to return (default: 5, max: 50) */
  limit?: number;
}

const GEOADMIN_API_URL =
  "https://api3.geo.admin.ch/rest/services/api/SearchServer";
const NOMINATIM_API_URL = "https://nominatim.openstreetmap.org/search";
const DEFAULT_LIMIT = 5;
const MIN_QUERY_LENGTH = 3;

/**
 * Hook for geocoding addresses with Swiss priority and Nominatim fallback.
 *
 * Strategy:
 * 1. First tries geo.admin.ch (official Swiss federal data, high accuracy)
 * 2. Falls back to Nominatim (OpenStreetMap) if no Swiss results found
 *
 * Rate limits:
 * - geo.admin.ch: 20 requests/minute (fair use)
 * - Nominatim: 1 request/second
 *
 * Use debouncing (500ms+) when calling search() from user input.
 *
 * @example
 * ```tsx
 * function AddressSearch() {
 *   const { results, isLoading, error, search, clear } = useCombinedGeocode();
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
 *       {results.map((r) => (
 *         <div key={r.id}>{r.displayName}</div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useCombinedGeocode(
  options: UseCombinedGeocodeOptions = {},
): UseCombinedGeocodeResult {
  const { limit = DEFAULT_LIMIT } = options;

  const [state, setState] = useState<CombinedGeocodeState>({
    results: [],
    isLoading: false,
    error: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const search = useCallback(
    async (query: string) => {
      if (query.trim().length < MIN_QUERY_LENGTH) {
        setState({ results: [], isLoading: false, error: null });
        return;
      }

      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        // Try Swiss geocoding first (geo.admin.ch)
        let swissResults: GeocodedLocation[] = [];
        try {
          swissResults = await searchSwiss(query, limit, signal);
        } catch (swissErr) {
          // If Swiss API fails, we'll fall through to Nominatim
          if (swissErr instanceof Error && swissErr.name === "AbortError") {
            throw swissErr; // Re-throw abort errors
          }
          // Otherwise continue to Nominatim fallback
        }

        if (swissResults.length > 0) {
          setState({
            results: swissResults,
            isLoading: false,
            error: null,
          });
          return;
        }

        // Fall back to Nominatim if no Swiss results or Swiss API failed
        const nominatimResults = await searchNominatim(query, limit, signal);

        setState({
          results: nominatimResults,
          isLoading: false,
          error: null,
        });
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }

        setState({
          results: [],
          isLoading: false,
          error: "geocode_failed",
        });
      }
    },
    [limit],
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

/**
 * Search using the Swiss geo.admin.ch API.
 */
async function searchSwiss(
  query: string,
  limit: number,
  signal: AbortSignal,
): Promise<GeocodedLocation[]> {
  const params = new URLSearchParams({
    searchText: query,
    type: "locations",
    origins: "address,zipcode",
    limit: String(Math.min(limit, 50)),
  });

  const response = await fetch(`${GEOADMIN_API_URL}?${params}`, { signal });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data: GeoAdminSearchResponse = await response.json();

  return data.results.map((item) => ({
    id: item.id,
    latitude: item.attrs.lat,
    longitude: item.attrs.lon,
    displayName: item.attrs.detail,
    source: "swiss" as const,
    swissData: {
      lv95X: item.attrs.x,
      lv95Y: item.attrs.y,
      featureId: item.id,
    },
  }));
}

/**
 * Search using the Nominatim (OpenStreetMap) API.
 */
async function searchNominatim(
  query: string,
  limit: number,
  signal: AbortSignal,
): Promise<GeocodedLocation[]> {
  const params = new URLSearchParams({
    q: query,
    format: "json",
    countrycodes: "ch",
    limit: String(limit),
    addressdetails: "1",
  });

  const response = await fetch(`${NOMINATIM_API_URL}?${params}`, {
    signal,
    headers: {
      "User-Agent": "VolleyKit/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data: NominatimResult[] = await response.json();

  return data.map((item) => ({
    id: item.place_id,
    latitude: parseFloat(item.lat),
    longitude: parseFloat(item.lon),
    displayName: item.display_name,
    source: "nominatim" as const,
  }));
}

/** geo.admin.ch SearchServer API response */
interface GeoAdminSearchResponse {
  results: GeoAdminResult[];
}

interface GeoAdminResult {
  id: number;
  weight: number;
  attrs: {
    origin: string;
    detail: string;
    label: string;
    lat: number;
    lon: number;
    x: number;
    y: number;
    rank: number;
    num: number;
    zoomlevel: number;
  };
}

/** Nominatim API response item */
interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  place_id: number;
  type: string;
  class: string;
}
