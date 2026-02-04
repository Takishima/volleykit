/**
 * Toast store for mobile app notifications.
 *
 * Provides in-app toast notifications for sync status,
 * errors, and other transient feedback.
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

/** Maximum number of toasts to display at once */
const MAX_TOASTS = 3

/** Counter for generating unique toast IDs */
let toastIdCounter = 0

/**
 * Generate a unique toast ID.
 * Uses a simple counter combined with timestamp for uniqueness.
 */
function generateToastId(): string {
  toastIdCounter += 1
  return `toast-${Date.now()}-${toastIdCounter}`
}

export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],

  addToast: (toast) => {
    const id = generateToastId()
    set((state) => {
      const newToasts = [...state.toasts, { ...toast, id }]
      // Keep only the most recent toasts if limit exceeded
      if (newToasts.length > MAX_TOASTS) {
        return { toasts: newToasts.slice(-MAX_TOASTS) }
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

/**
 * Convenience functions for showing toasts.
 * Can be used outside of React components.
 */
export const toast = {
  success: (message: string, duration = DEFAULT_TOAST_DURATION_MS): string =>
    useToastStore.getState().addToast({ message, type: 'success', duration }),

  error: (message: string, duration = DEFAULT_TOAST_DURATION_MS): string =>
    useToastStore.getState().addToast({ message, type: 'error', duration }),

  info: (message: string, duration = DEFAULT_TOAST_DURATION_MS): string =>
    useToastStore.getState().addToast({ message, type: 'info', duration }),

  warning: (message: string, duration = DEFAULT_TOAST_DURATION_MS): string =>
    useToastStore.getState().addToast({ message, type: 'warning', duration }),
}
