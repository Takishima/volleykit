/**
 * Network Provider for offline state management.
 *
 * Provides network connectivity context throughout the app.
 */

import { createContext, useContext, type ReactNode, type JSX } from 'react';
import { useNetworkStatus, type NetworkStatus } from '../hooks/useNetworkStatus';

/**
 * Network context value.
 */
export interface NetworkContextValue {
  /** Current network status */
  status: NetworkStatus;
  /** Whether device is online */
  isOnline: boolean;
  /** Whether device is on WiFi */
  isWifi: boolean;
  /** Whether network status is known */
  isKnown: boolean;
}

/**
 * Network context.
 */
const NetworkContext = createContext<NetworkContextValue | null>(null);

/**
 * Network provider props.
 */
export interface NetworkProviderProps {
  children: ReactNode;
}

/**
 * Network provider component.
 */
export function NetworkProvider({ children }: NetworkProviderProps): JSX.Element {
  const status = useNetworkStatus();

  const value: NetworkContextValue = {
    status,
    isOnline: status.isConnected,
    isWifi: status.isWifi,
    isKnown: status.isKnown,
  };

  return (
    <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>
  );
}

/**
 * Hook to access network context.
 *
 * @returns Network context value
 * @throws If used outside NetworkProvider
 */
export function useNetwork(): NetworkContextValue {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
}

/**
 * Hook for simple online check.
 *
 * @returns Whether device is online
 */
export function useOnlineStatus(): boolean {
  const { isOnline } = useNetwork();
  return isOnline;
}
