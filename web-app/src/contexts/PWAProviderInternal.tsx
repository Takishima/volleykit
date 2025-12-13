import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { PWAContext } from "./PWAContext";
import type { PWAContextType } from "./PWAContext";

/**
 * Interval for automatic update checks (1 hour).
 * Balances freshness with avoiding excessive network requests.
 * The service worker will also check for updates on page load.
 */
const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour in milliseconds

interface PWAProviderInternalProps {
  children: ReactNode;
}

/**
 * Internal PWA Provider that manages service worker registration and updates.
 * This component should only be rendered when PWA is enabled.
 */
export default function PWAProviderInternal({
  children,
}: PWAProviderInternalProps) {
  const [offlineReady, setOfflineReady] = useState(false);
  const [needRefresh, setNeedRefresh] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [checkError, setCheckError] = useState<Error | null>(null);
  const [registrationError, setRegistrationError] = useState<Error | null>(null);

  // Refs must be declared before useEffect to avoid race conditions
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(
    undefined,
  );
  const updateSWRef = useRef<((reloadPage?: boolean) => Promise<void>) | null>(
    null,
  );
  // Ref-based guard to prevent duplicate concurrent update checks
  const isCheckingRef = useRef(false);

  useEffect(() => {
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
            intervalRef.current = setInterval(() => {
              registration.update();
            }, UPDATE_CHECK_INTERVAL_MS);
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
            if (!cancelled) {
              const regError =
                error instanceof Error
                  ? error
                  : new Error("Service worker registration failed");
              setRegistrationError(regError);
            }
          },
        });

        // Store updateSW function for later use
        if (!cancelled) {
          updateSWRef.current = updateSW;
        }
      } catch (error) {
        console.error("Failed to register service worker:", error);
        if (!cancelled) {
          const regError =
            error instanceof Error
              ? error
              : new Error("Failed to register service worker");
          setRegistrationError(regError);
        }
      }
    }

    registerSW();

    return () => {
      cancelled = true;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = undefined;
      }
    };
  }, []);

  const checkForUpdate = async () => {
    // Use ref-based guard to prevent race conditions with concurrent calls
    if (!registrationRef.current || isCheckingRef.current) return;

    isCheckingRef.current = true;
    setIsChecking(true);
    setCheckError(null);
    try {
      await registrationRef.current.update();
      setLastChecked(new Date());
    } catch (error) {
      const updateError =
        error instanceof Error ? error : new Error("Failed to check for updates");
      console.error("Failed to check for updates:", error);
      setCheckError(updateError);
    } finally {
      isCheckingRef.current = false;
      setIsChecking(false);
    }
  };

  const updateApp = async () => {
    if (updateSWRef.current) {
      await updateSWRef.current(true);
    } else {
      console.warn("updateApp called but service worker is not ready");
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
    checkError,
    registrationError,
    checkForUpdate,
    updateApp,
    dismissPrompt,
  };

  return <PWAContext.Provider value={value}>{children}</PWAContext.Provider>;
}
