/**
 * Simple logger utility for development.
 * All logs are disabled in production builds.
 */

export interface Logger {
  debug: (...args: unknown[]) => void
  info: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
  error: (...args: unknown[]) => void
}

/**
 * Creates a logger with a context prefix.
 * Usage: const log = createLogger("useAssignmentActions");
 *        log.debug("Something happened"); // [VolleyKit][useAssignmentActions] Something happened
 */
export function createLogger(context: string): Logger {
  const prefix = `[VolleyKit][${context}]`

  return {
    debug: (...args: unknown[]): void => {
      if (import.meta.env.DEV) {
        console.log(prefix, ...args)
      }
    },

    info: (...args: unknown[]): void => {
      if (import.meta.env.DEV) {
        console.info(prefix, ...args)
      }
    },

    warn: (...args: unknown[]): void => {
      if (import.meta.env.DEV) {
        console.warn(prefix, ...args)
      }
    },

    error: (...args: unknown[]): void => {
      if (import.meta.env.DEV) {
        console.error(prefix, ...args)
      }
    },
  }
}

/** Default logger without context prefix */
export const logger = createLogger('App')
