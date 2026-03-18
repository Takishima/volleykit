/**
 * Toast store for mobile app notifications.
 *
 * Provides in-app toast notifications for sync status,
 * errors, and other transient feedback.
 */

import { createToastStore, createToastHelpers } from '@volleykit/shared/stores'

export type { Toast, ToastType } from '@volleykit/shared/stores'
export { DEFAULT_TOAST_DURATION_MS } from '@volleykit/shared/stores'

/** Mobile: fewer toasts for smaller screens */
export const useToastStore = createToastStore({ maxToasts: 3 })

/**
 * Convenience functions for showing toasts.
 * Can be used outside of React components.
 */
export const toast = createToastHelpers(useToastStore)
