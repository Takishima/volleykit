import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";
import { renderHook } from "@testing-library/react";
import { useViewportZoom } from "./useViewportZoom";

// Mock the settings store
const mockPreventZoom = vi.fn(() => false);

vi.mock("@/shared/stores/settings", () => ({
  useSettingsStore: (selector: (state: { preventZoom: boolean }) => boolean) =>
    selector({ preventZoom: mockPreventZoom() }),
}));

describe("useViewportZoom", () => {
  let viewportMeta: HTMLMetaElement;
  const originalContent = "width=device-width, initial-scale=1.0, viewport-fit=cover";

  beforeEach(() => {
    // Create a mock viewport meta element
    viewportMeta = document.createElement("meta");
    viewportMeta.name = "viewport";
    viewportMeta.content = originalContent;
    document.head.appendChild(viewportMeta);

    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up the mock viewport meta element
    if (viewportMeta.parentNode) {
      viewportMeta.parentNode.removeChild(viewportMeta);
    }
  });

  it("does not modify viewport when preventZoom is false", () => {
    mockPreventZoom.mockReturnValue(false);

    renderHook(() => useViewportZoom());

    expect(viewportMeta.content).toBe(originalContent);
  });

  it("sets viewport to prevent zoom when preventZoom is true", () => {
    mockPreventZoom.mockReturnValue(true);

    renderHook(() => useViewportZoom());

    expect(viewportMeta.content).toBe(
      "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
    );
  });

  it("restores original viewport on unmount", () => {
    mockPreventZoom.mockReturnValue(true);

    const { unmount } = renderHook(() => useViewportZoom());

    // Verify it was set to prevent zoom
    expect(viewportMeta.content).toContain("user-scalable=no");

    // Unmount the hook
    unmount();

    // Verify it's restored to allow zoom
    expect(viewportMeta.content).toBe(originalContent);
  });

  it("handles missing viewport meta gracefully", () => {
    // Remove the viewport meta
    viewportMeta.parentNode?.removeChild(viewportMeta);

    mockPreventZoom.mockReturnValue(true);

    // Should not throw
    expect(() => {
      renderHook(() => useViewportZoom());
    }).not.toThrow();
  });

  it("updates viewport when preventZoom changes from false to true", () => {
    mockPreventZoom.mockReturnValue(false);

    const { rerender } = renderHook(() => useViewportZoom());

    // Initially should allow zoom
    expect(viewportMeta.content).toBe(originalContent);

    // Change to prevent zoom
    mockPreventZoom.mockReturnValue(true);
    rerender();

    // Should now prevent zoom
    expect(viewportMeta.content).toContain("user-scalable=no");
  });

  it("updates viewport when preventZoom changes from true to false", () => {
    mockPreventZoom.mockReturnValue(true);

    const { rerender } = renderHook(() => useViewportZoom());

    // Initially should prevent zoom
    expect(viewportMeta.content).toContain("user-scalable=no");

    // Change to allow zoom
    mockPreventZoom.mockReturnValue(false);
    rerender();

    // Should now allow zoom
    expect(viewportMeta.content).toBe(originalContent);
  });
});

