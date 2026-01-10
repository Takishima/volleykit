import { useEffect, useState, useRef, lazy, Suspense } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useShallow } from "zustand/react/shallow";
import { useAuthStore } from "@/shared/stores/auth";
import { useDemoStore } from "@/shared/stores/demo";
import { AppShell } from "@/shared/components/layout/AppShell";
import { LoadingState } from "@/shared/components/LoadingSpinner";
import { ErrorBoundary } from "@/shared/components/ErrorBoundary";
import { PageErrorBoundary } from "@/shared/components/PageErrorBoundary";
import { ReloadPrompt } from "@/shared/components/ReloadPrompt";
import { ToastContainer } from "@/shared/components/Toast";
import { PWAProvider } from "@/contexts/PWAContext";
import {
  classifyQueryError,
  isRetryableError,
  calculateRetryDelay,
  isAuthError,
  RETRY_CONFIG,
} from "@/shared/utils/query-error-utils";
import { ASSIGNMENTS_STALE_TIME_MS, SETTINGS_STALE_TIME_MS } from "@/shared/hooks/usePaginatedQuery";
import { usePreloadLocales } from "@/shared/hooks/usePreloadLocales";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { useViewportZoom } from "@/shared/hooks/useViewportZoom";
import { useCalendarTheme } from "@/features/assignments/hooks/useCalendarTheme";
import { useSettingsStore } from "@/shared/stores/settings";
import { logger } from "@/shared/utils/logger";
import { CalendarErrorHandler } from "@/features/assignments/components/CalendarErrorHandler";

// Lazy load pages to reduce initial bundle size
// Each page becomes a separate chunk that loads on-demand
const LoginPage = lazy(() =>
  import("@/features/auth/LoginPage").then((m) => ({ default: m.LoginPage })),
);
const AssignmentsPage = lazy(() =>
  import("@/features/assignments/AssignmentsPage").then((m) => ({ default: m.AssignmentsPage })),
);
const CompensationsPage = lazy(() =>
  import("@/features/compensations/CompensationsPage").then((m) => ({ default: m.CompensationsPage })),
);
const ExchangePage = lazy(() =>
  import("@/features/exchanges/ExchangePage").then((m) => ({ default: m.ExchangePage })),
);
const SettingsPage = lazy(() =>
  import("@/features/settings/SettingsPage").then((m) => ({ default: m.SettingsPage })),
);

// Lazy load TourProvider since it's only needed for first-time users
const TourProvider = lazy(() =>
  import("@/shared/components/tour").then((m) => ({ default: m.TourProvider })),
);

/**
 * Global error handler for React Query mutations.
 * Logs errors with context for debugging. Network errors allow retry,
 * while other errors may need different handling.
 */
