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
import { LoginPage } from "@/pages/LoginPage";
import { AssignmentsPage } from "@/pages/AssignmentsPage";
import { CompensationsPage } from "@/pages/CompensationsPage";
import { ExchangePage } from "@/pages/ExchangePage";
import { SettingsPage } from "@/pages/SettingsPage";

/**
 * Classify error type for better logging and handling.
 * Exported for testing.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function classifyQueryError(
  message: string,
): "network" | "auth" | "validation" | "rate_limit" | "unknown" {
  const lowerMessage = message.toLowerCase();
  if (
    lowerMessage.includes("network") ||
    lowerMessage.includes("failed to fetch") ||
    lowerMessage.includes("timeout") ||
    lowerMessage.includes("connection")
  ) {
    return "network";
  }
  if (
    lowerMessage.includes("401") ||
    lowerMessage.includes("403") ||
    lowerMessage.includes("406") ||
    lowerMessage.includes("unauthorized") ||
    lowerMessage.includes("session expired")
  ) {
    return "auth";
  }
  if (
    lowerMessage.includes("429") ||
    lowerMessage.includes("too many requests")
  ) {
    return "rate_limit";
  }
  if (lowerMessage.includes("validation") || lowerMessage.includes("invalid")) {
    return "validation";
  }
  return "unknown";
}

/**
 * Determine if an error should trigger a retry.
 * Network and rate limit errors are retryable; auth and validation errors are not.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const errorType = classifyQueryError(error.message);
  return errorType === "network" || errorType === "rate_limit";
}

// Retry configuration constants
const MAX_RETRY_DELAY_MS = 30000;
const BASE_RETRY_DELAY_MS = 1000;
const JITTER_FACTOR = 0.25;
const MAX_QUERY_RETRIES = 3;

/**
 * Calculate retry delay with exponential backoff and jitter.
 *
 * @param attemptIndex - Zero-based retry attempt (0 = first retry)
 * @param _error - Error that triggered the retry (unused, required by TanStack Query)
 * @returns Delay in milliseconds before next retry
 */
// eslint-disable-next-line react-refresh/only-export-components
export function calculateRetryDelay(
  attemptIndex: number,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _error?: unknown,
): number {
  const exponentialDelay = BASE_RETRY_DELAY_MS * Math.pow(2, attemptIndex);
  const jitter = exponentialDelay * Math.random() * JITTER_FACTOR;
  return Math.min(exponentialDelay + jitter, MAX_RETRY_DELAY_MS);
}

/**
 * Check if an error is an authentication error that requires redirect to login.
 * Exported for testing.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function isAuthError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return classifyQueryError(error.message) === "auth";
}

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
        return failureCount < MAX_QUERY_RETRIES;
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
  const [isVerifying, setIsVerifying] = useState(
    () => status === "authenticated" && !isDemoMode,
  );
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
    </ErrorBoundary>
  );
}
