/**
 * Logger utility with runtime toggle.
 *
 * Enabled automatically in development. In production, enable via browser console:
 *   localStorage.setItem('volleykit:debug', 'true')
 * and reload the page. Disable with:
 *   localStorage.removeItem('volleykit:debug')
 */

export interface Logger {
  debug: (...args: unknown[]) => void
  info: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
  error: (...args: unknown[]) => void
}

/** Check once at module load whether logging is enabled. */
const isLoggingEnabled: boolean =
  import.meta.env.DEV || globalThis.localStorage?.getItem('volleykit:debug') === 'true'

/**
 * Creates a logger with a context prefix.
 * Usage: const log = createLogger("useAssignmentActions");
 *        log.debug("Something happened"); // [VolleyKit][useAssignmentActions] Something happened
 */
export function createLogger(context: string): Logger {
  const prefix = `[VolleyKit][${context}]`

  return {
    debug: (...args: unknown[]): void => {
      if (isLoggingEnabled) {
        console.log(prefix, ...args)
      }
    },

    info: (...args: unknown[]): void => {
      if (isLoggingEnabled) {
        console.info(prefix, ...args)
      }
    },

    warn: (...args: unknown[]): void => {
      if (isLoggingEnabled) {
        console.warn(prefix, ...args)
      }
    },

    error: (...args: unknown[]): void => {
      if (isLoggingEnabled) {
        console.error(prefix, ...args)
      }
    },
  }
}

/** Default logger without context prefix */
export const logger = createLogger('App')
