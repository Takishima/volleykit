import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useViewportZoom } from "./useViewportZoom";

// Mock the settings store
const mockPreventZoom = vi.fn(() => false);

vi.mock("@/stores/settings", () => ({
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