function handleMutationError(
  error: unknown,
  variables: unknown,
  context: unknown,
): void {
  const message = error instanceof Error ? error.message : "Unknown error";
  const errorType = classifyQueryError(message);
  const stack = error instanceof Error ? error.stack : undefined;

  logger.error("Mutation error:", {
    message,
    errorType,
    variables: variables ? "[redacted]" : undefined, // Don't log sensitive data
    hasContext: context !== undefined,
    stack: import.meta.env.DEV ? stack : undefined, // Only show stack in dev
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (!isRetryableError(error)) return false;
        return failureCount < RETRY_CONFIG.MAX_QUERY_RETRIES;
      },
      // Use exponential backoff with jitter for retry delays
      retryDelay: calculateRetryDelay,
      refetchOnWindowFocus: false,
      // Cache data for 5 minutes before considering it stale
      staleTime: ASSIGNMENTS_STALE_TIME_MS,
      // Keep unused data in cache for 30 minutes
      gcTime: SETTINGS_STALE_TIME_MS,
    },
    mutations: {
      // Log mutation errors globally with context
      onError: handleMutationError,
      // Don't retry mutations by default - they have side effects
      retry: false,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { status, checkSession, dataSource } = useAuthStore(
    useShallow((state) => ({
      status: state.status,
      checkSession: state.checkSession,
      dataSource: state.dataSource,
    })),
  );
  const { assignments, activeAssociationCode, initializeDemoData } =
    useDemoStore(
      useShallow((state) => ({
        assignments: state.assignments,
        activeAssociationCode: state.activeAssociationCode,
        initializeDemoData: state.initializeDemoData,
      })),
    );
  const { t } = useTranslation();
  const isDemoMode = dataSource === "demo";
  // Only verify session for API mode - demo and calendar modes don't need server verification
  const shouldVerifySession = status === "authenticated" && dataSource === "api";
  const [isVerifying, setIsVerifying] = useState(() => shouldVerifySession);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Regenerate demo data on page load if demo mode is enabled but data is empty
  // This only runs once when data needs initialization, not on association changes
  // (association changes are handled by AppShell when user switches occupation)
  useEffect(() => {
    if (isDemoMode && assignments.length === 0) {
      initializeDemoData(activeAssociationCode ?? "SV");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Only run when data is empty, not on association changes
  }, [isDemoMode, assignments.length, initializeDemoData]);

  // Verify persisted session is still valid on mount
  useEffect(() => {
    if (!isVerifying || dataSource !== "api") return;

    const controller = new AbortController();

    checkSession(controller.signal)
      .catch((error: unknown) => {
        // Ignore AbortError - this is expected when component unmounts
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        const message =
          error instanceof Error
            ? error.message
            : "Session verification failed";
        setVerifyError(message);
      })
      .finally(() => {
        // Only update state if not aborted
        if (!controller.signal.aborted) {
          setIsVerifying(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [isVerifying, checkSession, dataSource]);

  // Show loading state while verifying session
  if (status === "loading" || isVerifying) {
    return <LoadingState message={t("auth.checkingSession")} />;
  }

  // If verification failed, redirect to login (session may be invalid)
  if (verifyError) {
    logger.warn("Session verification failed:", verifyError);
    return <Navigate to="/login" replace />;
  }

  if (status !== "authenticated") {
    return <Navigate to="/login" replace />;
  }

  // Wrap children in ErrorBoundary to catch route-level errors
  return <ErrorBoundary>{children}</ErrorBoundary>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const status = useAuthStore((state) => state.status);

  if (status === "authenticated") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

// Base path for router - Vite sets BASE_URL from the `base` config
// Remove trailing slash for React Router basename (it adds its own)
// Handle edge case where BASE_URL is just "/" - use empty string instead
function getBasename(): string {
  const baseUrl = import.meta.env.BASE_URL;
  if (baseUrl === "/") {
    return "";
  }
  return baseUrl.replace(/\/$/, "");
}
const BASE_PATH = getBasename();

/**
 * QueryErrorHandler monitors React Query errors and redirects to login on auth failures.
 * This catches stale session errors (401, 403, 406) that occur after initial auth check.
 */
function QueryErrorHandler({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const dataSource = useAuthStore((state) => state.dataSource);
  const isRedirectingRef = useRef(false);

  useEffect(() => {
    const handleQueryError = (error: unknown) => {
      // Only handle auth errors for API mode - demo and calendar modes don't use server auth
      if (dataSource !== "api" || isRedirectingRef.current) return;

      if (isAuthError(error)) {
        isRedirectingRef.current = true;
        logger.warn("Authentication error detected, redirecting to login:", error);
        logout()
          .catch((err) => logger.error("Logout failed during redirect:", err))
          .finally(() => {
            navigate("/login", { replace: true });
          });
      }
    };

    const unsubscribeQueries = queryClient
      .getQueryCache()
      .subscribe((event) => {
        if (event.type === "updated" && event.query.state.error) {
          handleQueryError(event.query.state.error);
        }
      });

    const unsubscribeMutations = queryClient
      .getMutationCache()
      .subscribe((event) => {
        if (event.type === "updated" && event.mutation.state.error) {
          handleQueryError(event.mutation.state.error);
        }
      });

    return () => {
      unsubscribeQueries();
      unsubscribeMutations();
    };
  }, [navigate, logout, dataSource]);

  return <>{children}</>;
}

export default function App() {
  usePreloadLocales();
  useViewportZoom();
  useCalendarTheme();

  // Sync settings store's currentMode with auth store's dataSource
  // This ensures mode-specific settings are loaded for the correct mode
  useEffect(() => {
    // Set initial mode from auth store
    const initialDataSource = useAuthStore.getState().dataSource;
    useSettingsStore.getState()._setCurrentMode(initialDataSource);

    // Track previous dataSource to detect changes
    let previousDataSource = initialDataSource;

    // Subscribe to auth store changes
    const unsubscribe = useAuthStore.subscribe((state) => {
      if (state.dataSource !== previousDataSource) {
        previousDataSource = state.dataSource;
        useSettingsStore.getState()._setCurrentMode(state.dataSource);
      }
    });

    return unsubscribe;
  }, []);

  // Clear query cache on logout to prevent stale data from previous sessions.
  // This ensures users don't see assignments from a previously logged-in association.
  useEffect(() => {
    // Track whether user was previously authenticated
    let wasAuthenticated = useAuthStore.getState().user !== null;

    const unsubscribe = useAuthStore.subscribe((state) => {
      const isAuthenticated = state.user !== null;

      // User just logged out (was authenticated, now is not)
      if (wasAuthenticated && !isAuthenticated) {
        // Reset all queries to clear cached data from previous session
        queryClient.resetQueries();
        logger.info("Query cache cleared on logout");
      }

      wasAuthenticated = isAuthenticated;
    });

    return unsubscribe;
  }, []);

  return (
    <ErrorBoundary>
      <PWAProvider>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter basename={BASE_PATH}>
            <QueryErrorHandler>
              <Routes>
                {/* Public routes */}
                <Route
                  path="/login"
                  element={
                    <PublicRoute>
                      <Suspense fallback={<LoadingState />}>
                        <LoginPage />
                      </Suspense>
                    </PublicRoute>
                  }
                />

                {/* Protected routes */}
                <Route
                  element={
                    <ProtectedRoute>
                      <CalendarErrorHandler>
                        <Suspense fallback={null}>
                          <TourProvider>
                            <AppShell />
                          </TourProvider>
                        </Suspense>
                      </CalendarErrorHandler>
                    </ProtectedRoute>
                  }
                >
                  <Route path="/" element={<PageErrorBoundary pageName="AssignmentsPage"><Suspense fallback={<LoadingState />}><AssignmentsPage /></Suspense></PageErrorBoundary>} />
                  <Route path="/compensations" element={<PageErrorBoundary pageName="CompensationsPage"><Suspense fallback={<LoadingState />}><CompensationsPage /></Suspense></PageErrorBoundary>} />
                  <Route path="/exchange" element={<PageErrorBoundary pageName="ExchangePage"><Suspense fallback={<LoadingState />}><ExchangePage /></Suspense></PageErrorBoundary>} />
                  <Route path="/settings" element={<PageErrorBoundary pageName="SettingsPage"><Suspense fallback={<LoadingState />}><SettingsPage /></Suspense></PageErrorBoundary>} />
                </Route>

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </QueryErrorHandler>
          </BrowserRouter>
          <ReloadPrompt />
          <ToastContainer />
        </QueryClientProvider>
      </PWAProvider>
    </ErrorBoundary>
  );
}
