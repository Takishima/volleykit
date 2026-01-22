/**
 * App-level providers for React Native app
 *
 * Includes:
 * - StorageContext for platform storage adapters
 * - ApiClientProvider for API client access
 * - QueryClient for data fetching with session expiry detection
 * - SessionMonitorProvider for biometric re-authentication
 */

import { useMemo, useRef, useEffect } from 'react';
import {
  QueryClient,
  QueryClientProvider,
  QueryCache,
  MutationCache,
} from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { StorageContext } from '@volleykit/shared/adapters';
import { HttpStatus } from '@volleykit/shared/api';
import { storage } from '../platform/storage';
import { secureStorage } from '../platform/secureStorage';
import { SessionMonitorProvider, useSessionMonitorContext, ApiClientProvider } from '../contexts';
import { NetworkProvider } from './NetworkProvider';

interface AppProvidersProps {
  children: ReactNode;
}

/**
 * Inner component that sets up QueryClient with session monitoring
 */
function QueryClientWithSessionMonitor({ children }: { children: ReactNode }) {
  const { handleSessionExpired } = useSessionMonitorContext();

  // Use ref to always have latest handler without recreating QueryClient
  const sessionExpiredRef = useRef(handleSessionExpired);
  useEffect(() => {
    sessionExpiredRef.current = handleSessionExpired;
  }, [handleSessionExpired]);

  // Create QueryClient with session expiry detection
  const queryClient = useMemo(() => {
    const handleError = (error: unknown) => {
      // Check for 401/403 status indicating session expiry
      if (
        error &&
        typeof error === 'object' &&
        'status' in error &&
        (error.status === HttpStatus.UNAUTHORIZED ||
          error.status === HttpStatus.FORBIDDEN)
      ) {
        sessionExpiredRef.current();
      }
    };

    return new QueryClient({
      queryCache: new QueryCache({
        onError: handleError,
      }),
      mutationCache: new MutationCache({
        onError: handleError,
      }),
      defaultOptions: {
        queries: {
          staleTime: 1000 * 60 * 5, // 5 minutes
          gcTime: 1000 * 60 * 60 * 24, // 24 hours
          retry: (failureCount, error) => {
            // Don't retry on auth errors
            if (
              error &&
              typeof error === 'object' &&
              'status' in error &&
              (error.status === HttpStatus.UNAUTHORIZED ||
                error.status === HttpStatus.FORBIDDEN)
            ) {
              return false;
            }
            return failureCount < 2;
          },
          refetchOnWindowFocus: false, // No window focus on mobile
        },
      },
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <StorageContext.Provider value={{ storage, secureStorage }}>
      <NetworkProvider>
        <ApiClientProvider>
          <SessionMonitorProvider>
            <QueryClientWithSessionMonitor>{children}</QueryClientWithSessionMonitor>
          </SessionMonitorProvider>
        </ApiClientProvider>
      </NetworkProvider>
    </StorageContext.Provider>
  );
}
