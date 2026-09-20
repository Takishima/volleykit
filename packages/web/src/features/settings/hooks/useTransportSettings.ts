import { useState, useEffect, useCallback, useRef, useMemo } from 'react'

import { useQueryClient } from '@tanstack/react-query'
import { useShallow } from 'zustand/react/shallow'

import { queryKeys } from '@/api/queryKeys'
import { useActiveAssociationCode } from '@/common/hooks/useActiveAssociation'
import { useTravelTimeAvailable } from '@/common/hooks/useTravelTime'
import {
  clearTravelTimeCache,
  getTravelTimeCacheStats,
  MIN_MAX_BIKE_DISTANCE_KM,
  MAX_MAX_BIKE_DISTANCE_KM,
} from '@/common/services/transport'
import {
  useSettingsStore,
  getDefaultArrivalBuffer,
  MIN_ARRIVAL_BUFFER_MINUTES,
  MAX_ARRIVAL_BUFFER_MINUTES,
  DEFAULT_MAX_DISTANCE_KM,
  DEFAULT_MAX_TRAVEL_TIME_MINUTES,
  DEFAULT_TRAVEL_MODE,
  DEFAULT_MAX_BIKE_DISTANCE_KM,
  type DistanceFilter,
  type SbbDestinationType,
  type TravelMode,
} from '@/common/stores/settings'

const DEBOUNCE_MS = 300

/** Minimum max distance in kilometers */
const MIN_MAX_DISTANCE_KM = 10

/** Maximum max distance in kilometers */
const MAX_MAX_DISTANCE_KM = 200

/** Minimum max travel time in minutes */
const MIN_MAX_TRAVEL_TIME_MINUTES = 30

/** Maximum max travel time in minutes (4 hours) */
const MAX_MAX_TRAVEL_TIME_MINUTES = 240

