import { Component, type ReactNode } from "react";
import { ErrorFallbackUI } from "./ErrorFallbackUI";

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

      return (
        <ErrorFallbackUI
          error={this.state.error}
          errorType={this.state.errorType}
          onReset={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}
