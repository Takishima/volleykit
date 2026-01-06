import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { useQueryClient } from "@tanstack/react-query";
import {
  useSettingsStore,
  getDefaultArrivalBuffer,
  MIN_ARRIVAL_BUFFER_MINUTES,
  MAX_ARRIVAL_BUFFER_MINUTES,
} from "@/shared/stores/settings";
import { useActiveAssociationCode } from "@/features/auth/hooks/useActiveAssociation";
import { useTravelTimeAvailable } from "@/shared/hooks/useTravelTime";
import { queryKeys } from "@/api/queryKeys";
import {
  clearTravelTimeCache,
  getTravelTimeCacheStats,
} from "@/shared/services/transport";

const ARRIVAL_BUFFER_DEBOUNCE_MS = 300;

export function useTransportSettings() {
  const queryClient = useQueryClient();
  const isTransportAvailable = useTravelTimeAvailable();
  const associationCode = useActiveAssociationCode();

  const {
    homeLocation,
    transportEnabled,
    transportEnabledByAssociation,
    setTransportEnabledForAssociation,
    arrivalBufferByAssociation,
    setArrivalBufferForAssociation,
  } = useSettingsStore(
    useShallow((state) => ({
      homeLocation: state.homeLocation,
      transportEnabled: state.transportEnabled,
      transportEnabledByAssociation: state.transportEnabledByAssociation,
      setTransportEnabledForAssociation: state.setTransportEnabledForAssociation,
      arrivalBufferByAssociation: state.travelTimeFilter.arrivalBufferByAssociation,
      setArrivalBufferForAssociation: state.setArrivalBufferForAssociation,
    })),
  );

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [cacheVersion, setCacheVersion] = useState(0);

  // Get current transport enabled state for this association
  const isTransportEnabled = useMemo(() => {
    const enabledMap = transportEnabledByAssociation ?? {};
    if (associationCode && enabledMap[associationCode] !== undefined) {
      return enabledMap[associationCode];
    }
    return transportEnabled;
  }, [associationCode, transportEnabledByAssociation, transportEnabled]);

  // Get current arrival buffer for this association from store
  const storeArrivalBuffer = useMemo(() => {
    if (associationCode && arrivalBufferByAssociation?.[associationCode] !== undefined) {
      return arrivalBufferByAssociation[associationCode];
    }
    return getDefaultArrivalBuffer(associationCode);
  }, [associationCode, arrivalBufferByAssociation]);

  // Local state for immediate input feedback
  const [localArrivalBuffer, setLocalArrivalBuffer] = useState(storeArrivalBuffer);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local state when store value changes externally
  useEffect(() => {
    setLocalArrivalBuffer((prev) => (prev !== storeArrivalBuffer ? storeArrivalBuffer : prev));
  }, [storeArrivalBuffer]);

  // Cleanup debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Calculate cache entry count
  const cacheEntryCount = useMemo(
    () => (isTransportEnabled ? getTravelTimeCacheStats().entryCount : 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isTransportEnabled, cacheVersion],
  );

  const handleToggleTransport = useCallback(() => {
    if (!associationCode) return;
    setTransportEnabledForAssociation(associationCode, !isTransportEnabled);
  }, [associationCode, isTransportEnabled, setTransportEnabledForAssociation]);

  const handleClearCache = useCallback(() => {
    clearTravelTimeCache();
    queryClient.invalidateQueries({ queryKey: queryKeys.travelTime.all });
    setCacheVersion((v) => v + 1);
    setShowClearConfirm(false);
  }, [queryClient]);

  const handleArrivalBufferChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!associationCode) return;
      const value = parseInt(e.target.value, 10);
      if (!isNaN(value) && value >= MIN_ARRIVAL_BUFFER_MINUTES) {
        setLocalArrivalBuffer(value);
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
        }
        debounceRef.current = setTimeout(() => {
          setArrivalBufferForAssociation(associationCode, value);
        }, ARRIVAL_BUFFER_DEBOUNCE_MS);
      }
    },
    [associationCode, setArrivalBufferForAssociation],
  );

  const hasHomeLocation = Boolean(homeLocation);
  const hasAssociation = Boolean(associationCode);
  const canEnableTransport = hasHomeLocation && isTransportAvailable && hasAssociation;

  return {
    // State
    associationCode,
    isTransportAvailable,
    isTransportEnabled,
    localArrivalBuffer,
    cacheEntryCount,
    showClearConfirm,
    hasHomeLocation,
    canEnableTransport,

    // Constants
    minArrivalBuffer: MIN_ARRIVAL_BUFFER_MINUTES,
    maxArrivalBuffer: MAX_ARRIVAL_BUFFER_MINUTES,

    // Actions
    handleToggleTransport,
    handleClearCache,
    handleArrivalBufferChange,
    setShowClearConfirm,
  };
}
