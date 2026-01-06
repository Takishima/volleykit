import { Component, type ReactNode } from "react";
import { AlertTriangle } from "@/shared/components/icons";
import { Button } from "@/shared/components/Button";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { classifyError, type ErrorType } from "@/shared/utils/error-helpers";
import { logger } from "@/shared/utils/logger";

interface PageErrorBoundaryClassProps {
  children: ReactNode;
  pageName: string;
  translations: {
    connectionProblem: string;
    somethingWentWrong: string;
    networkDescription: string;
    errorDescription: string;
    errorDetails: string;
    tryAgain: string;
    goHome: string;
  };
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorType: ErrorType;
}

/**
 * Error boundary class component for page-level errors.
 * Displays a contextual fallback UI that allows users to retry or navigate home.
 * Unlike the global ErrorBoundary, this keeps the app shell intact.
 */
class PageErrorBoundaryClass extends Component<PageErrorBoundaryClassProps, State> {
  constructor(props: PageErrorBoundaryClassProps) {
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
    logger.error(`PageErrorBoundary caught an error in ${this.props.pageName}:`, {
      error,
      errorType: this.state.errorType,
      pageName: this.props.pageName,
      componentStack: errorInfo.componentStack,
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorType: "application" });
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  override render() {
    if (this.state.hasError) {
      const { translations } = this.props;
      const isNetworkError = this.state.errorType === "network";

      return (
        <div
          className="flex flex-col items-center justify-center py-12 px-4"
          data-testid="page-error-boundary"
        >
          <div className="max-w-md w-full text-center">
            <AlertTriangle
              className="w-12 h-12 mx-auto mb-4 text-warning-500"
              aria-hidden="true"
            />
            <h2 className="text-lg font-semibold text-text-primary dark:text-text-primary-dark mb-2">
              {isNetworkError
                ? translations.connectionProblem
                : translations.somethingWentWrong}
            </h2>
            <p className="text-sm text-text-muted dark:text-text-muted-dark mb-4">
              {isNetworkError
                ? translations.networkDescription
                : translations.errorDescription}
            </p>
            {this.state.error && (
              <details className="text-left mb-4 bg-surface-subtle dark:bg-surface-subtle-dark rounded-lg p-3">
                <summary className="text-sm text-text-muted dark:text-text-muted-dark cursor-pointer">
                  {translations.errorDetails}
                </summary>
                <pre className="mt-2 text-xs overflow-auto text-text-secondary dark:text-text-secondary-dark">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <div className="flex gap-3 justify-center">
              <Button variant="secondary" onClick={this.handleReset}>
                {translations.tryAgain}
              </Button>
              <Button variant="primary" onClick={this.handleGoHome}>
                {translations.goHome}
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

interface PageErrorBoundaryProps {
  children: ReactNode;
  pageName: string;
}

/**
 * Error boundary for page-level errors.
 * Wraps page content and provides contextual fallback UI with retry and navigation options.
 * Keeps the app shell (navigation, header) intact when a page crashes.
 */
export function PageErrorBoundary({ children, pageName }: PageErrorBoundaryProps) {
  const { t } = useTranslation();

  const translations = {
    connectionProblem: t("errorBoundary.connectionProblem"),
    somethingWentWrong: t("errorBoundary.somethingWentWrong"),
    networkDescription: t("errorBoundary.page.networkDescription"),
    errorDescription: t("errorBoundary.page.errorDescription"),
    errorDetails: t("errorBoundary.errorDetails"),
    tryAgain: t("errorBoundary.tryAgain"),
    goHome: t("errorBoundary.page.goHome"),
  };

  return (
    <PageErrorBoundaryClass pageName={pageName} translations={translations}>
      {children}
    </PageErrorBoundaryClass>
  );
}
