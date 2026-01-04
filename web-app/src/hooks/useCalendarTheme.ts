import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth";

const CALENDAR_MODE_CLASS = "calendar-mode";

/**
 * Applies calendar mode theme by toggling a class on the document root.
 * When in calendar mode, the primary green color becomes slightly darker
 * (~10-15%) to visually distinguish from the regular app mode.
 *
 * The CSS variables are overridden in index.css when .calendar-mode is present.
 */
export function useCalendarTheme(): void {
  const isCalendarMode = useAuthStore((state) => state.isCalendarMode());

  useEffect(() => {
    const root = document.documentElement;

    if (isCalendarMode) {
      root.classList.add(CALENDAR_MODE_CLASS);
    } else {
      root.classList.remove(CALENDAR_MODE_CLASS);
    }

    // Cleanup on unmount
    return () => {
      root.classList.remove(CALENDAR_MODE_CLASS);
    };
  }, [isCalendarMode]);
}
