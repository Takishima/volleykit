import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCalendarErrorHandler } from "./useCalendarErrorHandler";
import { CalendarNotFoundError } from "@/features/assignments/api/calendar-api";
import * as authStore from "@/shared/stores/auth";
import * as toastStore from "@/shared/stores/toast";

// Mock dependencies
vi.mock("@/shared/stores/auth", () => ({
  useAuthStore: vi.fn(),
}));

vi.mock("@/shared/stores/toast", () => ({
  toast: {
    error: vi.fn(),
  },
}));

vi.mock("@/shared/hooks/useTranslation", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe("useCalendarErrorHandler", () => {
  const mockLogout = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authStore.useAuthStore).mockImplementation((selector) => {
      const state = { logout: mockLogout };
      return selector(state as unknown as ReturnType<typeof authStore.useAuthStore.getState>);
    });
  });

  describe("initial state", () => {
    it("should initialize with null error state", () => {
      const { result } = renderHook(() => useCalendarErrorHandler());

      expect(result.current.errorState).toBeNull();
    });
  });

  describe("handleError", () => {
    it("should set error state for CalendarNotFoundError", () => {
      const { result } = renderHook(() => useCalendarErrorHandler());

      act(() => {
        result.current.handleError(new CalendarNotFoundError("Not found"));
      });

      expect(result.current.errorState).toEqual({
        isOpen: true,
        errorType: "invalidCode",
      });
    });

    it("should set error state for network errors", () => {
      const { result } = renderHook(() => useCalendarErrorHandler());

      const networkError = new Error("Failed to fetch");
      networkError.name = "TypeError";

      act(() => {
        result.current.handleError(networkError);
      });

      expect(result.current.errorState).toEqual({
        isOpen: true,
        errorType: "network",
      });
    });

    it("should default to invalidCode for other errors", () => {
      const { result } = renderHook(() => useCalendarErrorHandler());

      act(() => {
        result.current.handleError(new Error("Some API error"));
      });

      expect(result.current.errorState).toEqual({
        isOpen: true,
        errorType: "invalidCode",
      });
    });
  });

  describe("acknowledgeError", () => {
    it("should clear error state", async () => {
      const { result } = renderHook(() => useCalendarErrorHandler());

      act(() => {
        result.current.handleError(new CalendarNotFoundError("Not found"));
      });

      expect(result.current.errorState).not.toBeNull();

      await act(async () => {
        await result.current.acknowledgeError();
      });

      expect(result.current.errorState).toBeNull();
    });

    it("should show toast and logout for invalidCode error", async () => {
      const { result } = renderHook(() => useCalendarErrorHandler());

      act(() => {
        result.current.handleError(new CalendarNotFoundError("Not found"));
      });

      await act(async () => {
        await result.current.acknowledgeError();
      });

      expect(toastStore.toast.error).toHaveBeenCalledWith(
        "calendarError.loggedOutToast",
      );
      expect(mockLogout).toHaveBeenCalled();
    });

    it("should show toast and logout for network error", async () => {
      const { result } = renderHook(() => useCalendarErrorHandler());

      const networkError = new Error("Failed to fetch");
      networkError.name = "TypeError";

      act(() => {
        result.current.handleError(networkError);
      });

      await act(async () => {
        await result.current.acknowledgeError();
      });

      expect(toastStore.toast.error).toHaveBeenCalledWith(
        "calendarError.loggedOutToast",
      );
      expect(mockLogout).toHaveBeenCalled();
    });

    it("should not logout when no error state", async () => {
      const { result } = renderHook(() => useCalendarErrorHandler());

      await act(async () => {
        await result.current.acknowledgeError();
      });

      expect(mockLogout).not.toHaveBeenCalled();
      expect(toastStore.toast.error).not.toHaveBeenCalled();
    });
  });

  describe("logParseWarning", () => {
    it("should log warning to console", () => {
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const { result } = renderHook(() => useCalendarErrorHandler());

      act(() => {
        result.current.logParseWarning("Parse error occurred");
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "[Calendar Parse Warning]",
        "Parse error occurred",
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe("function stability", () => {
    it("should have stable handleError reference", () => {
      const { result, rerender } = renderHook(() => useCalendarErrorHandler());

      const firstHandleError = result.current.handleError;
      rerender();

      expect(result.current.handleError).toBe(firstHandleError);
    });

    it("should have stable logParseWarning reference", () => {
      const { result, rerender } = renderHook(() => useCalendarErrorHandler());

      const firstLogParseWarning = result.current.logParseWarning;
      rerender();

      expect(result.current.logParseWarning).toBe(firstLogParseWarning);
    });
  });
});
