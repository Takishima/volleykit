import { renderHook } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { useCalendarTheme } from "./useCalendarTheme";

const mockIsCalendarMode = vi.fn().mockReturnValue(false);

vi.mock("@/stores/auth", () => ({
  useAuthStore: (selector: (state: { isCalendarMode: () => boolean }) => boolean) =>
    selector({ isCalendarMode: mockIsCalendarMode }),
}));

describe("useCalendarTheme", () => {
  beforeEach(() => {
    // Reset class list before each test
    document.documentElement.classList.remove("calendar-mode");
    vi.clearAllMocks();
  });

  it("does not add calendar-mode class when not in calendar mode", () => {
    mockIsCalendarMode.mockReturnValue(false);

    renderHook(() => useCalendarTheme());

    expect(document.documentElement.classList.contains("calendar-mode")).toBe(false);
  });

  it("adds calendar-mode class when in calendar mode", () => {
    mockIsCalendarMode.mockReturnValue(true);

    renderHook(() => useCalendarTheme());

    expect(document.documentElement.classList.contains("calendar-mode")).toBe(true);
  });

  it("removes calendar-mode class on unmount", () => {
    mockIsCalendarMode.mockReturnValue(true);

    const { unmount } = renderHook(() => useCalendarTheme());
    expect(document.documentElement.classList.contains("calendar-mode")).toBe(true);

    unmount();
    expect(document.documentElement.classList.contains("calendar-mode")).toBe(false);
  });

  it("removes calendar-mode class when transitioning out of calendar mode", () => {
    mockIsCalendarMode.mockReturnValue(true);

    const { rerender } = renderHook(() => useCalendarTheme());
    expect(document.documentElement.classList.contains("calendar-mode")).toBe(true);

    mockIsCalendarMode.mockReturnValue(false);
    rerender();
    expect(document.documentElement.classList.contains("calendar-mode")).toBe(false);
  });
});
