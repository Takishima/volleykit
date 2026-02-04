/**
 * Toast notification store for mobile app.
 *
 * Provides toast notifications for user feedback, similar to the web app implementation.
 * Uses Zustand for state management.
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

export const DEFAULT_DURATION_MS = 4000
const MAX_TOASTS = 3

/**
 * Generate a unique ID for toasts.
 * Uses timestamp + random to avoid collisions.
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],

  addToast: (toast) => {
    const id = generateId()
    set((state) => {
      const newToasts = [...state.toasts, { ...toast, id }]
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
 * These can be used outside of React components.
 */
export const toast = {
  success: (message: string, duration = DEFAULT_DURATION_MS): string =>
    useToastStore.getState().addToast({ message, type: 'success', duration }),

  error: (message: string, duration = DEFAULT_DURATION_MS): string =>
    useToastStore.getState().addToast({ message, type: 'error', duration }),

  info: (message: string, duration = DEFAULT_DURATION_MS): string =>
    useToastStore.getState().addToast({ message, type: 'info', duration }),

  warning: (message: string, duration = DEFAULT_DURATION_MS): string =>
    useToastStore.getState().addToast({ message, type: 'warning', duration }),
}
