/**
 * Network status detection hook.
 *
 * Provides real-time online/offline status using the Network Information API.
 * Updates automatically when connectivity changes.
 */

import { useSyncExternalStore } from 'react'

import { createLogger } from '@/shared/utils/logger'

const log = createLogger('networkStatus')

/**
 * Subscribe to network status changes.
 * Returns an unsubscribe function.
 */
function subscribeToNetworkStatus(callback: () => void): () => void {
  const handleOnline = () => {
    log.info('Network status: online')
    callback()
  }

  const handleOffline = () => {
    log.warn('Network status: offline')
    callback()
  }

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
}

/**
 * Get the current network status snapshot.
 */
function getNetworkSnapshot(): boolean {
  return navigator.onLine
}

/**
 * Server-side snapshot (assume online for SSR).
 */
function getServerSnapshot(): boolean {
  return true
}

/**
 * Hook to detect and track network connectivity status.
 *
 * Uses the browser's Navigator.onLine API and listens for
 * online/offline events to provide real-time status updates.
 *
 * Note: navigator.onLine can have false positives (reports online
 * when behind a captive portal or with limited connectivity).
 * For critical operations, always handle network errors gracefully.
 *
 * @returns Whether the browser reports being online
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const isOnline = useNetworkStatus()
 *
 *   if (!isOnline) {
 *     return <OfflineBanner />
 *   }
 *
 *   return <NormalContent />
 * }
 * ```
 */
export function useNetworkStatus(): boolean {
  return useSyncExternalStore(subscribeToNetworkStatus, getNetworkSnapshot, getServerSnapshot)
}

/**
 * Get current network status without subscribing to updates.
 * Useful for one-time checks outside of React components.
 */
export function getNetworkStatus(): boolean {
  if (typeof navigator === 'undefined') return true
  return navigator.onLine
}
