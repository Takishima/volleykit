import { createContext, lazy, Suspense, useContext } from "react";
import type { ReactNode } from "react";

export interface PWAContextType {
  offlineReady: boolean;
  needRefresh: boolean;
  isChecking: boolean;
  lastChecked: Date | null;
  checkError: Error | null;
  registrationError: Error | null;
  checkForUpdate: () => Promise<void>;
  updateApp: () => Promise<void>;
  dismissPrompt: () => void;
}

export const PWAContext = createContext<PWAContextType | null>(null);

interface PWAProviderProps {
  children: ReactNode;
}

// Passthrough component for when PWA is disabled
function PWAProviderPassthrough({ children }: PWAProviderProps) {
  return <>{children}</>;
}

/**
 * Lazy-loaded PWA Provider.
 * Uses conditional lazy loading to prevent the virtual:pwa-register import
 * from being resolved when PWA is disabled (PR preview builds).
 */
const LazyPWAProvider = lazy(() =>
  __PWA_ENABLED__
    ? import("./PWAProviderInternal")
    : Promise.resolve({ default: PWAProviderPassthrough }),
);

/**
 * PWA Provider wrapper that handles conditional loading.
 * When PWA is disabled, children are rendered directly without the provider.
 */
export function PWAProvider({ children }: PWAProviderProps) {
  return (
    <Suspense fallback={children}>
      <LazyPWAProvider>{children}</LazyPWAProvider>
    </Suspense>
  );
}

/**
 * Hook to access PWA context.
 * Returns safe defaults when used outside PWAProvider or when PWA is disabled.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function usePWA(): PWAContextType {
  const context = useContext(PWAContext);

  // Return safe defaults if context is not available (PWA disabled)
  if (!context) {
    return {
      offlineReady: false,
      needRefresh: false,
      isChecking: false,
      lastChecked: null,
      checkError: null,
      registrationError: null,
      checkForUpdate: async () => {},
      updateApp: async () => {},
      dismissPrompt: () => {},
    };
  }

  return context;
}
