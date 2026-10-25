/**
 * App-level providers for React Native app
 *
 * Includes:
 * - StorageContext for platform storage adapters
 * - ApiClientProvider for API client access
 * - QueryClient for data fetching with session expiry detection
 * - SessionMonitorProvider for biometric re-authentication
 */

import { useMemo, useEffect } from 'react'
import type { ReactNode } from 'react'

import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query'

import { StorageContext, type StorageContextValue } from '@volleykit/shared/adapters'
import { HttpStatus } from '@volleykit/shared/api'
import { MS_PER_MINUTE, MS_PER_DAY } from '@volleykit/shared/utils'

import { SessionMonitorProvider, useSessionMonitorContext, ApiClientProvider } from '../contexts'
import { NetworkProvider } from './NetworkProvider'
import { secureStorage } from '../platform/secureStorage'
import { storage } from '../platform/storage'

interface AppProvidersProps {
  children: ReactNode
}

/** Platform storage adapters are module singletons, so the context value is too. */
const STORAGE_CONTEXT_VALUE: StorageContextValue = { storage, secureStorage }

/**
 * Check for 401/403 status indicating session expiry
 */
function isAuthError(error: unknown): boolean {
  return (
    !!error &&
    typeof error === 'object' &&
    'status' in error &&
    (error.status === HttpStatus.UNAUTHORIZED || error.status === HttpStatus.FORBIDDEN)
  )
}

/**
 * Inner component that sets up QueryClient with session monitoring
 */
function QueryClientWithSessionMonitor({ children }: { children: ReactNode }) {
  const { handleSessionExpired } = useSessionMonitorContext()

  // Create QueryClient once; the session expiry handler is wired in below
  const queryClient = useMemo(
    () =>
      new QueryClient({
        queryCache: new QueryCache(),
        mutationCache: new MutationCache(),
        defaultOptions: {
          queries: {
            staleTime: MS_PER_MINUTE * 5, // 5 minutes
            gcTime: MS_PER_DAY, // 24 hours
            retry: (failureCount, error) => {
              // Don't retry on auth errors
              if (isAuthError(error)) {
                return false
              }
              return failureCount < 2
            },
            refetchOnWindowFocus: false, // No window focus on mobile
          },
        },
      }),
    []
  )

  // Always use the latest handler without recreating the QueryClient
  useEffect(() => {
    const handleError = (error: unknown) => {
      if (isAuthError(error)) {
        handleSessionExpired()
      }
    }
    queryClient.getQueryCache().config.onError = handleError
    queryClient.getMutationCache().config.onError = handleError
  }, [queryClient, handleSessionExpired])

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <StorageContext.Provider value={STORAGE_CONTEXT_VALUE}>
      <NetworkProvider>
        <ApiClientProvider>
          <SessionMonitorProvider>
            <QueryClientWithSessionMonitor>{children}</QueryClientWithSessionMonitor>
          </SessionMonitorProvider>
        </ApiClientProvider>
      </NetworkProvider>
    </StorageContext.Provider>
  )
}