describe("useViewportZoom - iOS touch event handling", () => {
  let addEventListenerSpy: Mock;
  let removeEventListenerSpy: Mock;

  beforeEach(() => {
    // Spy on document event listeners
    addEventListenerSpy = vi.spyOn(document, "addEventListener");
    removeEventListenerSpy = vi.spyOn(document, "removeEventListener");

    // Create viewport meta for the hook to work
    const viewportMeta = document.createElement("meta");
    viewportMeta.name = "viewport";
    viewportMeta.content = "width=device-width, initial-scale=1.0, viewport-fit=cover";
    document.head.appendChild(viewportMeta);

    vi.clearAllMocks();
  });

  afterEach(() => {
    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();

    // Clean up viewport meta
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    viewportMeta?.parentNode?.removeChild(viewportMeta);
  });

  it("adds touch event listeners when preventZoom is true", () => {
    mockPreventZoom.mockReturnValue(true);

    renderHook(() => useViewportZoom());

    // Check that all iOS-specific event listeners were added
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "gesturestart",
      expect.any(Function),
      expect.objectContaining({ passive: false })
    );
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "gesturechange",
      expect.any(Function),
      expect.objectContaining({ passive: false })
    );
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "touchmove",
      expect.any(Function),
      expect.objectContaining({ passive: false })
    );
  });

  it("does not add touch event listeners when preventZoom is false", () => {
    mockPreventZoom.mockReturnValue(false);

    renderHook(() => useViewportZoom());

    // Should not have added gesture/touch listeners
    expect(addEventListenerSpy).not.toHaveBeenCalledWith(
      "gesturestart",
      expect.any(Function),
      expect.any(Object)
    );
    expect(addEventListenerSpy).not.toHaveBeenCalledWith(
      "gesturechange",
      expect.any(Function),
      expect.any(Object)
    );
    expect(addEventListenerSpy).not.toHaveBeenCalledWith(
      "touchmove",
      expect.any(Function),
      expect.any(Object)
    );
  });

  it("removes touch event listeners on unmount", () => {
    mockPreventZoom.mockReturnValue(true);

    const { unmount } = renderHook(() => useViewportZoom());

    // Clear mock to focus on removal calls
    removeEventListenerSpy.mockClear();

    unmount();

    // Check that all event listeners were removed
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "gesturestart",
      expect.any(Function)
    );
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "gesturechange",
      expect.any(Function)
    );
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "touchmove",
      expect.any(Function)
    );
  });

  it("removes touch event listeners when preventZoom changes to false", () => {
    mockPreventZoom.mockReturnValue(true);

    const { rerender } = renderHook(() => useViewportZoom());

    // Clear mocks
    removeEventListenerSpy.mockClear();

    // Change to allow zoom
    mockPreventZoom.mockReturnValue(false);
    rerender();

    // Event listeners should be removed
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "gesturestart",
      expect.any(Function)
    );
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "gesturechange",
      expect.any(Function)
    );
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "touchmove",
      expect.any(Function)
    );
  });

  it("prevents default on gesturestart events", () => {
    mockPreventZoom.mockReturnValue(true);

    renderHook(() => useViewportZoom());

    // Find the gesturestart handler that was registered
    const gestureStartCall = addEventListenerSpy.mock.calls.find(
      (call) => call[0] === "gesturestart"
    );
    expect(gestureStartCall).toBeDefined();

    const handler = gestureStartCall![1] as (event: Event) => void;

    // Create a mock event
    const mockEvent = { preventDefault: vi.fn() } as unknown as Event;

    // Call the handler
    handler(mockEvent);

    // Should have called preventDefault
    expect(mockEvent.preventDefault).toHaveBeenCalled();
  });

  it("prevents default on touchmove events with multiple touches", () => {
    mockPreventZoom.mockReturnValue(true);

    renderHook(() => useViewportZoom());

    // Find the touchmove handler that was registered
    const touchMoveCall = addEventListenerSpy.mock.calls.find(
      (call) => call[0] === "touchmove"
    );
    expect(touchMoveCall).toBeDefined();

    const handler = touchMoveCall![1] as (event: TouchEvent) => void;

    // Create a mock event with multiple touches (pinch gesture)
    const mockEventWithMultiTouch = {
      preventDefault: vi.fn(),
      touches: { length: 2 },
    } as unknown as TouchEvent;

    handler(mockEventWithMultiTouch);

    expect(mockEventWithMultiTouch.preventDefault).toHaveBeenCalled();
  });

  it("does not prevent default on touchmove events with single touch", () => {
    mockPreventZoom.mockReturnValue(true);

    renderHook(() => useViewportZoom());

    // Find the touchmove handler that was registered
    const touchMoveCall = addEventListenerSpy.mock.calls.find(
      (call) => call[0] === "touchmove"
    );
    expect(touchMoveCall).toBeDefined();

    const handler = touchMoveCall![1] as (event: TouchEvent) => void;

    // Create a mock event with single touch (normal scroll/pan)
    const mockEventWithSingleTouch = {
      preventDefault: vi.fn(),
      touches: { length: 1 },
    } as unknown as TouchEvent;

    handler(mockEventWithSingleTouch);

    // Should NOT have called preventDefault for single touch
    expect(mockEventWithSingleTouch.preventDefault).not.toHaveBeenCalled();
  });

  it("prevents default on touchmove events with scale !== 1 (iOS zoom detection)", () => {
    mockPreventZoom.mockReturnValue(true);

    renderHook(() => useViewportZoom());

    // Find the touchmove handler that was registered
    const touchMoveCall = addEventListenerSpy.mock.calls.find(
      (call) => call[0] === "touchmove"
    );
    expect(touchMoveCall).toBeDefined();

    const handler = touchMoveCall![1] as (event: TouchEvent) => void;

    // Create a mock event with scale !== 1 (iOS provides this during zoom)
    const mockEventWithScale = {
      preventDefault: vi.fn(),
      touches: { length: 1 },
      scale: 1.5, // Zooming in
    } as unknown as TouchEvent;

    handler(mockEventWithScale);

    expect(mockEventWithScale.preventDefault).toHaveBeenCalled();
  });

  it("does not prevent default on touchmove events with scale === 1", () => {
    mockPreventZoom.mockReturnValue(true);

    renderHook(() => useViewportZoom());

    // Find the touchmove handler that was registered
    const touchMoveCall = addEventListenerSpy.mock.calls.find(
      (call) => call[0] === "touchmove"
    );
    expect(touchMoveCall).toBeDefined();

    const handler = touchMoveCall![1] as (event: TouchEvent) => void;

    // Create a mock event with scale === 1 (no zoom)
    const mockEventWithNoZoom = {
      preventDefault: vi.fn(),
      touches: { length: 1 },
      scale: 1,
    } as unknown as TouchEvent;

    handler(mockEventWithNoZoom);

    // Should NOT have called preventDefault when scale is 1
    expect(mockEventWithNoZoom.preventDefault).not.toHaveBeenCalled();
  });
});

