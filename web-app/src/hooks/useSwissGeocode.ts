import { useState, useCallback, useRef } from "react";

export interface SwissGeocodedLocation {
  /** Unique identifier from geo.admin.ch */
  id: number;
  /** Latitude in WGS84 */
  latitude: number;
  /** Longitude in WGS84 */
  longitude: number;
  /** Swiss LV95 X coordinate (easting) */
  lv95X: number;
  /** Swiss LV95 Y coordinate (northing) */
  lv95Y: number;
  /** Display label (may contain HTML) */
  label: string;
  /** Plain text detail */
  detail: string;
  /** Origin type: address, zipcode, district, canton, gazetteer, parcel */
  origin: string;
}

export interface SwissGeocodeState {
  /** List of geocoded location results */
  results: SwissGeocodedLocation[];
  /** Whether a geocoding request is in progress */
  isLoading: boolean;
  /** Error message if geocoding failed */
  error: string | null;
}

export interface UseSwissGeocodeResult extends SwissGeocodeState {
  /** Search for locations matching the given address query */
  search: (query: string) => void;
  /** Clear results and error */
  clear: () => void;
}

interface UseSwissGeocodeOptions {
  /** Filter by origin types (default: all types) */
  origins?: SwissGeocodeOrigin[];
  /** Maximum number of results to return (default: 5, max: 50) */
  limit?: number;
}

export type SwissGeocodeOrigin =
  | "address"
  | "zipcode"
  | "district"
  | "canton"
  | "gazetteer"
  | "parcel";

const GEOADMIN_API_URL =
  "https://api3.geo.admin.ch/rest/services/api/SearchServer";
const DEFAULT_LIMIT = 5;
const MIN_QUERY_LENGTH = 3;

/**
 * Hook for geocoding Swiss addresses using the geo.admin.ch API.
 *
 * This is the official Swiss federal geoportal API, providing high-accuracy
 * geocoding for Swiss addresses with both WGS84 and Swiss LV95 coordinates.
 *
 * Rate limit: 20 requests/minute (fair use policy).
 * Use debouncing when calling search() from user input.
 *
 * No registration or API key required.
 *
 * @example
 * ```tsx
 * function AddressSearch() {
 *   const { results, isLoading, error, search, clear } = useSwissGeocode();
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
 *         <div key={r.id}>{r.detail}</div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useSwissGeocode(
  options: UseSwissGeocodeOptions = {},
): UseSwissGeocodeResult {
  const { origins, limit = DEFAULT_LIMIT } = options;

  const [state, setState] = useState<SwissGeocodeState>({
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
          searchText: query,
          type: "locations",
          limit: String(Math.min(limit, 50)),
        });

        // Add origins filter if specified
        if (origins && origins.length > 0) {
          params.set("origins", origins.join(","));
        }

        const response = await fetch(`${GEOADMIN_API_URL}?${params}`, {
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data: GeoAdminSearchResponse = await response.json();

        setState({
          results: data.results.map((item) => ({
            id: item.id,
            latitude: item.attrs.lat,
            longitude: item.attrs.lon,
            lv95X: item.attrs.x,
            lv95Y: item.attrs.y,
            label: item.attrs.label,
            detail: item.attrs.detail,
            origin: item.attrs.origin,
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
    [origins, limit],
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
    featureId?: string;
    layerBodId?: string;
    geom_quadindex?: string;
    geom_st_box2d?: string;
    objectclass?: string;
  };
}
