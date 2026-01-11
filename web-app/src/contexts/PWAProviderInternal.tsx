import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import { MS_PER_HOUR } from '@/shared/utils/constants'
import { logger } from '@/shared/utils/logger'

import { PWAContext, type PWAContextType } from './pwa-context-value'

/**
 * Interval for automatic update checks (1 hour).
 * Balances freshness with avoiding excessive network requests.
 * The service worker will also check for updates on page load.
 */
const UPDATE_CHECK_INTERVAL_MS = MS_PER_HOUR

interface PWAProviderInternalProps {
  children: ReactNode
}

/**
 * Internal PWA Provider that manages service worker registration and updates.
 * This component should only be rendered when PWA is enabled.
 */
export default function PWAProviderInternal({ children }: PWAProviderInternalProps) {
  const [offlineReady, setOfflineReady] = useState(false)
  const [needRefresh, setNeedRefresh] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)
  const [checkError, setCheckError] = useState<Error | null>(null)
  const [registrationError, setRegistrationError] = useState<Error | null>(null)

  // Refs must be declared before useEffect to avoid race conditions
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  const updateSWRef = useRef<((reloadPage?: boolean) => Promise<void>) | null>(null)
  // Ref-based guard to prevent duplicate concurrent update checks
  const isCheckingRef = useRef(false)

  // Check for updates when the app becomes visible again (e.g., reopening PWA on iOS).
  // iOS Safari PWAs resume from a suspended state rather than reloading, so the
  // service worker update check on page load doesn't run. This ensures users
  // see update prompts when returning to the app after a new version is deployed.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && registrationRef.current) {
        // Silently ignore errors - update check failures on visibility change are not critical
        // (e.g., user returns to the app while offline)
        registrationRef.current.update().catch(() => {})
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  useEffect(() => {
    // Cancellation flag pattern for async operations in React 18+.
    // While React 18 safely handles setState on unmounted components (no-op instead of warning),
    // we still use this pattern to:
    // 1. Prevent unnecessary state updates after unmount
    // 2. Avoid setting up intervals on unmounted components
    // 3. Make the cleanup intent explicit for maintainability
    let cancelled = false

    async function registerSW() {
      try {
        const { registerSW } = await import('virtual:pwa-register')

        const updateSW = registerSW({
          immediate: true,
          onRegisteredSW(_swUrl, registration) {
            if (cancelled || !registration) return

            registrationRef.current = registration

            // Check for updates periodically
            intervalRef.current = setInterval(() => {
              registration.update()
            }, UPDATE_CHECK_INTERVAL_MS)
          },
          onOfflineReady() {
            if (!cancelled) {
              setOfflineReady(true)
            }
          },
          onNeedRefresh() {
            if (!cancelled) {
              setNeedRefresh(true)
            }
          },
          onRegisterError(error) {
            logger.error('Service worker registration error:', error)
            if (!cancelled) {
              const regError =
                error instanceof Error ? error : new Error('Service worker registration failed')
              setRegistrationError(regError)
            }
          },
        })

        // Store updateSW function for later use
        if (!cancelled) {
          updateSWRef.current = updateSW
        }
      } catch (error) {
        logger.error('Failed to register service worker:', error)
        if (!cancelled) {
          const regError =
            error instanceof Error ? error : new Error('Failed to register service worker')
          setRegistrationError(regError)
        }
      }
    }

    registerSW()

    return () => {
      cancelled = true
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = undefined
      }
    }
  }, [])

  const checkForUpdate = async () => {
    // Use ref-based guard to prevent race conditions with concurrent calls
    if (!registrationRef.current || isCheckingRef.current) return

    isCheckingRef.current = true
    setIsChecking(true)
    setCheckError(null)
    try {
      await registrationRef.current.update()
      setLastChecked(new Date())
    } catch (error) {
      const updateError = error instanceof Error ? error : new Error('Failed to check for updates')
      logger.error('Failed to check for updates:', error)
      setCheckError(updateError)
    } finally {
      isCheckingRef.current = false
      setIsChecking(false)
    }
  }

  const updateApp = async () => {
    if (updateSWRef.current) {
      // Use vite-plugin-pwa's built-in update mechanism
      // This posts SKIP_WAITING to waiting SW and reloads
      await updateSWRef.current(true)
    } else {
      // Fallback: Service worker not ready (race condition or registration pending)
      // This can happen on the login page when PWA is first opened, especially on iOS
      // where the app resumes from background before SW registration completes.
      // Manual update: clear caches and force reload to get fresh content.
      logger.warn('Service worker not ready, using fallback reload mechanism')
      try {
        // Clear all caches to ensure fresh content is fetched
        const cacheNames = (await caches?.keys()) || []
        await Promise.all(cacheNames.map((name) => caches.delete(name)))
      } catch (error) {
        // Ignore cache clearing errors - proceed with reload anyway
        logger.warn('Failed to clear caches during fallback update:', error)
      }
      // Force reload to fetch fresh content from network
      window.location.reload()
    }
  }

  const dismissPrompt = () => {
    setOfflineReady(false)
    setNeedRefresh(false)
  }

  const value: PWAContextType = {
    offlineReady,
    needRefresh,
    isChecking,
    lastChecked,
    checkError,
    registrationError,
    checkForUpdate,
    updateApp,
    dismissPrompt,
  }

  return <PWAContext.Provider value={value}>{children}</PWAContext.Provider>
}
