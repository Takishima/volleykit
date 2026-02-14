/**
 * Logger utility with runtime toggle.
 *
 * - `warn` and `error` are always emitted (even in production).
 * - `debug` and `info` are enabled in development, or in production via:
 *     localStorage.setItem('volleykit:debug', 'true')
 *   then reload the page. Disable with:
 *     localStorage.removeItem('volleykit:debug')
 */

export interface Logger {
  debug: (...args: unknown[]) => void
  info: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
  error: (...args: unknown[]) => void
}

/** Check once at module load whether verbose logging (debug/info) is enabled. */
const isVerboseEnabled: boolean =
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
      if (isVerboseEnabled) {
        console.log(prefix, ...args)
      }
    },

    info: (...args: unknown[]): void => {
      if (isVerboseEnabled) {
        console.info(prefix, ...args)
      }
    },

    warn: (...args: unknown[]): void => {
      console.warn(prefix, ...args)
    },

    error: (...args: unknown[]): void => {
      console.error(prefix, ...args)
    },
  }
}

/** Default logger without context prefix */
export const logger = createLogger('App')
