/**
 * Error helper utilities for VolleyKit.
 *
 * Platform-agnostic implementation extracted from
 * web-app/src/shared/utils/error-helpers.ts
 */

/**
 * Application error interface with optional code and status.
 */
export interface AppError {
  message: string;
  code?: string;
  status?: number;
}

/**
 * Error classification type for error boundaries.
 * Network errors typically allow retry, while application errors may need a refresh.
 */
export type ErrorType = 'network' | 'application';

/**
 * Classify an error as network-related or application-related.
 * Network errors typically allow retry, while application errors may need a refresh.
 *
 * @param error - The error to classify
 * @returns 'network' for network-related errors, 'application' for others
 */
export function classifyError(error: Error): ErrorType {
  const message = error.message.toLowerCase();
  const name = error.name.toLowerCase();

  // Network-related errors
  if (
    (name === 'typeerror' && message.includes('fetch')) ||
    name === 'networkerror' ||
    message.includes('network') ||
    message.includes('failed to fetch') ||
    message.includes('connection') ||
    message.includes('timeout') ||
    message.includes('cors') ||
    message.includes('offline')
  ) {
    return 'network';
  }

  return 'application';
}

/**
 * Checks if an error is network-related.
 *
 * @param error - The error to check
 * @returns true if the error is network-related
 */
export const isNetworkError = (error: unknown): boolean => {
  if (error instanceof Error) {
    return classifyError(error) === 'network';
  }
  return false;
};

/**
 * Extracts a human-readable message from any error type.
 *
 * @param error - The error to extract a message from
 * @returns A string message describing the error
 */
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
};

/**
 * Creates an AppError object with the given parameters.
 *
 * @param message - The error message
 * @param code - Optional error code
 * @param status - Optional HTTP status code
 * @returns An AppError object
 */
export const createAppError = (message: string, code?: string, status?: number): AppError => ({
  message,
  code,
  status,
});

/**
 * Checks if a value is an Error instance.
 * Type guard for narrowing unknown to Error.
 *
 * @param value - The value to check
 * @returns true if the value is an Error instance
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

/**
 * Wraps a value in an Error if it isn't already one.
 * Useful for catch blocks where the caught value may not be an Error.
 *
 * @param value - The value to ensure is an Error
 * @returns The value if it's an Error, or a new Error with the value as message
 */
export function ensureError(value: unknown): Error {
  if (value instanceof Error) {
    return value;
  }
  if (typeof value === 'string') {
    return new Error(value);
  }
  return new Error(getErrorMessage(value));
}