describe("useViewportZoom - CSS touch-action", () => {
  beforeEach(() => {
    // Create viewport meta for the hook to work
    const viewportMeta = document.createElement("meta");
    viewportMeta.name = "viewport";
    viewportMeta.content = "width=device-width, initial-scale=1.0, viewport-fit=cover";
    document.head.appendChild(viewportMeta);

    // Reset touch-action style
    document.documentElement.style.touchAction = "";

    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up viewport meta
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    viewportMeta?.parentNode?.removeChild(viewportMeta);

    // Reset touch-action style
    document.documentElement.style.touchAction = "";
  });

  it("sets touch-action to 'pan-x pan-y' when preventZoom is true", () => {
    mockPreventZoom.mockReturnValue(true);

    renderHook(() => useViewportZoom());

    expect(document.documentElement.style.touchAction).toBe("pan-x pan-y");
  });

  it("sets touch-action to 'auto' when preventZoom is false", () => {
    mockPreventZoom.mockReturnValue(false);

    renderHook(() => useViewportZoom());

    expect(document.documentElement.style.touchAction).toBe("auto");
  });

  it("restores touch-action to 'auto' on unmount", () => {
    mockPreventZoom.mockReturnValue(true);

    const { unmount } = renderHook(() => useViewportZoom());

    expect(document.documentElement.style.touchAction).toBe("pan-x pan-y");

    unmount();

    expect(document.documentElement.style.touchAction).toBe("auto");
  });

  it("updates touch-action when preventZoom changes", () => {
    mockPreventZoom.mockReturnValue(false);

    const { rerender } = renderHook(() => useViewportZoom());

    expect(document.documentElement.style.touchAction).toBe("auto");

    mockPreventZoom.mockReturnValue(true);
    rerender();

    expect(document.documentElement.style.touchAction).toBe("pan-x pan-y");
  });
});

describe("useViewportZoom - page reload on enable", () => {
  let reloadSpy: Mock;

  beforeEach(() => {
    // Create viewport meta for the hook to work
    const viewportMeta = document.createElement("meta");
    viewportMeta.name = "viewport";
    viewportMeta.content = "width=device-width, initial-scale=1.0, viewport-fit=cover";
    document.head.appendChild(viewportMeta);

    // Mock window.location.reload
    reloadSpy = vi.fn();
    Object.defineProperty(window, "location", {
      value: { reload: reloadSpy },
      writable: true,
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up viewport meta
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    viewportMeta?.parentNode?.removeChild(viewportMeta);
  });

  it("does not reload on initial mount when preventZoom is false", () => {
    mockPreventZoom.mockReturnValue(false);

    renderHook(() => useViewportZoom());

    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it("does not reload on initial mount when preventZoom is true", () => {
    mockPreventZoom.mockReturnValue(true);

    renderHook(() => useViewportZoom());

    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it("reloads when preventZoom changes from false to true", () => {
    mockPreventZoom.mockReturnValue(false);

    const { rerender } = renderHook(() => useViewportZoom());

    expect(reloadSpy).not.toHaveBeenCalled();

    // Enable prevent zoom
    mockPreventZoom.mockReturnValue(true);
    rerender();

    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  it("does not reload when preventZoom changes from true to false", () => {
    mockPreventZoom.mockReturnValue(true);

    const { rerender } = renderHook(() => useViewportZoom());

    expect(reloadSpy).not.toHaveBeenCalled();

    // Disable prevent zoom
    mockPreventZoom.mockReturnValue(false);
    rerender();

    // Should not reload when disabling
    expect(reloadSpy).not.toHaveBeenCalled();
  });
});
