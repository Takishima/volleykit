/**
 * API Client Context for mobile app.
 *
 * Provides the API client to all components via React Context.
 * This allows screens to access the API client without prop drilling
 * and enables easy swapping between mock and real implementations.
 */

import { createContext, useContext, type ReactNode } from 'react';

import { mobileApiClient, type MobileApiClient } from '../api';

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
 */
export function ApiClientProvider({
  children,
  apiClient = mobileApiClient,
}: ApiClientProviderProps) {
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