export function useTransportSettings() {
  const queryClient = useQueryClient()
  const isTransportAvailable = useTravelTimeAvailable()
  const associationCode = useActiveAssociationCode()

  const {
    homeLocation,
    transportEnabled,
    transportEnabledByAssociation,
    setTransportEnabledForAssociation,
    distanceFilter,
    distanceFilterByAssociation,
    setDistanceFilterForAssociation,
    travelTimeFilter,
    setMaxTravelTimeForAssociation,
    arrivalBufferByAssociation,
    setArrivalBufferForAssociation,
    sbbDestinationType,
    setSbbDestinationType,
    travelMode,
    setTravelMode,
    maxBikeDistanceKm,
    setMaxBikeDistanceKm,
  } = useSettingsStore(
    useShallow((state) => ({
      homeLocation: state.homeLocation,
      transportEnabled: state.transportEnabled,
      transportEnabledByAssociation: state.transportEnabledByAssociation,
      setTransportEnabledForAssociation: state.setTransportEnabledForAssociation,
      distanceFilter: state.distanceFilter,
      distanceFilterByAssociation: state.distanceFilterByAssociation,
      setDistanceFilterForAssociation: state.setDistanceFilterForAssociation,
      travelTimeFilter: state.travelTimeFilter,
      setMaxTravelTimeForAssociation: state.setMaxTravelTimeForAssociation,
      arrivalBufferByAssociation: state.travelTimeFilter.arrivalBufferByAssociation,
      setArrivalBufferForAssociation: state.setArrivalBufferForAssociation,
      sbbDestinationType: state.travelTimeFilter.sbbDestinationType ?? 'address',
      setSbbDestinationType: state.setSbbDestinationType,
      travelMode: state.travelTimeFilter?.travelMode ?? DEFAULT_TRAVEL_MODE,
      setTravelMode: state.setTravelMode,
      maxBikeDistanceKm: state.travelTimeFilter?.maxBikeDistanceKm ?? DEFAULT_MAX_BIKE_DISTANCE_KM,
      setMaxBikeDistanceKm: state.setMaxBikeDistanceKm,
    }))
  )

  const [showClearConfirm, setShowClearConfirm] = useState(false)
  // Incremented by handleClearCache to trigger a re-render so cacheEntryCount is recomputed.
  const [, setCacheVersion] = useState(0)

  // Get current transport enabled state for this association
  const isTransportEnabled = useMemo(() => {
    const enabledMap = transportEnabledByAssociation ?? {}
    if (associationCode && enabledMap[associationCode] !== undefined) {
      return enabledMap[associationCode]
    }
    return transportEnabled
  }, [associationCode, transportEnabledByAssociation, transportEnabled])

  // Get current distance filter for this association
  const currentDistanceFilter: DistanceFilter = useMemo(() => {
    const filterMap = distanceFilterByAssociation ?? {}
    if (associationCode && filterMap[associationCode] !== undefined) {
      return filterMap[associationCode]
    }
    // Use distanceFilter or default if not set
    return distanceFilter ?? { enabled: false, maxDistanceKm: DEFAULT_MAX_DISTANCE_KM }
  }, [associationCode, distanceFilterByAssociation, distanceFilter])

  // Get current max travel time for this association
  const currentMaxTravelTime = useMemo(() => {
    const timeMap = travelTimeFilter?.maxTravelTimeByAssociation ?? {}
    if (associationCode && timeMap[associationCode] !== undefined) {
      return timeMap[associationCode]
    }
    return travelTimeFilter?.maxTravelTimeMinutes ?? DEFAULT_MAX_TRAVEL_TIME_MINUTES
  }, [associationCode, travelTimeFilter])

  // Get current arrival buffer for this association from store
  const storeArrivalBuffer = useMemo(() => {
    if (associationCode && arrivalBufferByAssociation?.[associationCode] !== undefined) {
      return arrivalBufferByAssociation[associationCode]
    }
    return getDefaultArrivalBuffer(associationCode)
  }, [associationCode, arrivalBufferByAssociation])

  // Local state for immediate input feedback (debounced before persisting to store)
  const [localArrivalBuffer, setLocalArrivalBuffer] = useState(storeArrivalBuffer)
  const [localMaxDistance, setLocalMaxDistance] = useState(currentDistanceFilter.maxDistanceKm)
  const [localMaxTravelTime, setLocalMaxTravelTime] = useState(currentMaxTravelTime)
  const [localMaxBikeDistance, setLocalMaxBikeDistance] = useState(maxBikeDistanceKm)

  // When the association changes, reset local inputs to the new association's store values.
  // Adjusting state during render (not in an effect) avoids an extra render cycle.
  // See: https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [prevAssociation, setPrevAssociation] = useState(associationCode)
  if (prevAssociation !== associationCode) {
    setPrevAssociation(associationCode)
    setLocalArrivalBuffer(storeArrivalBuffer)
    setLocalMaxDistance(currentDistanceFilter.maxDistanceKm)
    setLocalMaxTravelTime(currentMaxTravelTime)
  }

  const arrivalDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const distanceDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const travelTimeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const bikeDistanceDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cleanup debounce timeouts on unmount
  useEffect(() => {
    return () => {
      if (arrivalDebounceRef.current) clearTimeout(arrivalDebounceRef.current)
      if (distanceDebounceRef.current) clearTimeout(distanceDebounceRef.current)
      if (travelTimeDebounceRef.current) clearTimeout(travelTimeDebounceRef.current)
      if (bikeDistanceDebounceRef.current) clearTimeout(bikeDistanceDebounceRef.current)
    }
  }, [])

  // Computed inline — recomputed on every render, including when setCacheVersion triggers a
  // re-render after the cache is cleared (see handleClearCache).
  const cacheEntryCount = isTransportEnabled ? getTravelTimeCacheStats().entryCount : 0

  const handleToggleTransport = useCallback(() => {
    if (!associationCode) return
    setTransportEnabledForAssociation(associationCode, !isTransportEnabled)
  }, [associationCode, isTransportEnabled, setTransportEnabledForAssociation])

  const handleClearCache = useCallback(() => {
    clearTravelTimeCache()
    queryClient.invalidateQueries({ queryKey: queryKeys.travelTime.all })
    setCacheVersion((v) => v + 1)
    setShowClearConfirm(false)
  }, [queryClient])

  const handleArrivalBufferChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!associationCode) return
      const value = parseInt(e.target.value, 10)
      if (!isNaN(value) && value >= MIN_ARRIVAL_BUFFER_MINUTES) {
        setLocalArrivalBuffer(value)
        if (arrivalDebounceRef.current) {
          clearTimeout(arrivalDebounceRef.current)
        }
        arrivalDebounceRef.current = setTimeout(() => {
          setArrivalBufferForAssociation(associationCode, value)
        }, DEBOUNCE_MS)
      }
    },
    [associationCode, setArrivalBufferForAssociation]
  )

  const handleMaxDistanceChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!associationCode) return
      const value = parseInt(e.target.value, 10)
      if (!isNaN(value) && value >= MIN_MAX_DISTANCE_KM) {
        setLocalMaxDistance(value)
        if (distanceDebounceRef.current) {
          clearTimeout(distanceDebounceRef.current)
        }
        distanceDebounceRef.current = setTimeout(() => {
          setDistanceFilterForAssociation(associationCode, { maxDistanceKm: value })
        }, DEBOUNCE_MS)
      }
    },
    [associationCode, setDistanceFilterForAssociation]
  )

  const handleMaxTravelTimeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!associationCode) return
      const value = parseInt(e.target.value, 10)
      if (!isNaN(value) && value >= MIN_MAX_TRAVEL_TIME_MINUTES) {
        setLocalMaxTravelTime(value)
        if (travelTimeDebounceRef.current) {
          clearTimeout(travelTimeDebounceRef.current)
        }
        travelTimeDebounceRef.current = setTimeout(() => {
          setMaxTravelTimeForAssociation(associationCode, value)
        }, DEBOUNCE_MS)
      }
    },
    [associationCode, setMaxTravelTimeForAssociation]
  )

  const handleSbbDestinationTypeChange = useCallback(
    (type: SbbDestinationType) => {
      setSbbDestinationType(type)
    },
    [setSbbDestinationType]
  )

  const handleTravelModeChange = useCallback(
    (mode: TravelMode) => {
      setTravelMode(mode)
    },
    [setTravelMode]
  )

  const handleMaxBikeDistanceChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseInt(e.target.value, 10)
      if (!isNaN(value) && value >= MIN_MAX_BIKE_DISTANCE_KM) {
        setLocalMaxBikeDistance(value)
        if (bikeDistanceDebounceRef.current) {
          clearTimeout(bikeDistanceDebounceRef.current)
        }
        bikeDistanceDebounceRef.current = setTimeout(() => {
          setMaxBikeDistanceKm(value)
        }, DEBOUNCE_MS)
      }
    },
    [setMaxBikeDistanceKm]
  )

  const hasHomeLocation = Boolean(homeLocation)
  const hasAssociation = Boolean(associationCode)
  const canEnableTransport = hasHomeLocation && isTransportAvailable && hasAssociation

  return {
    // State
    associationCode,
    isTransportAvailable,
    isTransportEnabled,
    localArrivalBuffer,
    localMaxDistance,
    localMaxTravelTime,
    cacheEntryCount,
    showClearConfirm,
    hasHomeLocation,
    canEnableTransport,
    sbbDestinationType: sbbDestinationType as SbbDestinationType,
    travelMode: travelMode as TravelMode,
    localMaxBikeDistance,

    // Constants
    minArrivalBuffer: MIN_ARRIVAL_BUFFER_MINUTES,
    maxArrivalBuffer: MAX_ARRIVAL_BUFFER_MINUTES,
    minMaxDistance: MIN_MAX_DISTANCE_KM,
    maxMaxDistance: MAX_MAX_DISTANCE_KM,
    defaultMaxDistance: DEFAULT_MAX_DISTANCE_KM,
    minMaxTravelTime: MIN_MAX_TRAVEL_TIME_MINUTES,
    maxMaxTravelTime: MAX_MAX_TRAVEL_TIME_MINUTES,
    defaultMaxTravelTime: DEFAULT_MAX_TRAVEL_TIME_MINUTES,
    minMaxBikeDistance: MIN_MAX_BIKE_DISTANCE_KM,
    maxMaxBikeDistance: MAX_MAX_BIKE_DISTANCE_KM,
    defaultMaxBikeDistance: DEFAULT_MAX_BIKE_DISTANCE_KM,

    // Actions
    handleToggleTransport,
    handleClearCache,
    handleArrivalBufferChange,
    handleMaxDistanceChange,
    handleMaxTravelTimeChange,
    handleSbbDestinationTypeChange,
    handleTravelModeChange,
    handleMaxBikeDistanceChange,
    setShowClearConfirm,
  }
}
