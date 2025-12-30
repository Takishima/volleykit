import { useEffect, useRef } from "react";
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
 * CSS touch-action value to prevent pinch-zoom while allowing pan/scroll.
 * This is the most reliable method for iOS Safari (since Safari 13).
 * Using 'pan-x pan-y' allows scrolling in both directions but prevents pinch-zoom.
 */
const TOUCH_ACTION_PREVENT_ZOOM = "pan-x pan-y";

/**
 * Default CSS touch-action value that allows all gestures including zoom.
 */
const TOUCH_ACTION_DEFAULT = "auto";

/**
 * Prevents default behavior on touch/gesture events used for pinch-to-zoom.
 * This is needed for iOS Safari which ignores dynamic viewport meta changes.
 */
function preventZoomEvent(event: Event): void {
  event.preventDefault();
}

/**
 * Handles touchmove events to prevent pinch-to-zoom gestures.
 * Checks both multi-touch (touches.length > 1) and scale change (event.scale !== 1).
 * The scale check catches zoom gestures more reliably on iOS.
 */
function preventMultiTouchZoom(event: TouchEvent): void {
  // Check for multi-touch (pinch gesture)
  if (event.touches.length > 1) {
    event.preventDefault();
    return;
  }

  // Check for scale change (iOS provides this on touch events during zoom)
  // TypeScript doesn't know about the non-standard 'scale' property on TouchEvent
  const touchEventWithScale = event as TouchEvent & { scale?: number };
  if (touchEventWithScale.scale !== undefined && touchEventWithScale.scale !== 1) {
    event.preventDefault();
  }
}

/**
 * Hook that manages the viewport meta tag based on the preventZoom setting.
 * Updates the viewport dynamically when the setting changes.
 *
 * For iOS Safari, which ignores dynamic viewport meta changes, this hook:
 * 1. Sets CSS touch-action on the document to prevent pinch-zoom (most reliable)
 * 2. Adds touch event listeners as a fallback
 * 3. Reloads the page when enabling the setting to ensure a clean zoom state
 *
 * Should be called once at the app root level (e.g., in App.tsx).
 */
export function useViewportZoom(): void {
  const preventZoom = useSettingsStore((state) => state.preventZoom);
  const previousPreventZoomRef = useRef<boolean | null>(null);
  const isInitialMountRef = useRef(true);

  // Reload page when preventZoom is enabled (not on initial mount)
  // This ensures the user starts from a clean non-zoomed state
  // There's no reliable way to programmatically reset zoom on iOS Safari
  useEffect(() => {
    // Skip initial mount
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      previousPreventZoomRef.current = preventZoom;
      return;
    }

    // Reload only when enabling (changing from false to true)
    // This resets any existing zoom and applies the new restrictions cleanly
    if (preventZoom && previousPreventZoomRef.current === false) {
      window.location.reload();
    }

    previousPreventZoomRef.current = preventZoom;
  }, [preventZoom]);

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

  // Set CSS touch-action on document element (most reliable for iOS Safari)
  // This prevents pinch-zoom while still allowing pan/scroll gestures
  useEffect(() => {
    const touchAction = preventZoom ? TOUCH_ACTION_PREVENT_ZOOM : TOUCH_ACTION_DEFAULT;
    document.documentElement.style.touchAction = touchAction;

    // Cleanup: restore default touch-action on unmount
    return () => {
      document.documentElement.style.touchAction = TOUCH_ACTION_DEFAULT;
    };
  }, [preventZoom]);

  // Add touch event listeners as additional fallback for iOS Safari
  // These catch any gestures that slip through the CSS touch-action
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
