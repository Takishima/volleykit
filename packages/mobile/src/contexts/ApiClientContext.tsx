/**
 * API Client Context for mobile app.
 *
 * Provides the API client to all components via React Context.
 * This allows screens to access the API client without prop drilling
 * and enables easy swapping between mock and real implementations.
 *
 * The client is automatically selected based on the auth store's dataSource:
 * - 'api': Real API client for authenticated users
 * - 'demo': Mock API client for demo mode
 * - 'calendar': Mock API client (calendar mode uses limited data)
 */

import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { useAuthStore } from '@volleykit/shared/stores';

import { mobileApiClient, realApiClient, type MobileApiClient } from '../api';

/**
 * API client context value type.
 */
export interface ApiClientContextValue {
  apiClient: MobileApiClient;
}

/**
 * API client context.
 */
const ApiClientContext = createContext<ApiClientContextValue | null>(null);

/**
 * Props for ApiClientProvider.
 */
interface ApiClientProviderProps {
  children: ReactNode;
  /** Optional custom API client (useful for testing) */
  apiClient?: MobileApiClient;
}

/**
 * Provides the API client to the component tree.
 *
 * Automatically selects the appropriate client based on auth state:
 * - Uses real API client when authenticated with 'api' data source
 * - Uses mock API client for demo/calendar modes or when not authenticated
 */
export function ApiClientProvider({
  children,
  apiClient: customApiClient,
}: ApiClientProviderProps) {
  const dataSource = useAuthStore((state) => state.dataSource);

  const apiClient = useMemo(() => {
    // Use custom client if provided (for testing)
    if (customApiClient) {
      return customApiClient;
    }

    // Select client based on data source
    return dataSource === 'api' ? realApiClient : mobileApiClient;
  }, [customApiClient, dataSource]);

  return (
    <ApiClientContext.Provider value={{ apiClient }}>
      {children}
    </ApiClientContext.Provider>
  );
}

/**
 * Hook to access the API client from context.
 *
 * @throws Error if used outside of ApiClientProvider
 */
export function useApiClient(): MobileApiClient {
  const context = useContext(ApiClientContext);

  if (!context) {
    throw new Error('useApiClient must be used within an ApiClientProvider');
  }

  return context.apiClient;
}
