/**
 * Shared toast store factory for cross-platform toast notifications.
 *
 * Used by both web and mobile apps with platform-specific configuration.
 */

import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  message: string
  type: ToastType
  duration?: number
}

interface ToastState {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => string
  removeToast: (id: string) => void
  clearToasts: () => void
}

/** Default toast display duration in milliseconds */
export const DEFAULT_TOAST_DURATION_MS = 5000

export interface ToastStoreOptions {
  /** Maximum number of toasts to display at once */
  maxToasts: number
}

/**
 * Creates a platform-specific toast store with configurable limits.
 *
 * @example
 * // Web: allow more toasts
 * const useToastStore = createToastStore({ maxToasts: 5 })
 *
 * // Mobile: fewer toasts for smaller screens
 * const useToastStore = createToastStore({ maxToasts: 3 })
 */
export function createToastStore({ maxToasts }: ToastStoreOptions) {
  const useToastStore = create<ToastState>()((set) => ({
    toasts: [],

    addToast: (toast) => {
      const id = crypto.randomUUID()
      set((state) => {
        const newToasts = [...state.toasts, { ...toast, id }]
        if (newToasts.length > maxToasts) {
          return { toasts: newToasts.slice(-maxToasts) }
        }
        return { toasts: newToasts }
      })
      return id
    },

    removeToast: (id) => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }))
    },

    clearToasts: () => {
      set({ toasts: [] })
    },
  }))

  return useToastStore
}

/**
 * Creates convenience functions for showing toasts outside of React components.
 */
export function createToastHelpers(useToastStore: ReturnType<typeof createToastStore>) {
  return {
    success: (message: string, duration = DEFAULT_TOAST_DURATION_MS): string =>
      useToastStore.getState().addToast({ message, type: 'success', duration }),

    error: (message: string, duration = DEFAULT_TOAST_DURATION_MS): string =>
      useToastStore.getState().addToast({ message, type: 'error', duration }),

    info: (message: string, duration = DEFAULT_TOAST_DURATION_MS): string =>
      useToastStore.getState().addToast({ message, type: 'info', duration }),

    warning: (message: string, duration = DEFAULT_TOAST_DURATION_MS): string =>
      useToastStore.getState().addToast({ message, type: 'warning', duration }),
  }
}
