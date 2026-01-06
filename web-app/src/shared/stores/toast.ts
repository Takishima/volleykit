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

export const DEFAULT_DURATION_MS = 5000;
const MAX_TOASTS = 5;

export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],

  addToast: (toast) => {
    const id = crypto.randomUUID();
    set((state) => {
      const newToasts = [...state.toasts, { ...toast, id }];
      if (newToasts.length > MAX_TOASTS) {
        return { toasts: newToasts.slice(-MAX_TOASTS) };
      }
      return { toasts: newToasts };
    });
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
