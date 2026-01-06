import { Component, type ReactNode } from "react";
import { AlertTriangle } from "@/shared/components/icons";
import { Button } from "@/shared/components/Button";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { classifyError, type ErrorType } from "@/shared/utils/error-helpers";
import { logger } from "@/shared/utils/logger";

interface ModalErrorBoundaryClassProps {
  children: ReactNode;
  modalName: string;
  onClose?: () => void;
  translations: {
    connectionProblem: string;
    somethingWentWrong: string;
    networkDescription: string;
    errorDescription: string;
    errorDetails: string;
    tryAgain: string;
    closeModal: string;
  };
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorType: ErrorType;
}

/**
 * Error boundary class component for modal-level errors.
 * Displays a compact fallback UI within the modal that allows users to retry or close.
 * Prevents modal errors from crashing the entire application.
 */
class ModalErrorBoundaryClass extends Component<ModalErrorBoundaryClassProps, State> {
  constructor(props: ModalErrorBoundaryClassProps) {
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
    logger.error(`ModalErrorBoundary caught an error in ${this.props.modalName}:`, {
      error,
      errorType: this.state.errorType,
      modalName: this.props.modalName,
      componentStack: errorInfo.componentStack,
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorType: "application" });
  };

  handleClose = () => {
    this.props.onClose?.();
  };

  override render() {
    if (this.state.hasError) {
      const { translations, onClose } = this.props;
      const isNetworkError = this.state.errorType === "network";

      return (
        <div
          className="flex flex-col items-center justify-center p-6"
          data-testid="modal-error-boundary"
        >
          <AlertTriangle
            className="w-10 h-10 mb-3 text-warning-500"
            aria-hidden="true"
          />
          <h3 className="text-base font-semibold text-text-primary dark:text-text-primary-dark mb-2 text-center">
            {isNetworkError
              ? translations.connectionProblem
              : translations.somethingWentWrong}
          </h3>
          <p className="text-sm text-text-muted dark:text-text-muted-dark mb-4 text-center">
            {isNetworkError
              ? translations.networkDescription
              : translations.errorDescription}
          </p>
          {this.state.error && (
            <details className="w-full text-left mb-4 bg-surface-subtle dark:bg-surface-subtle-dark rounded-lg p-3">
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
            {onClose && (
              <Button variant="primary" onClick={this.handleClose}>
                {translations.closeModal}
              </Button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

interface ModalErrorBoundaryProps {
  children: ReactNode;
  modalName: string;
  onClose?: () => void;
}

/**
 * Error boundary for modal-level errors.
 * Wraps modal content and provides a compact fallback UI with retry and close options.
 * Prevents modal errors from crashing the page or other parts of the application.
 */
export function ModalErrorBoundary({ children, modalName, onClose }: ModalErrorBoundaryProps) {
  const { t } = useTranslation();

  const translations = {
    connectionProblem: t("errorBoundary.connectionProblem"),
    somethingWentWrong: t("errorBoundary.somethingWentWrong"),
    networkDescription: t("errorBoundary.modal.networkDescription"),
    errorDescription: t("errorBoundary.modal.errorDescription"),
    errorDetails: t("errorBoundary.errorDetails"),
    tryAgain: t("errorBoundary.tryAgain"),
    closeModal: t("errorBoundary.modal.closeModal"),
  };

  return (
    <ModalErrorBoundaryClass modalName={modalName} onClose={onClose} translations={translations}>
      {children}
    </ModalErrorBoundaryClass>
  );
}
