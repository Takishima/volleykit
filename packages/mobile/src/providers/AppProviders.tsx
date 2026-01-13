/**
 * App-level providers for React Native app
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { StorageContext } from '@volleykit/shared/adapters';
import { storage } from '../platform/storage';

// Create QueryClient with mobile-optimized settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      retry: 2,
      refetchOnWindowFocus: false, // No window focus on mobile
    },
  },
});

// Placeholder secure storage (will be implemented in Phase 4)
const secureStorage = {
  setCredentials: async () => {},
  getCredentials: async () => null,
  clearCredentials: async () => {},
  hasCredentials: async () => false,
};

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <StorageContext.Provider value={{ storage, secureStorage }}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </StorageContext.Provider>
  );
}
