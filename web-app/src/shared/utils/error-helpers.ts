/**
 * Error helper utilities for VolleyKit.
 *
 * Re-exports from @volleykit/shared for cross-platform consistency.
 */
export {
  type AppError,
  type ErrorType,
  classifyError,
  isNetworkError,
  getErrorMessage,
  createAppError,
  isError,
  ensureError,
} from '@volleykit/shared/utils'
