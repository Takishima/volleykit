import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

type ErrorType = "network" | "application";

interface State {
  hasError: boolean;
  error: Error | null;
  errorType: ErrorType;
}

/**
 * Classify an error as network-related or application-related.
 * Network errors typically allow retry, while application errors may need a refresh.
 */
function classifyError(error: Error): ErrorType {
  const message = error.message.toLowerCase();
  const name = error.name.toLowerCase();

  // Network-related errors
  if (
    (name === "typeerror" && message.includes("fetch")) ||
    name === "networkerror" ||
    message.includes("network") ||
    message.includes("failed to fetch") ||
    message.includes("connection") ||
    message.includes("timeout") ||
    message.includes("cors") ||
    message.includes("offline")
  ) {
    return "network";
  }

  return "application";
}

/**
 * Log error for monitoring. Replace with actual service (Sentry, etc.) in production.
 */
function logError(
  error: Error,
  errorInfo: React.ErrorInfo,
  errorType: ErrorType,
): void {
  // In production, send to monitoring service
  // Example: Sentry.captureException(error, { extra: { errorInfo, errorType } });
  console.error("ErrorBoundary caught an error:", {
    error,
    errorType,
    componentStack: errorInfo.componentStack,
  });
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorType: "application" };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorType: classifyError(error),
    };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logError(error, errorInfo, this.state.errorType);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorType: "application" });
  };

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isNetworkError = this.state.errorType === "network";

      return (
        <div className="min-h-screen flex items-center justify-center bg-surface-page dark:bg-surface-page-dark p-4">
          <div className="max-w-md w-full bg-surface-card dark:bg-surface-card-dark rounded-xl shadow-lg p-6 text-center">
            {/* SVG icons render consistently across all platforms */}
            <div
              className="w-16 h-16 mx-auto mb-4 text-text-subtle dark:text-text-subtle-dark"
              aria-hidden="true"
            >
              {isNetworkError ? (
                // Network/signal icon
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z" />
                </svg>
              ) : (
                // Warning triangle icon
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
                </svg>
              )}
            </div>
            <h1 className="text-xl font-semibold text-text-primary dark:text-text-primary-dark mb-2">
              {isNetworkError ? "Connection Problem" : "Something went wrong"}
            </h1>
            <p className="text-text-secondary dark:text-text-muted-dark mb-4">
              {isNetworkError
                ? "Unable to connect to the server. Please check your internet connection and try again."
                : "An unexpected error occurred. Please try refreshing the page."}
            </p>
            {this.state.error && (
              <details className="text-left mb-4">
                <summary className="text-sm text-text-muted dark:text-text-muted-dark cursor-pointer">
                  Error details
                </summary>
                <pre className="mt-2 p-2 bg-surface-subtle dark:bg-surface-subtle-dark rounded text-xs overflow-auto">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 bg-surface-muted dark:bg-surface-subtle-dark text-text-primary dark:text-text-primary-dark rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-primary-500 text-primary-950 rounded-lg hover:bg-primary-600 transition-colors"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
