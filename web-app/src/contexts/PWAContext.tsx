import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

interface PWAContextType {
  offlineReady: boolean;
  needRefresh: boolean;
  isChecking: boolean;
  lastChecked: Date | null;
  checkForUpdate: () => Promise<void>;
  updateApp: () => Promise<void>;
  dismissPrompt: () => void;
}

const PWAContext = createContext<PWAContextType | null>(null);

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

interface PWAProviderProps {
  children: ReactNode;
}

/**
 * PWA Provider that manages service worker registration and updates.
 * Only active when PWA is enabled (__PWA_ENABLED__ is true).
 */
export function PWAProvider({ children }: PWAProviderProps) {
  const [offlineReady, setOfflineReady] = useState(false);
  const [needRefresh, setNeedRefresh] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const intervalRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    // Only register if PWA is enabled
    if (!__PWA_ENABLED__) return;

    let cancelled = false;

    async function registerSW() {
      try {
        const { registerSW } = await import("virtual:pwa-register");

        const updateSW = registerSW({
          immediate: true,
          onRegisteredSW(_swUrl, registration) {
            if (cancelled || !registration) return;

            registrationRef.current = registration;

            // Check for updates periodically
            intervalRef.current = setInterval(
              () => {
                registration.update();
              },
              UPDATE_CHECK_INTERVAL_MS,
            ) as unknown as number;
          },
          onOfflineReady() {
            if (!cancelled) {
              setOfflineReady(true);
            }
          },
          onNeedRefresh() {
            if (!cancelled) {
              setNeedRefresh(true);
            }
          },
          onRegisterError(error) {
            console.error("Service worker registration error:", error);
          },
        });

        // Store updateSW function for later use
        if (!cancelled) {
          updateSWRef.current = updateSW;
        }
      } catch (error) {
        console.error("Failed to register service worker:", error);
      }
    }

    registerSW();

    return () => {
      cancelled = true;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const updateSWRef = useRef<((reloadPage?: boolean) => Promise<void>) | null>(
    null,
  );

  const checkForUpdate = async () => {
    if (!registrationRef.current || isChecking) return;

    setIsChecking(true);
    try {
      await registrationRef.current.update();
      setLastChecked(new Date());
    } catch (error) {
      console.error("Failed to check for updates:", error);
    } finally {
      setIsChecking(false);
    }
  };

  const updateApp = async () => {
    if (updateSWRef.current) {
      await updateSWRef.current(true);
    }
  };

  const dismissPrompt = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  const value: PWAContextType = {
    offlineReady,
    needRefresh,
    isChecking,
    lastChecked,
    checkForUpdate,
    updateApp,
    dismissPrompt,
  };

  return <PWAContext.Provider value={value}>{children}</PWAContext.Provider>;
}

/**
 * Hook to access PWA context.
 * Returns null values when used outside PWAProvider or when PWA is disabled.
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
      checkForUpdate: async () => {},
      updateApp: async () => {},
      dismissPrompt: () => {},
    };
  }

  return context;
}
