/**
 * Network status hook for offline detection.
 *
 * Uses @react-native-community/netinfo to detect network connectivity.
 */

import { useState, useEffect, useCallback } from 'react'

import NetInfo, { NetInfoState } from '@react-native-community/netinfo'

/**
 * Network status information.
 */
export interface NetworkStatus {
  /** Whether device has network connectivity */
  isConnected: boolean
  /** Whether device is connected to WiFi */
  isWifi: boolean
  /** Whether device is connected to cellular */
  isCellular: boolean
  /** Whether connection is known (not initial state) */
  isKnown: boolean
  /** Connection type (wifi, cellular, none, etc.) */
  type: string
}

/**
 * Default network status (unknown).
 */
const DEFAULT_STATUS: NetworkStatus = {
  isConnected: true, // Assume connected initially
  isWifi: false,
  isCellular: false,
  isKnown: false,
  type: 'unknown',
}

/**
 * Convert NetInfo state to NetworkStatus.
 */
function convertNetInfoState(state: NetInfoState): NetworkStatus {
  return {
    isConnected: state.isConnected ?? true,
    isWifi: state.type === 'wifi',
    isCellular: state.type === 'cellular',
    isKnown: state.isConnected !== null,
    type: state.type,
  }
}

/**
 * Hook for monitoring network connectivity status.
 *
 * @returns Current network status
 */
export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(DEFAULT_STATUS)

  useEffect(() => {
    // Get initial state
    NetInfo.fetch().then((state) => {
      setStatus(convertNetInfoState(state))
    })

    // Subscribe to changes
    const unsubscribe = NetInfo.addEventListener((state) => {
      setStatus(convertNetInfoState(state))
    })

    return () => {
      unsubscribe()
    }
  }, [])

  return status
}

/**
 * Hook for checking if device is online.
 *
 * @returns Whether device has network connectivity
 */
export function useIsOnline(): boolean {
  const { isConnected } = useNetworkStatus()
  return isConnected
}

/**
 * Hook for getting network status with refresh capability.
 */
export function useNetworkStatusWithRefresh(): {
  status: NetworkStatus
  refresh: () => Promise<NetworkStatus>
} {
  const status = useNetworkStatus()

  const refresh = useCallback(async (): Promise<NetworkStatus> => {
    const state = await NetInfo.fetch()
    return convertNetInfoState(state)
  }, [])

  return { status, refresh }
}

/**
 * Check network status imperatively (without hook).
 */
export async function checkNetworkStatus(): Promise<NetworkStatus> {
  const state = await NetInfo.fetch()
  return convertNetInfoState(state)
}

/**
 * Check if online imperatively.
 */
export async function isOnline(): Promise<boolean> {
  const status = await checkNetworkStatus()
  return status.isConnected
}
