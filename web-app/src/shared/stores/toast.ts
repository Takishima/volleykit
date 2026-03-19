import {
  createToastStore,
  createToastHelpers,
  DEFAULT_TOAST_DURATION_MS,
} from '@volleykit/shared/stores'

export type { Toast, ToastType } from '@volleykit/shared/stores'
export { DEFAULT_TOAST_DURATION_MS }

/** @deprecated Use DEFAULT_TOAST_DURATION_MS instead */
export const DEFAULT_DURATION_MS = DEFAULT_TOAST_DURATION_MS

/** Web app: allow up to 5 toasts simultaneously */
export const useToastStore = createToastStore({ maxToasts: 5 })

/**
 * Convenience functions for showing toasts.
 * These can be used outside of React components.
 */
export const toast = createToastHelpers(useToastStore)
