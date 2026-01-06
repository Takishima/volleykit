import { renderHook } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { useCalendarTheme } from "./useCalendarTheme";
import type { DataSource } from "@/shared/stores/auth";

let mockDataSource: DataSource = "api";

vi.mock("@/shared/stores/auth", () => ({
  useAuthStore: (selector: (state: { dataSource: DataSource }) => boolean) =>
    selector({ dataSource: mockDataSource }),
}));

describe("useCalendarTheme", () => {
  beforeEach(() => {
    // Reset class list before each test
    document.documentElement.classList.remove("calendar-mode");
    mockDataSource = "api";
  });

  it("does not add calendar-mode class when dataSource is api", () => {
    mockDataSource = "api";

    renderHook(() => useCalendarTheme());

    expect(document.documentElement.classList.contains("calendar-mode")).toBe(false);
  });

  it("does not add calendar-mode class when dataSource is demo", () => {
    mockDataSource = "demo";

    renderHook(() => useCalendarTheme());

    expect(document.documentElement.classList.contains("calendar-mode")).toBe(false);
  });

  it("adds calendar-mode class when dataSource is calendar", () => {
    mockDataSource = "calendar";

    renderHook(() => useCalendarTheme());

    expect(document.documentElement.classList.contains("calendar-mode")).toBe(true);
  });

  it("removes calendar-mode class on unmount", () => {
    mockDataSource = "calendar";

    const { unmount } = renderHook(() => useCalendarTheme());
    expect(document.documentElement.classList.contains("calendar-mode")).toBe(true);

    unmount();
    expect(document.documentElement.classList.contains("calendar-mode")).toBe(false);
  });

  it("removes calendar-mode class when transitioning out of calendar mode", () => {
    mockDataSource = "calendar";

    const { rerender } = renderHook(() => useCalendarTheme());
    expect(document.documentElement.classList.contains("calendar-mode")).toBe(true);

    mockDataSource = "api";
    rerender();
    expect(document.documentElement.classList.contains("calendar-mode")).toBe(false);
  });
});
