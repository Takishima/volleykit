import { create } from "zustand";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastState {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

const DEFAULT_DURATION_MS = 5000;

function generateId(): string {
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],

  addToast: (toast) => {
    const id = generateId();
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));
    return id;
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  clearToasts: () => {
    set({ toasts: [] });
  },
}));

/**
 * Convenience functions for showing toasts.
 * These can be used outside of React components.
 */
export const toast = {
  success: (message: string, duration = DEFAULT_DURATION_MS): string =>
    useToastStore.getState().addToast({ message, type: "success", duration }),

  error: (message: string, duration = DEFAULT_DURATION_MS): string =>
    useToastStore.getState().addToast({ message, type: "error", duration }),

  info: (message: string, duration = DEFAULT_DURATION_MS): string =>
    useToastStore.getState().addToast({ message, type: "info", duration }),

  warning: (message: string, duration = DEFAULT_DURATION_MS): string =>
    useToastStore.getState().addToast({ message, type: "warning", duration }),
};
