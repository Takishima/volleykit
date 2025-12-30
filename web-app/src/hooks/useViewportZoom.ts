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
 * Prevents default behavior on touch/gesture events used for pinch-to-zoom.
 * This is needed for iOS Safari which ignores dynamic viewport meta changes.
 */
function preventZoomEvent(event: Event): void {
  event.preventDefault();
}

/**
 * Handles touchmove events to prevent pinch-to-zoom (multi-touch gestures).
 * Only prevents default when more than one touch point is active.
 */
function preventMultiTouchZoom(event: TouchEvent): void {
  if (event.touches.length > 1) {
    event.preventDefault();
  }
}

/**
 * Hook that manages the viewport meta tag based on the preventZoom setting.
 * Updates the viewport dynamically when the setting changes.
 *
 * For iOS Safari, which ignores dynamic viewport meta changes, this hook
 * also adds touch event listeners to prevent pinch-to-zoom gestures.
 *
 * Should be called once at the app root level (e.g., in App.tsx).
 */
export function useViewportZoom(): void {
  const preventZoom = useSettingsStore((state) => state.preventZoom);

  // Update viewport meta tag (works for most browsers except iOS Safari)
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

  // Add touch event listeners for iOS Safari
  // iOS Safari ignores dynamic viewport meta changes, so we need to
  // prevent zoom gestures via touch event handlers
  useEffect(() => {
    if (!preventZoom) {
      return;
    }

    // Options for touch event listeners - must be non-passive to allow preventDefault()
    const eventOptions: AddEventListenerOptions = { passive: false };

    // gesturestart/gesturechange are iOS-specific events for pinch gestures
    document.addEventListener("gesturestart", preventZoomEvent, eventOptions);
    document.addEventListener("gesturechange", preventZoomEvent, eventOptions);

    // touchmove with multiple touches handles pinch-to-zoom on touch devices
    document.addEventListener("touchmove", preventMultiTouchZoom, eventOptions);

    return () => {
      document.removeEventListener("gesturestart", preventZoomEvent);
      document.removeEventListener("gesturechange", preventZoomEvent);
      document.removeEventListener("touchmove", preventMultiTouchZoom);
    };
  }, [preventZoom]);
}
