import { Component, type ReactNode } from 'react'

import { classifyError, type ErrorType } from '@/shared/utils/error-helpers'
import { logger } from '@/shared/utils/logger'

import { ErrorFallbackUI } from './ErrorFallbackUI'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorType: ErrorType
}

/**
 * Log error for monitoring. Replace with actual service (Sentry, etc.) in production.
 */
function logError(error: Error, errorInfo: React.ErrorInfo, errorType: ErrorType): void {
  // In production, send to monitoring service
  // Example: Sentry.captureException(error, { extra: { errorInfo, errorType } });
  logger.error('ErrorBoundary caught an error:', {
    error,
    errorType,
    componentStack: errorInfo.componentStack,
  })
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorType: 'application' }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorType: classifyError(error),
    }
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logError(error, errorInfo, this.state.errorType)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorType: 'application' })
  }

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <ErrorFallbackUI
          error={this.state.error}
          errorType={this.state.errorType}
          onReset={this.handleReset}
        />
      )
    }

    return this.props.children
  }
}
