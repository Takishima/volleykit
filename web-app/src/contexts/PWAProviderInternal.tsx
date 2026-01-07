import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { PWAContext, type PWAContextType } from "./pwa-context-value";
import { logger } from "@/shared/utils/logger";
import { MS_PER_HOUR } from "@/shared/utils/constants";

/**
 * Interval for automatic update checks (1 hour).
 * Balances freshness with avoiding excessive network requests.
 * The service worker will also check for updates on page load.
 */
const UPDATE_CHECK_INTERVAL_MS = MS_PER_HOUR;

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
  const [registrationError, setRegistrationError] = useState<Error | null>(
    null,
  );

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
    // Cancellation flag pattern for async operations in React 18+.
    // While React 18 safely handles setState on unmounted components (no-op instead of warning),
    // we still use this pattern to:
    // 1. Prevent unnecessary state updates after unmount
    // 2. Avoid setting up intervals on unmounted components
    // 3. Make the cleanup intent explicit for maintainability
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
            logger.error("Service worker registration error:", error);
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
        logger.error("Failed to register service worker:", error);
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
        error instanceof Error
          ? error
          : new Error("Failed to check for updates");
      logger.error("Failed to check for updates:", error);
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
      logger.warn("updateApp called but service worker is not ready");
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
