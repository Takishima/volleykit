import { useState, useCallback, useRef } from "react";

export interface GeolocationState {
  /** Current position coordinates, null if not yet obtained */
  position: { latitude: number; longitude: number } | null;
  /** Whether a location request is in progress */
  isLoading: boolean;
  /** Error message if geolocation failed */
  error: string | null;
  /** Whether the browser supports geolocation */
  isSupported: boolean;
}

export interface UseGeolocationResult extends GeolocationState {
  /** Request the user's current location */
  requestLocation: () => void;
  /** Clear the current position and error */
  clear: () => void;
}

interface UseGeolocationOptions {
  /** Timeout in milliseconds for location request (default: 10000) */
  timeout?: number;
  /** Whether to enable high accuracy mode (default: false) */
  enableHighAccuracy?: boolean;
  /** Maximum age in milliseconds of cached position (default: 60000) */
  maximumAge?: number;
  /** Callback when location is successfully obtained */
  onSuccess?: (position: { latitude: number; longitude: number }) => void;
}

const DEFAULT_TIMEOUT = 10000;
const DEFAULT_MAXIMUM_AGE = 60000;

/**
 * Hook for accessing the browser's Geolocation API.
 *
 * Provides a simple interface for requesting the user's current location
 * with proper loading states and error handling.
 *
 * @example
 * ```tsx
 * function LocationButton() {
 *   const { position, isLoading, error, requestLocation, isSupported } = useGeolocation();
 *
 *   if (!isSupported) {
 *     return <p>Geolocation not supported</p>;
 *   }
 *
 *   return (
 *     <button onClick={requestLocation} disabled={isLoading}>
 *       {isLoading ? "Getting location..." : "Use my location"}
 *     </button>
 *   );
 * }
 * ```
 */
export function useGeolocation(
  options: UseGeolocationOptions = {},
): UseGeolocationResult {
  const {
    timeout = DEFAULT_TIMEOUT,
    enableHighAccuracy = false,
    maximumAge = DEFAULT_MAXIMUM_AGE,
    onSuccess,
  } = options;

  // Store onSuccess in a ref to avoid recreating requestLocation on every callback change
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const [state, setState] = useState<GeolocationState>(() => ({
    position: null,
    isLoading: false,
    error: null,
    isSupported: typeof navigator !== "undefined" && "geolocation" in navigator,
  }));

  // Note: In React 18+, setState on unmounted components is a no-op,
  // so isMountedRef pattern is not needed for the geolocation callbacks.

  const requestLocation = useCallback(() => {
    if (!state.isSupported) {
      setState((prev) => ({
        ...prev,
        error: "Geolocation is not supported by this browser",
      }));
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const position = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
        setState((prev) => ({
          ...prev,
          position,
          isLoading: false,
          error: null,
        }));
        // Call onSuccess callback if provided
        onSuccessRef.current?.(position);
      },
      (err) => {
        let errorMessage: string;
        switch (err.code) {
          case err.PERMISSION_DENIED:
            errorMessage = "permission_denied";
            break;
          case err.POSITION_UNAVAILABLE:
            errorMessage = "position_unavailable";
            break;
          case err.TIMEOUT:
            errorMessage = "timeout";
            break;
          default:
            errorMessage = "unknown_error";
        }
        setState((prev) => ({
          ...prev,
          position: null,
          isLoading: false,
          error: errorMessage,
        }));
      },
      {
        enableHighAccuracy,
        timeout,
        maximumAge,
      },
    );
  }, [state.isSupported, enableHighAccuracy, timeout, maximumAge]);

  const clear = useCallback(() => {
    setState((prev) => ({
      ...prev,
      position: null,
      error: null,
    }));
  }, []);

  return {
    ...state,
    requestLocation,
    clear,
  };
}
