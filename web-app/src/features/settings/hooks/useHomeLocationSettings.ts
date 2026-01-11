import { useState, useEffect, useCallback, useRef } from 'react'

import { useShallow } from 'zustand/react/shallow'

import type { TranslationFunction } from '@/i18n'
import { useCombinedGeocode } from '@/shared/hooks/useCombinedGeocode'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'
import { useGeolocation } from '@/shared/hooks/useGeolocation'
import { useSettingsStore, type UserLocation } from '@/shared/stores/settings'

const GEOCODE_DEBOUNCE_MS = 500
const MIN_SEARCH_LENGTH = 3

type GeolocationErrorCode = 'permission_denied' | 'position_unavailable' | 'timeout'

/** Get localized error message for geolocation errors */
export function getGeolocationErrorMessage(error: string, t: TranslationFunction): string {
  switch (error as GeolocationErrorCode) {
    case 'permission_denied':
      return t('settings.homeLocation.errorPermissionDenied')
    case 'position_unavailable':
      return t('settings.homeLocation.errorPositionUnavailable')
    case 'timeout':
      return t('settings.homeLocation.errorTimeout')
    default:
      return t('settings.homeLocation.errorUnknown')
  }
}

interface UseHomeLocationSettingsOptions {
  t: TranslationFunction
}

export function useHomeLocationSettings({ t }: UseHomeLocationSettingsOptions) {
  const { homeLocation, setHomeLocation } = useSettingsStore(
    useShallow((state) => ({
      homeLocation: state.homeLocation,
      setHomeLocation: state.setHomeLocation,
    }))
  )

  const [addressQuery, setAddressQuery] = useState('')
  const debouncedQuery = useDebouncedValue(addressQuery, GEOCODE_DEBOUNCE_MS)

  const {
    results: geocodeResults,
    isLoading: geocodeLoading,
    error: geocodeError,
    search: geocodeSearch,
    clear: geocodeClear,
  } = useCombinedGeocode()

  // Refs for stable callback references in geolocation handler
  const setAddressQueryRef = useRef(setAddressQuery)
  const geocodeClearRef = useRef(geocodeClear)
  // Sync refs on every render to avoid stale closures in callbacks
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setAddressQueryRef.current = setAddressQuery
    geocodeClearRef.current = geocodeClear
  })

  // Handle geolocation success via callback
  const handleGeolocationSuccess = useCallback(
    (position: { latitude: number; longitude: number }) => {
      const location: UserLocation = {
        latitude: position.latitude,
        longitude: position.longitude,
        label: t('settings.homeLocation.currentLocation'),
        source: 'geolocation',
      }
      setHomeLocation(location)
      setAddressQueryRef.current('')
      geocodeClearRef.current()
    },
    [setHomeLocation, t]
  )

  const {
    isLoading: geoLoading,
    error: geoError,
    isSupported: geoSupported,
    requestLocation,
  } = useGeolocation({
    onSuccess: handleGeolocationSuccess,
  })

  // Trigger geocoding when debounced query changes
  useEffect(() => {
    if (debouncedQuery.length >= MIN_SEARCH_LENGTH) {
      geocodeSearch(debouncedQuery)
    } else {
      geocodeClear()
    }
  }, [debouncedQuery, geocodeSearch, geocodeClear])

  const handleSelectGeocodedLocation = useCallback(
    (result: { latitude: number; longitude: number; displayName: string }) => {
      const location: UserLocation = {
        latitude: result.latitude,
        longitude: result.longitude,
        label: result.displayName,
        source: 'geocoded',
      }
      setHomeLocation(location)
      setAddressQuery('')
      geocodeClear()
    },
    [setHomeLocation, geocodeClear]
  )

  const handleClearLocation = useCallback(() => {
    setHomeLocation(null)
    setAddressQuery('')
  }, [setHomeLocation])

  const handleAddressChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setAddressQuery(e.target.value)
  }, [])

  return {
    // State
    homeLocation,
    addressQuery,
    debouncedQuery,
    geocodeResults,
    geocodeLoading,
    geocodeError,
    geoLoading,
    geoError,
    geoSupported,
    minSearchLength: MIN_SEARCH_LENGTH,

    // Actions
    requestLocation,
    handleSelectGeocodedLocation,
    handleClearLocation,
    handleAddressChange,
  }
}
