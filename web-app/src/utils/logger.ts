/**
 * Simple logger utility for development.
 * All logs are disabled in production builds.
 */

export const logger = {
  debug: (...args: unknown[]): void => {
    if (import.meta.env.DEV) {
      console.log("[VolleyKit]", ...args);
    }
  },

  info: (...args: unknown[]): void => {
    if (import.meta.env.DEV) {
      console.info("[VolleyKit]", ...args);
    }
  },

  warn: (...args: unknown[]): void => {
    if (import.meta.env.DEV) {
      console.warn("[VolleyKit]", ...args);
    }
  },

  error: (...args: unknown[]): void => {
    if (import.meta.env.DEV) {
      console.error("[VolleyKit]", ...args);
    }
  },
};
