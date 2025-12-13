import { useEffect, useState, useRef } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth";
import { useDemoStore } from "@/stores/demo";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingState } from "@/components/ui/LoadingSpinner";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { ReloadPrompt } from "@/components/ui/ReloadPrompt";
import { PWAProvider } from "@/contexts/PWAContext";
import { LoginPage } from "@/pages/LoginPage";
import { AssignmentsPage } from "@/pages/AssignmentsPage";
import { CompensationsPage } from "@/pages/CompensationsPage";
import { ExchangePage } from "@/pages/ExchangePage";
import { SettingsPage } from "@/pages/SettingsPage";
import {
  classifyQueryError,
  isRetryableError,
  calculateRetryDelay,
  isAuthError,
  RETRY_CONFIG,
} from "@/utils/query-error-utils";

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

  console.error("Mutation error:", {
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
      staleTime: 5 * 60 * 1000,
      // Keep unused data in cache for 30 minutes
      gcTime: 30 * 60 * 1000,
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
  const { status, checkSession, isDemoMode } = useAuthStore();
  const { assignments, initializeDemoData } = useDemoStore();
  const shouldVerifySession = status === "authenticated" && !isDemoMode;
  const [isVerifying, setIsVerifying] = useState(() => shouldVerifySession);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Regenerate demo data on page load if demo mode is enabled but data is empty
  useEffect(() => {
    if (isDemoMode && assignments.length === 0) {
      initializeDemoData();
    }
  }, [isDemoMode, assignments.length, initializeDemoData]);

  // Verify persisted session is still valid on mount
  useEffect(() => {
    if (!isVerifying || isDemoMode) return;

    let cancelled = false;
    checkSession()
      .catch((error: unknown) => {
        if (!cancelled) {
          const message =
            error instanceof Error
              ? error.message
              : "Session verification failed";
          setVerifyError(message);
        }
      })
      .finally(() => {
        if (!cancelled) setIsVerifying(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isVerifying, checkSession, isDemoMode]);

  // Show loading state while verifying session
  if (status === "loading" || isVerifying) {
    return <LoadingState message="Checking session..." />;
  }

  // If verification failed, redirect to login (session may be invalid)
  if (verifyError) {
    console.warn("Session verification failed:", verifyError);
    return <Navigate to="/login" replace />;
  }

  if (status !== "authenticated") {
    return <Navigate to="/login" replace />;
  }

  // Wrap children in ErrorBoundary to catch route-level errors
  return <ErrorBoundary>{children}</ErrorBoundary>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { status } = useAuthStore();

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
  const isDemoMode = useAuthStore((state) => state.isDemoMode);
  const isRedirectingRef = useRef(false);

  useEffect(() => {
    const handleQueryError = (error: unknown) => {
      if (isDemoMode || isRedirectingRef.current) return;

      if (isAuthError(error)) {
        isRedirectingRef.current = true;
        console.warn(
          "Authentication error detected, redirecting to login:",
          error,
        );
        logout()
          .catch((err) => console.error("Logout failed during redirect:", err))
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
  }, [navigate, logout, isDemoMode]);

  return <>{children}</>;
}

export default function App() {
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
                      <LoginPage />
                    </PublicRoute>
                  }
                />

                {/* Protected routes */}
                <Route
                  element={
                    <ProtectedRoute>
                      <AppShell />
                    </ProtectedRoute>
                  }
                >
                  <Route path="/" element={<AssignmentsPage />} />
                  <Route path="/compensations" element={<CompensationsPage />} />
                  <Route path="/exchange" element={<ExchangePage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </QueryErrorHandler>
          </BrowserRouter>
          <ReloadPrompt />
        </QueryClientProvider>
      </PWAProvider>
    </ErrorBoundary>
  );
}
