/**
 * Route guard components for authentication-based routing.
 *
 * - ProtectedRoute: Verifies session, redirects unauthenticated users to login
 * - PublicRoute: Redirects authenticated users to home
 */

import { useEffect, useState } from 'react'

import { Navigate } from 'react-router-dom'
import { useShallow } from 'zustand/react/shallow'

import { ErrorBoundary } from '@/shared/components/ErrorBoundary'
import { LoadingState } from '@/shared/components/LoadingSpinner'
import { features } from '@/shared/config/features'
// features.offline — Cache warming for offline support (delete this import when removing offline feature)
import { useCacheWarming } from '@/shared/hooks/useCacheWarming'
import { useTranslation } from '@/shared/hooks/useTranslation'
import { useAuthStore } from '@/shared/stores/auth'
import { useDemoStore } from '@/shared/stores/demo'
import { logger } from '@/shared/utils/logger'

// features.offline — Cache warming no-op when offline is disabled
const useOfflineCacheWarming: () => void = features.offline ? useCacheWarming : () => {}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { status, checkSession, dataSource } = useAuthStore(
    useShallow((state) => ({
      status: state.status,
      checkSession: state.checkSession,
      dataSource: state.dataSource,
    }))
  )
  const { assignments, activeAssociationCode, initializeDemoData } = useDemoStore(
    useShallow((state) => ({
      assignments: state.assignments,
      activeAssociationCode: state.activeAssociationCode,
      initializeDemoData: state.initializeDemoData,
    }))
  )
  const { t } = useTranslation()
  const isDemoMode = dataSource === 'demo'

  // Warm cache with critical data after login for offline support (features.offline)
  useOfflineCacheWarming()

  // Only verify session for API mode - demo and calendar modes don't need server verification
  const shouldVerifySession = status === 'authenticated' && dataSource === 'api'
  const [isVerifying, setIsVerifying] = useState(() => shouldVerifySession)
  const [verifyError, setVerifyError] = useState<string | null>(null)

  // Regenerate demo data on page load if demo mode is enabled but data is empty
  // This only runs once when data needs initialization, not on association changes
  // (association changes are handled by AppShell when user switches occupation)
  useEffect(() => {
    if (isDemoMode && assignments.length === 0) {
      initializeDemoData(activeAssociationCode ?? 'SV')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Only run when data is empty, not on association changes
  }, [isDemoMode, assignments.length, initializeDemoData])

  // Verify persisted session is still valid on mount
  useEffect(() => {
    if (!isVerifying || dataSource !== 'api') return

    const controller = new AbortController()

    checkSession(controller.signal)
      .catch((error: unknown) => {
        // Ignore AbortError - this is expected when component unmounts
        if (error instanceof Error && error.name === 'AbortError') {
          return
        }
        const message = error instanceof Error ? error.message : 'Session verification failed'
        setVerifyError(message)
      })
      .finally(() => {
        // Only update state if not aborted
        if (!controller.signal.aborted) {
          setIsVerifying(false)
        }
      })

    return () => {
      controller.abort()
    }
  }, [isVerifying, checkSession, dataSource])

  // Show loading state while verifying session
  if (status === 'loading' || isVerifying) {
    return <LoadingState message={t('auth.checkingSession')} />
  }

  // If verification failed, redirect to login (session may be invalid)
  if (verifyError) {
    logger.warn('Session verification failed:', verifyError)
    return <Navigate to="/login" replace />
  }

  if (status !== 'authenticated') {
    return <Navigate to="/login" replace />
  }

  // Wrap children in ErrorBoundary to catch route-level errors
  return <ErrorBoundary>{children}</ErrorBoundary>
}

export function PublicRoute({ children }: { children: React.ReactNode }) {
  const status = useAuthStore((state) => state.status)

  if (status === 'authenticated') {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
