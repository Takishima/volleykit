import { useEffect } from "react";
import { useSettingsStore } from "@/stores/settings";

/**
 * Viewport content value when zoom is allowed (default).
 * This is the original viewport setting from index.html.
 */
const VIEWPORT_ZOOM_ALLOWED = "width=device-width, initial-scale=1.0, viewport-fit=cover";

/**
 * Viewport content value when zoom is prevented.
 * Disables pinch-to-zoom and double-tap zoom on touch devices.
 */
const VIEWPORT_ZOOM_PREVENTED =
  "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover";

/**
 * Hook that manages the viewport meta tag based on the preventZoom setting.
 * Updates the viewport dynamically when the setting changes.
 *
 * Should be called once at the app root level (e.g., in App.tsx).
 */
export function useViewportZoom(): void {
  const preventZoom = useSettingsStore((state) => state.preventZoom);

  useEffect(() => {
    const viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      return;
    }

    const content = preventZoom ? VIEWPORT_ZOOM_PREVENTED : VIEWPORT_ZOOM_ALLOWED;
    viewport.setAttribute("content", content);

    // Cleanup: restore default viewport on unmount
    return () => {
      viewport.setAttribute("content", VIEWPORT_ZOOM_ALLOWED);
    };
  }, [preventZoom]);
}
