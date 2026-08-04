import { lazy, Suspense, useContext } from 'react'
import type { ReactNode } from 'react'

import { PWAContext, type PWAContextType } from './pwa-context-value'

export type { PWAContextType } from './pwa-context-value'

interface PWAProviderProps {
  children: ReactNode
}

// Passthrough component for when PWA is disabled
function PWAProviderPassthrough({ children }: PWAProviderProps) {
  return <>{children}</>
}

/**
 * Lazy-loaded PWA Provider.
 * Uses conditional lazy loading to prevent the virtual:pwa-register import
 * from being resolved when PWA is disabled (PR preview builds).
 *
 * lazy() resolves its factory once per module registry and caches the result,
 * so __PWA_ENABLED__ is read only on the first PWAProvider render. That is
 * fine in the app, where the flag is build-time constant, but in tests it
 * means the first render decides the branch for the whole file: rendering
 * PWAProvider once with the flag stubbed false caches the passthrough for
 * every later test, with no local signal.
 */
const LazyPWAProvider = lazy(() =>
  __PWA_ENABLED__
    ? import('./PWAProviderInternal')
    : Promise.resolve({ default: PWAProviderPassthrough })
)

/**
 * PWA Provider wrapper that handles conditional loading.
 * When PWA is disabled, children are rendered directly without the provider.
 */
export function PWAProvider({ children }: PWAProviderProps) {
  return (
    <Suspense fallback={children}>
      <LazyPWAProvider>{children}</LazyPWAProvider>
    </Suspense>
  )
}

/**
 * Hook to access PWA context.
 * Returns safe defaults when used outside PWAProvider or when PWA is disabled.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function usePWA(): PWAContextType {
  const context = useContext(PWAContext)

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
    }
  }

  return context
}
