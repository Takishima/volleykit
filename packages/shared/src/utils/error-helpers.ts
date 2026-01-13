/**
 * Error helper utilities
 *
 * This will be extracted from web-app/src/shared/utils/error-helpers.ts
 * Placeholder for now - implementation in Phase 2
 */

export interface AppError {
  message: string;
  code?: string;
  status?: number;
}

export const isNetworkError = (error: unknown): boolean => {
  if (error instanceof Error) {
    return (
      error.message.includes('fetch') ||
      error.message.includes('network') ||
      error.message.includes('Failed to fetch')
    );
  }
  return false;
};

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
};

export const createAppError = (
  message: string,
  code?: string,
  status?: number
): AppError => ({
  message,
  code,
  status,
});
