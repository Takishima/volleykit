/**
 * Utility functions for building maps URLs (Google Maps, iOS Maps, Android Geo).
 */

export interface PostalAddress {
  combinedAddress?: string;
  streetAndHouseNumber?: string;
  postalCodeAndCity?: string;
  city?: string;
  geographicalLocation?: {
    plusCode?: string;
    latitude?: number;
    longitude?: number;
  };
}

export interface MapsUrls {
  /** Google Maps URL using Plus Code (opens in browser) */
  googleMapsUrl: string | null;
  /** Platform-specific URL for native maps app (iOS maps: / Android geo:) */
  nativeMapsUrl: string | null;
  /** Full formatted address string */
  fullAddress: string | null;
}

/**
 * Build the full address string from postal address components.
 */
export function buildFullAddress(postalAddress: PostalAddress | null | undefined): string | null {
  if (!postalAddress) return null;

  return postalAddress.combinedAddress
    || (postalAddress.streetAndHouseNumber && postalAddress.postalCodeAndCity
      ? `${postalAddress.streetAndHouseNumber}, ${postalAddress.postalCodeAndCity}`
      : null);
}

/**
 * Build Google Maps URL from Plus Code.
 */
export function buildGoogleMapsUrl(plusCode: string | null | undefined): string | null {
  if (!plusCode) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(plusCode)}`;
}

/**
 * Build platform-specific native maps URL.
 * iOS uses maps: scheme, Android uses geo: URI.
 */
export function buildNativeMapsUrl(
  fullAddress: string | null,
  coords: { latitude: number; longitude: number } | null,
  hallName: string,
): string | null {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  if (fullAddress) {
    return isIOS
      ? `maps:?q=${encodeURIComponent(fullAddress)}`
      : `geo:0,0?q=${encodeURIComponent(fullAddress)}`;
  }

  if (coords) {
    const { latitude, longitude } = coords;
    return isIOS
      ? `maps:?q=${latitude},${longitude}&ll=${latitude},${longitude}`
      : `geo:${latitude},${longitude}?q=${latitude},${longitude}(${encodeURIComponent(hallName)})`;
  }

  return null;
}

/**
 * Build all maps URLs from postal address data.
 */
export function buildMapsUrls(
  postalAddress: PostalAddress | null | undefined,
  hallName: string,
): MapsUrls {
  const plusCode = postalAddress?.geographicalLocation?.plusCode;
  const googleMapsUrl = buildGoogleMapsUrl(plusCode);

  const fullAddress = buildFullAddress(postalAddress);

  const geoLat = postalAddress?.geographicalLocation?.latitude;
  const geoLon = postalAddress?.geographicalLocation?.longitude;
  const coords = geoLat !== undefined && geoLon !== undefined
    ? { latitude: geoLat, longitude: geoLon }
    : null;

  const nativeMapsUrl = buildNativeMapsUrl(fullAddress, coords, hallName);

  return {
    googleMapsUrl,
    nativeMapsUrl,
    fullAddress,
  };
}
