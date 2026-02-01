/**
 * Offline indicator component.
 *
 * Displays a banner when the user is offline, providing visual feedback
 * about network connectivity status. Automatically hides when back online.
 */

import { useState, useCallback } from 'react'

import { useNetworkStatus } from '@/shared/hooks/useNetworkStatus'
import { useTranslation } from '@/shared/hooks/useTranslation'

import { WifiOff, X } from './icons'

/**
 * Offline indicator that shows a banner when the network is unavailable.
 *
 * Features:
 * - Shows automatically when going offline
 * - Can be dismissed (stays dismissed for the session)
 * - Accessible with proper ARIA attributes
 */
export function OfflineIndicator() {
  const isOnline = useNetworkStatus()
  const { t } = useTranslation()
  const [isDismissed, setIsDismissed] = useState(false)

  const handleDismiss = useCallback(() => {
    setIsDismissed(true)
  }, [])

  // Don't render if online or dismissed
  if (isOnline || isDismissed) {
    return null
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="bg-amber-500 text-amber-950 border-b border-amber-600"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <WifiOff className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <span className="text-sm font-medium">{t('offline.youAreOffline')}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-amber-800 sm:inline">
            {t('offline.cachedDataAvailable')}
          </span>
          <button
            onClick={handleDismiss}
            className="rounded p-1 hover:bg-amber-600/20 focus:outline-none focus:ring-2 focus:ring-amber-700 focus:ring-offset-1 focus:ring-offset-amber-500"
            aria-label={t('offline.dismissAriaLabel')}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  )
}
