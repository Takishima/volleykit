/**
 * Error Boundary component for graceful error handling.
 *
 * Catches JavaScript errors in child components and displays fallback UI.
 */

import { Component, type ReactNode, type ErrorInfo } from 'react'

import { ErrorScreen } from './ErrorScreen'

/**
 * Error boundary props.
 */
export interface ErrorBoundaryProps {
  /** Child components to wrap */
  children: ReactNode
  /** Fallback UI to show on error (optional, uses ErrorScreen by default) */
  fallback?: ReactNode
  /** Callback when error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  /** Reset key - change to reset the boundary */
  resetKey?: string | number
}

/**
 * Error boundary state.
 */
export interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  /** The resetKey the current state belongs to; a different prop value resets the boundary */
  resetKey?: string | number
}

/**
 * Error boundary component.
 * Uses React class component for error boundary functionality.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null, resetKey: props.resetKey }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  /** Reset error state when resetKey changes (derived state, no extra render pass). */
  static getDerivedStateFromProps(
    props: ErrorBoundaryProps,
    state: ErrorBoundaryState
  ): Partial<ErrorBoundaryState> | null {
    if (props.resetKey !== state.resetKey) {
      return { hasError: false, error: null, resetKey: props.resetKey }
    }
    return null
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console
    console.error('ErrorBoundary caught an error:', error, errorInfo)

    // Call onError callback if provided
    this.props.onError?.(error, errorInfo)
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null })
  }

  override render(): ReactNode {
    const { hasError, error } = this.state
    const errorContent: ReactNode = this.props.fallback ?? (
      <ErrorScreen error={error} onRetry={this.handleReset} type="application" />
    )

    return hasError ? errorContent : this.props.children
  }
}

/**
 * Higher-order component for wrapping components with error boundary.
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  boundaryProps?: Omit<ErrorBoundaryProps, 'children'>
): React.FC<P> {
  return function ErrorBoundaryWrapper(props: P) {
    return (
      <ErrorBoundary {...boundaryProps}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    )
  }
}
