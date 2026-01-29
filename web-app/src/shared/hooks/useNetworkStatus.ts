/**
 * Network status hook for web browsers.
 *
 * Provides real-time network connectivity status using the
 * browser's Navigator.onLine API and online/offline events.
 */

import { useState, useEffect, useCallback } from 'react'
import type { NetworkStatus } from '@volleykit/shared'

/**
 * Returns the current network connectivity status.
 *
 * Uses the browser's Navigator.onLine API and listens for
 * online/offline events to track connectivity changes.
 *
 * @returns The current network status
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isConnected } = useNetworkStatus()
 *
 *   if (!isConnected) {
 *     return <OfflineBanner />
 *   }
 *
 *   return <Content />
 * }
 * ```
 */
export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(() => ({
    isConnected: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isKnown: typeof navigator !== 'undefined',
    type: 'unknown',
  }))

  useEffect(() => {
    // Skip if we're in SSR
    if (typeof window === 'undefined') return

    const handleOnline = () => {
      setStatus((prev) => ({
        ...prev,
        isConnected: true,
        isKnown: true,
      }))
    }

    const handleOffline = () => {
      setStatus((prev) => ({
        ...prev,
        isConnected: false,
        isKnown: true,
        type: 'none',
      }))
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return status
}

/**
 * Returns a simple boolean indicating if the device is online.
 *
 * This is a convenience wrapper around useNetworkStatus for
 * simple use cases where you only need to know online/offline.
 *
 * @returns True if connected to a network, false otherwise
 *
 * @example
 * ```tsx
 * function SaveButton() {
 *   const isOnline = useIsOnline()
 *
 *   return (
 *     <button disabled={!isOnline}>
 *       {isOnline ? 'Save' : 'Offline'}
 *     </button>
 *   )
 * }
 * ```
 */
export function useIsOnline(): boolean {
  const { isConnected } = useNetworkStatus()
  return isConnected
}

/**
 * Verify actual internet connectivity with a lightweight ping.
 *
 * The Navigator.onLine API only indicates network connection,
 * not actual internet access. This function performs a real
 * request to verify connectivity.
 *
 * @param pingUrl - Optional URL to ping (defaults to current origin)
 * @returns Promise that resolves to true if internet is reachable
 *
 * @example
 * ```tsx
 * const checkConnectivity = async () => {
 *   const hasInternet = await verifyConnectivity()
 *   if (!hasInternet) {
 *     showOfflineWarning()
 *   }
 * }
 * ```
 */
export async function verifyConnectivity(pingUrl?: string): Promise<boolean> {
  try {
    // Use a timestamp to prevent caching
    const url = pingUrl ?? `${window.location.origin}/favicon.ico?_=${Date.now()}`

    const response = await fetch(url, {
      method: 'HEAD',
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    })

    return response.ok
  } catch {
    return false
  }
}

/**
 * Hook that triggers a callback when network status changes.
 *
 * @param onOnline - Callback when device comes online
 * @param onOffline - Callback when device goes offline
 *
 * @example
 * ```tsx
 * useNetworkChangeCallback(
 *   () => syncQueue(),
 *   () => showOfflineToast()
 * )
 * ```
 */
export function useNetworkChangeCallback(
  onOnline?: () => void,
  onOffline?: () => void
): void {
  const handleOnline = useCallback(() => {
    onOnline?.()
  }, [onOnline])

  const handleOffline = useCallback(() => {
    onOffline?.()
  }, [onOffline])

  useEffect(() => {
    if (typeof window === 'undefined') return

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [handleOnline, handleOffline])
}
